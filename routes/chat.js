const SocketIO = require("socket.io");
const express = require("express");
const {
  verifySocketToken,
  verifySocketSanctionedToken,
  verifySanctionedToken,
} = require("./middlewares");
const { isEmptyOrSpaces } = require("../util");
const { Op, fn, col } = require("sequelize");
const { db } = require("../models");
const { chat_attend, chat_room, chat_message, user, product, transaction } = db;

// WebSocket Code
const chatWebSocket = (server, app) => {
  const io = SocketIO(server);
  app.set("io", io);

  const chatRoomList = io.of("/chatRoomList").use((socket, next) => {
    verifySocketToken(socket, next);
    next();
  });

  const chatRoom = io.of("/chat").use((socket, next) => {
    verifySocketSanctionedToken(socket, next);
    next();
  });

  /** 채팅방 목록 */
  chatRoomList.on("connection", async (socket) => {
    if (!(socket.decoded && socket.decoded.id)) {
      console.error(new Error("검증되지 않은 토큰"));
      socket.disconnect(true);
    }

    // 생성된 채팅방 목록 검색
    const foundAttends = await chat_attend.findAll({
      where: {
        [Op.or]: [
          { seller_id: socket.decoded.id },
          { buyer_id: socket.decoded.id },
        ],
      },
      include: [
        {
          model: product,
          as: "product",
          attributes: ["title"],
          required: false,
        },
      ],
    });

    socket.emit("chatRoomList", foundAttends);

    socket.on("disconnect", () => {
      console.log("chatRoomList 네임스페이스 접속 해제");
    });
  });

  /** 채팅방 */
  chatRoom.on("connection", async (socket) => {
    if (!(socket.decoded && socket.decoded.id)) {
      console.error(new Error("검증되지 않은 토큰"));
      socket.disconnect(true);
    }

    const { chatRoomId } = socket.handshake.query;

    if (isEmptyOrSpaces(chatRoomId)) {
      console.error(new Error("참가하려는 채팅방 ID가 입력되지 않았습니다."));
      socket.disconnect(true);
    }

    const exChatAttend = await chat_attend.findOne({
      where: { chat_room_id: chatRoomId },
    });

    if (!exChatAttend) {
      console.error(new Error("참가하려는 채팅방이 존재하지 않습니다."));
      socket.disconnect(true);
    }

    if (
      exChatAttend.seller_id !== socket.decoded.id &&
      exChatAttend.buyer_id !== socket.decoded.id
    ) {
      console.error(new Error("참가하려는 채팅방에 참가할 권한이 없습니다."));
      socket.disconnect(true);
    }

    /**
     * 1. 채팅방 메시지 테이블에 읽지 않음 칼럼 추가
     * 2. 채팅방 테이블에 unread 칼럼, updated_at 칼럼 추가
     * 3. 채팅방 참가, 메시지 전송 기능 추가
     */

    const sockets = await chatRoomList.fetchSockets();
    console.log("size? ", sockets.length);
    let foundSocket;
    for (const socket of sockets) {
      if (socket.decoded.id === "tmp2000") foundSocket = socket;
    }

    foundSocket.emit("newChatRoom", "새로운 챗룸");

    socket.on("disconnect", () => {
      console.log("chatRooms 네임스페이스 접속 해제");
    });
  });
};
// WebSocket Code END

// Router Code
const chatRouter = express.Router();

