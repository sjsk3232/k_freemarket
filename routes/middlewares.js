const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { db } = require("../models");
const { user, user_sanction } = db;
const env = process.env;

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(403).json({ result: false, message: "로그인 필요" });
  }
};

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.status(403).json({ result: false, message: "이미 로그인 됨" });
  }
};

function errorHandling(res, error) {
  if (error.name === "TokenExpiredError") {
    // 유효기간 초과
    return res.status(419).json({
      result: false,
      message: "토큰이 만료되었습니다",
    });
  } else if (error.name === "NotExistIdTokenError") {
    return res.status(404).json({
      result: false,
      message: error.message,
    });
  } else if (error.name === "NotAdminTokenError") {
    return res.status(403).json({
      result: false,
      message: error.message,
    });
  } else if (error.name === "SanctionedTokenError") {
    return res.status(403).json({
      result: false,
      message: error.message,
    });
  } else {
    return res.status(401).json({
      result: false,
      message: "유효하지 않은 토큰입니다",
      error: error.toString(),
    });
  }
}

/** 제재 여부 확인 안하는 토큰 검증 */
exports.verifyToken = async (req, res, next) => {
  try {
    req.decoded = jwt.verify(req.headers.authorization, env.JWT_SECRET);

    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(req.decoded.id);

    if (!exUser) {
      const nonExistErr = new Error("존재하지 않는 아이디입니다.");
      nonExistErr.name = "NotExistIdTokenError";
      throw nonExistErr;
    }

    return next();
  } catch (error) {
    return errorHandling(res, error);
  }
};

/** 제재 여부 확인하는 토큰 검증 */
exports.verifySanctionedToken = async (req, res, next) => {
  try {
    req.decoded = jwt.verify(req.headers.authorization, env.JWT_SECRET);

    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(req.decoded.id);

    if (!exUser) {
      const nonExistErr = new Error("존재하지 않는 아이디입니다.");
      nonExistErr.name = "NotExistIdTokenError";
      throw nonExistErr;
    }

    const exSanction = await user_sanction.findOne({
      where: {
        target_id: exUser.id,
        expire_at: { [Op.gt]: new Date() },
      },
    });

    if (exSanction) {
      const sanctionedErr = new Error("제재 대상입니다.");
      sanctionedErr.name = "SanctionedTokenError";
      throw sanctionedErr;
    }

    return next();
  } catch (error) {
    return errorHandling(res, error);
  }
};

/** 관리자 토큰 검증 */
exports.verifyAdminToken = async (req, res, next) => {
  try {
    req.decoded = jwt.verify(req.headers.authorization, env.JWT_SECRET);

    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(req.decoded.id);

    if (!exUser) {
      const nonExistErr = new Error("존재하지 않는 아이디입니다.");
      nonExistErr.name = "NotExistIdTokenError";
      throw nonExistErr;
    } else if (exUser.author !== 1) {
      const authErr = new Error("관리자 권한이 아닙니다.");
      authErr.name = "NotAdminTokenError";
      throw authErr;
    }
    return next();
  } catch (error) {
    return errorHandling(res, error);
  }
};

/** 소켓에서 토큰 검증 */
exports.verifySocketToken = async (socket, next) => {
  try {
    if (!(socket.handshake.headers && socket.handshake.headers.authorization)) {
      const socketError = new Error("증명되지 않은 소켓입니다.");
      socketError.name = "socketError";
      throw socketError;
    }

    const token = socket.handshake.headers.authorization;
    socket.decoded = jwt.verify(token, env.JWT_SECRET);

    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(socket.decoded.id);

    if (!exUser) {
      const nonExistErr = new Error("존재하지 않는 아이디입니다.");
      nonExistErr.name = "NotExistIdTokenError";
      throw nonExistErr;
    }

    next();
  } catch (error) {
    return next(error);
  }
};

/** 소켓에서 제재 여부 확인하는 토큰 검증 */
exports.verifySocketSanctionedToken = async (socket, next) => {
  try {
    if (!(socket.handshake.query && socket.handshake.query.authorization)) {
      const socketError = new Error("증명되지 않은 소켓입니다.");
      socketError.name = "socketError";
      throw socketError;
    }

    const token = socket.handshake.query.authorization;
    socket.decoded = jwt.verify(token, env.JWT_SECRET);

    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(socket.decoded.id);

    if (!exUser) {
      const nonExistErr = new Error("존재하지 않는 아이디입니다.");
      nonExistErr.name = "NotExistIdTokenError";
      throw nonExistErr;
    }

    const exSanction = await user_sanction.findOne({
      where: {
        target_id: exUser.id,
        expire_at: { [Op.gt]: new Date() },
      },
    });

    if (exSanction) {
      const sanctionedErr = new Error("제재 대상입니다.");
      sanctionedErr.name = "SanctionedTokenError";
      throw sanctionedErr;
    }
    next();
  } catch (error) {
    return next(error);
  }
};
