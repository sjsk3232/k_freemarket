const SocketIO = require("socket.io");
const {
  verifySocketToken,
  verifySocketSanctionedToken,
} = require("../routes/middlewares");
const { isEmptyOrSpaces } = require("../util");
const { Op, col } = require("sequelize");
const { db } = require("../models");
const { chat_attend, chat_room, chat_message, product } = db;

// WebSocket Code
const chatWebSocket = (server, app) => {
  const io = SocketIO(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  app.set("io", io);

  const chatRoomList = io.of("/chatRoomList").use((socket, next) => {
    verifySocketToken(socket, next);
    next();
  });

  const chatRoom = io.of("/chatRoom").use((socket, next) => {
    verifySocketSanctionedToken(socket, next);
    next();
  });

  /************************************ 채팅방 목록 ************************************/
  chatRoomList.on("connection", async (socket) => {
    if (!(socket.decoded && socket.decoded.id)) {
      console.error(new Error("검증되지 않은 토큰"));
      return socket.disconnect(true);
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
        {
          model: chat_room,
          as: "chat_room",
          required: true,
        },
      ],
      order: [[col("chat_room.updated_at", "DESC")]],
    });

    // 맨 처음 채팅방 목록 접속시, 참가 중인 채팅방 목록 emit
    socket.emit("chatRoomList", foundAttends);

    socket.on("disconnect", () => {
      console.log("chatRoomList 네임스페이스 접속 해제");
    });
  });
  /************************************ 채팅방 목록 END ************************************/

  /************************************ 채팅방 END ************************************/
  chatRoom.on("connection", async (socket) => {
    if (!(socket.decoded && socket.decoded.id)) {
      console.error(new Error("검증되지 않은 토큰"));
      return socket.disconnect(true);
    }

    const { chatRoomId } = socket.handshake.query;

    if (isEmptyOrSpaces(chatRoomId)) {
      console.error(new Error("참가하려는 채팅방 ID가 입력되지 않았습니다."));
      return socket.disconnect(true);
    }

    // 채팅방 참가 테이블에서 주어진 채팅방 ID와 일치하는 항목 검색
    const exChatAttend = await chat_attend.findOne({
      where: { chat_room_id: chatRoomId },
      include: [
        {
          model: product,
          as: "product",
          attributes: ["title"],
          required: false,
        },
      ],
    });

    if (!exChatAttend) {
      console.error(new Error("참가하려는 채팅방이 존재하지 않습니다."));
      return socket.disconnect(true);
    }

    if (
      exChatAttend.seller_id !== socket.decoded.id &&
      exChatAttend.buyer_id !== socket.decoded.id
    ) {
      console.error(new Error("참가하려는 채팅방에 참가할 권한이 없습니다."));
      return socket.disconnect(true);
    }

    // 채팅방 참가
    socket.join(chatRoomId);

    // unread 카운트 수정
    await chat_message.decrement("unread", {
      where: {
        chat_room_id: chatRoomId,
        sender_id: { [Op.ne]: socket.decoded.id },
        unread: { [Op.gt]: 0 },
      },
    });

    // unread 카운트 수정된 메시지 목록
    const foundChatMessages = await chat_message.findAll({
      where: { chat_room_id: chatRoomId },
      order: [["created_at", "ASC"]],
    });

    // 채팅방에 수정된 메시지 목록 emit
    chatRoom.to(chatRoomId).emit("chatMessages", foundChatMessages);

    // 메시지 전송
    socket.on("chat", async (data) => {
      const numOfClients = socket.adapter.rooms.get(chatRoomId).size;
      const newMessage = await chat_message.create({
        chat_room_id: chatRoomId,
        sender_id: socket.decoded.id,
        content: data.message,
        unread: numOfClients < 2 ? 1 : 0,
      });

      // 대화 상대가 채팅방에 참가 중일시, 메시지 전송 후 종료
      if (numOfClients > 1) {
        return socket.to(chatRoomId).emit("newMessage", newMessage);
      }

      const foundChatRoom = await chat_room.findOne({
        attributes: ["id", "seller_unread", "buyer_unread"],
        where: { id: chatRoomId },
      });

      // 채팅방의 대화 상대의 읽지 않음 카운트 증가
      let partnerId, count;
      if (exChatAttend.seller_id !== socket.decoded.id) {
        partnerId = exChatAttend.seller_id;
        count = foundChatRoom.seller_unread + 1;
        await foundChatRoom.increment("seller_unread");
      } else {
        partnerId = exChatAttend.buyer_id;
        count = foundChatRoom.buyer_unread + 1;
        await foundChatRoom.increment("buyer_unread");
      }

      // 대화 상대가 채팅방 목록에 접속 중일시, 읽지 않음 정보 emit
      const sockets = await chatRoomList.fetchSockets();
      for (const socket of sockets) {
        if (socket.decoded.id === partnerId) {
          socket.emit("unread", { chat_room_id: chatRoomId, count });
          break;
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("chatRoom 네임스페이스 접속 해제");
      socket.leave(chatRoomId);
    });
  });
  /************************************ 채팅방 END ************************************/
};

module.exports = chatWebSocket;