/************************************ 채팅방 참가 ************************************/
chatRouter.post(
  "/enterChatRoom",
  verifySanctionedToken,
  async (req, res, next) => {
    const { productId, chatPartnerId } = req.body;
    const isEmptyProductId = isEmptyOrSpaces(productId);
    const isEmptyPartner = isEmptyOrSpaces(chatPartnerId);

    if (isEmptyProductId && isEmptyPartner)
      return res.json({
        result: false,
        message: "채팅방 참가 필수 항목이 입력되지 않았습니다.",
      });

    try {
      let exProduct, exPartner;

      if (!isEmptyProductId) {
        exProduct = await product.findByPk(productId);
        if (!exProduct) {
          return res.json({
            result: false,
            message: "입력하신 상품 ID와 일치하는 상품이 없습니다.",
          });
        }
      }

      if (!isEmptyPartner) {
        if (exProduct && exProduct.seller_id !== chatPartnerId) {
          return res.json({
            result: false,
            message:
              "검색한 상품의 판매자와 입력하신 상대방 ID가 일치하지 않습니다.",
          });
        }

        exPartner = await user.findByPk(chatPartnerId);
        if (!exPartner) {
          return res.json({
            result: false,
            message: "입력하신 상대방 ID와 일치하는 회원이 없습니다.",
          });
        }
      }

      // 채팅방 존재 여부 검사
      const exChatAttend = isEmptyProductId
        ? await chat_attend.findOne({
            where: {
              product_id: null,
              [Op.or]: [
                {
                  [Op.and]: [
                    { seller_id: req.decoded.id },
                    { buyer_id: chatPartnerId },
                  ],
                },
                {
                  [Op.and]: [
                    { seller_id: chatPartnerId },
                    { buyer_id: req.decoded.id },
                  ],
                },
              ],
            },
          })
        : await chat_attend.findOne({
            where: {
              product_id: productId,
              seller_id: exProduct.seller_id,
              buyer_id: req.decoded.id,
            },
          });

      if (exChatAttend) {
        return res.json({
          result: true,
          message: "이미 존재하는 채팅방입니다.",
          chatRoomId: exChatAttend.chat_room_id,
        });
      }

      // 채팅방 생성 후, 채팅방 참가 정보 저장
      const newChatRoom = await chat_room.create();

      /**
       * 상품 ID가 입력되지 않았을 경우, chat_attend 테이블에
       * product_id는 null
       * buyer_id는 채팅방을 생성한 사용자 ID
       * seller_id는 채팅방에 초대된 사용자 ID
       * 로 추가됨
       */
      const newChatAttend = await chat_attend.create({
        chat_room_id: newChatRoom.id,
        seller_id: isEmptyProductId ? exPartner.id : exProduct.seller_id,
        buyer_id: req.decoded.id,
        product_id: isEmptyProductId ? null : exProduct.id,
      });

      console.log("newChatRoom: ", newChatRoom);
      console.log("newChatAttend: ", newChatAttend);
      res.json({ result: true, message: "채팅방이 생성되었습니다." });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  }
);
/************************************ 채팅방 참가 END ************************************/

/************************************ 상품 거래 확정 ************************************/
chatRouter.patch(
  "/confirmTransaction",
  verifySanctionedToken,
  async (req, res, next) => {
    const { chatRoomId } = req.body;

    if (isEmptyOrSpaces(chatRoomId)) {
      return res.json({
        result: false,
        message: "채팅방 ID가 입력되지 않았습니다.",
      });
    }

    try {
      const exChatAttend = await chat_attend.findOne({
        where: { chat_room_id: chatRoomId },
      });

      const isSeller = exChatAttend.seller_id === req.decoded.id;
      const isBuyer = exChatAttend.buyer_id === req.decoded.id;

      if (!isSeller && !isBuyer) {
        return res.json({
          result: false,
          message: "채팅방에 참가한 회원이 아닙니다.",
        });
      }

      let message;

      // 판매자일 경우, 판매 확정 정보 업데이트
      if (isSeller) {
        await chat_room.update(
          { seller_check: true },
          { where: { id: chatRoomId } }
        );
        message = "판매 확정되었습니다.";
      }

      // 구매자일 경우, 구매 확정 정보 업데이트
      if (isBuyer) {
        await chat_room.update(
          { buyer_check: true },
          { where: { id: chatRoomId } }
        );
        message = "구매 확정되었습니다.";
      }

      const exChatRoom = await chat_room.findOne({
        where: { id: chatRoomId },
      });

      // 판매자와 구매자 모두 거래 확정시, 거래 내역 추가 및 상품 상태 판매 완료로 수정
      if (
        exChatRoom.seller_check &&
        exChatRoom.buyer_check &&
        !isEmptyOrSpaces(exChatAttend.product_id)
      ) {
        const newTransaction = await transaction.create({
          product_id: exChatAttend.product_id,
          seller_id: exChatAttend.seller_id,
          buyer_id: exChatAttend.buyer_id,
        });

        if (newTransaction) {
          await product.update(
            { status: 2 },
            { where: { id: exChatAttend.product_id } }
          );
        }
      }

      res.json({
        result: true,
        message,
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  }
);
/************************************ 상품 거래 확정 END ************************************/
// Router Code END

module.exports = { chatWebSocket, chatRouter };
