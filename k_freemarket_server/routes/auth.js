const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const emailAuth = require("./mail_auth");
const {
  verifyToken,
  verifySanctionedToken,
  verifyAdminToken,
} = require("./middlewares");
const { db } = require("../models");
const { user } = db;

const router = express.Router();

/************************************ 메일 인증번호 발급 ************************************/
router.get("/mailAuth", emailAuth);

/************************************ 발급한 토큰 테스트 ************************************/
router.get("/tokenTest", verifyToken, (req, res) => {
  res.json(req.decoded);
});

/************************************ 제재된 토큰 테스트 ************************************/
router.get("/sanctionedTokenTest", verifySanctionedToken, (req, res) => {
  res.json(req.decoded);
});

/************************************ 관리자 토큰 테스트 ************************************/
router.get("/adminTokenTest", verifyAdminToken, (req, res) => {
  res.json(req.decoded);
});

/************************************ 로그인 ************************************/
router.post("/login", (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    (authError, user, info) => {
      if (authError) {
        console.error("------authError: ", authError);
        return next(authError);
      }
      if (!user) {
        return res.json({ result: false, message: info.message });
      }
      return req.login(user, (loginError) => {
        if (loginError) {
          console.error(loginError);
          return next(loginError);
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: "1h", // 유효시간 1시간
          issuer: "freemarket",
        });
        return res.json({
          result: true,
          message: "로그인에 성공하였습니다.",
          token: token,
        });
      });
    }
  )(req, res, next);
});
/************************************ 로그인 END ************************************/

/************************************ 회원 비밀번호 확인 ************************************/
router.post("/checkPassword", verifyToken, async (req, res, next) => {
  const { id } = req.decoded;
  const password = req.body.password;
  const exUser = await user.findByPk(id);
  if (exUser) {
    //비밀번호 검증
    const result = await bcrypt.compare(password, exUser.password);
    if (result) {
      return res.json({
        result: true,
        message: "비밀번호가 일치합니다.",
      });
    } else {
      return res.json({
        result: false,
        message: "비밀번호가 일치하지 않습니다.",
      });
    }
  } else {
    return res.json({
      result: false,
      message: "가입되지 않은 회원입니다.",
    });
  }
});
/************************************ 회원 비밀번호 확인 END ************************************/

module.exports = router;
