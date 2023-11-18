const SocketIO = require("socket.io");
const express = require("express");
const {
  verifySocketToken,
  verifySocketSanctionedToken,
} = require("./middlewares");
const { isEmptyOrSpaces } = require("../util");
const { db } = require("../models");
const { chat_attend, chat_room, chat_message } = db;

// WebSocket Code
const chatWebSocket = (server, app) => {
  const io = SocketIO(server, { path: "/socket.io" });
  app.set("io", io);

  const room = io.of("/room").use((socket, next) => {
    verifySocketToken(socket, next);
    next();
  });
  const chat = io.of("/chat").use((socket, next) => {
    verifySocketToken(socket, next);
    next();
  });

  room.on("connection", (socket) => {
    socket.on("disconnect", () => {
      console.log("room 네임스페이스 접속 해제");
    });
  });

  chat.on("connection", (socket) => {
    console.log("chat 네임스페이스에 접속");
    const req = socket.request;
    const {
      headers: { referer },
    } = req;
    console.log("referer: ", referer);
    // const roomId = referer
    //   .split("/")
    //   [referer.split("/").length - 1].replace(/\?.+/, "");
    socket.join(roomId);
    socket.to(roomId).emit("join", {
      user: "system",
      chat: `${req.session.color}님이 입장하셨습니다.`,
    });

    socket.on("disconnect", () => {
      console.log("chat 네임스페이스 접속 해제");
      socket.leave(roomId);
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        // 유저가 0명이면 방 삭제
        const signedCookie = cookie.sign(
          req.signedCookies["connect.sid"],
          process.env.COOKIE_SECRET
        );
        const connectSID = `${signedCookie}`;
      } else {
        socket.to(roomId).emit("exit", {
          user: "system",
          chat: `${req.session.color}님이 퇴장하셨습니다.`,
        });
      }
    });
  });
};
// WebSocket Code END

// Router Code
const chatRouter = express.Router();

// Router Code END

module.exports = { chatWebSocket, chatRouter };
