const express = require("express");
const { verifySanctionedToken } = require("./middlewares");
const { isEmptyOrSpaces } = require("../util");
const { Op } = require("sequelize");
const { db } = require("../models");
const { chat_attend, chat_room, user, product, transaction } = db;

const router = express.Router();

/************************************ 채팅방 참가 ************************************/
router.post("/enterChatRoom", verifySanctionedToken, async (req, res, next) => {
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

    const newChatAttend = await chat_attend.create({
      chat_room_id: newChatRoom.id,
      seller_id: isEmptyProductId ? exPartner.id : exProduct.seller_id,
      buyer_id: req.decoded.id,
      product_id: isEmptyProductId ? null : exProduct.id,
    });

    // 채팅방 목록에 접속 중인 상대에게 새로운 채팅방 정보 emit
    const io = req.app.get("io");
    const sockets = await io.of("/chatRoomList").fetchSockets();
    const partnerId = exProduct ? exProduct.seller_id : exPartner.id;
    for (const socket of sockets) {
      if (socket.decoded.id === partnerId) {
        socket.emit("newChatRoom", newChatAttend);
        break;
      }
    }

    res.json({
      result: true,
      message: "채팅방이 생성되었습니다.",
      chatRoomId: newChatAttend.chat_room_id,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 채팅방 참가 END ************************************/

/************************************ 상품 거래 확정 ************************************/
router.patch(
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
        include: [
          {
            model: product,
            as: "product",
            attributes: ["id", "status"],
            required: false,
          },
        ],
      });

      const isSeller = exChatAttend.seller_id === req.decoded.id;
      const isBuyer = exChatAttend.buyer_id === req.decoded.id;

      if (!isSeller && !isBuyer) {
        return res.json({
          result: false,
          message: "채팅방에 참가한 회원이 아닙니다.",
        });
      }

      foundProduct = exChatAttend.product;
      if (!foundProduct) {
        return res.json({
          result: false,
          message: "상품이 존재하는 채팅방이 아닙니다.",
        });
      }

      if (exChatAttend.product.status === 2) {
        return res.json({
          result: false,
          message: "이미 거래 완료된 상품입니다.",
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

      // // 판매자와 구매자 모두 거래 확정시, 거래 내역 추가 및 상품 상태 판매 완료로 수정
      // if (
      //   exChatRoom.seller_check &&
      //   exChatRoom.buyer_check &&
      //   !isEmptyOrSpaces(exChatAttend.product_id)
      // ) {

      //   const newTransaction = transaction.create({
      //     product_id: exChatAttend.product_id,
      //     seller_id: exChatAttend.seller_id,
      //     buyer_id: exChatAttend.buyer_id,
      //   });

      //   product.update(
      //     { status: 2 },
      //     { where: { id: exChatAttend.product_id } }
      //   );
      // }

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

module.exports = router;
