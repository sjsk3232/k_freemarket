const express = require("express");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifyAdminToken } = require("./middlewares");
const { Op, fn, col } = require("sequelize");
const { db } = require("../models");
const { user, user_sanction } = db;

const router = express.Router();

/************************************ 회원 가입 ************************************/
router.post("/enroll", async (req, res, next) => {
  const { id, password, email, name, mobile } = req.body;

  if (
    isEmptyOrSpaces(id) ||
    isEmptyOrSpaces(password) ||
    isEmptyOrSpaces(email) ||
    isEmptyOrSpaces(name) ||
    isEmptyOrSpaces(mobile)
  )
    return res.json({
      result: false,
      message: "가입 필수 항목이 입력되지 않았습니다.",
    });

  try {
    const exUser = await user.findByPk(id);

    if (exUser) {
      res.json({ result: false, message: "중복된 아이디입니다." });
      console.log("-----exUser: ", exUser);
      return;
    }

    const exSanction = await user_sanction.findOne({
      where: {
        target_email: email,
        expire_at: { [Op.gt]: new Date() },
      },
    });

    if (exSanction) {
      return res.json({ result: false, message: "제재된 이메일입니다." });
    }

    const hash = await bcrypt.hash(password, 12);
    await user.create({
      id,
      password: hash,
      author: 0,
      email,
      name,
      mobile,
    });
    res.json({ result: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원 가입 END ************************************/

/************************************ 관리자 가입 ************************************/
router.post("/enrollAdmin", verifyAdminToken, async (req, res, next) => {
  const { id, password, email, name, mobile } = req.body;
  try {
    const exUser = await user.findByPk(id);

    if (exUser) {
      return res.json({ result: false, message: "중복된 아이디입니다." });
    }

    const hash = await bcrypt.hash(password, 12);
    await user.create({
      id,
      password: hash,
      author: 1,
      email,
      name,
      mobile,
    });
    res.json({ result: true, message: "회원가입이 완료되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 관리자 가입 END ************************************/

/************************************ 회원 탈퇴 ************************************/
router.delete("/drop", verifyToken, async (req, res, next) => {
  const { id } = req.decoded; // req.decoded.id가 토큰의 회원 id
  try {
    const exUser = await user.findByPk(id);

    if (!exUser) {
      res.json({
        result: false,
        message: "회원이 존재하지 않습니다.",
      });
      return;
    } else if (exUser.author === 1) {
      res.json({
        result: false,
        message: "관리자 계정은 탈퇴할 수 없습니다.",
      });
      return;
    }

    await user.destroy({
      // DB에서 회원 삭제
      where: { id },
    });
    res.json({ result: true, message: "회원 탈퇴가 완료되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원 탈퇴 END ************************************/

/************************************ 회원정보 수정 ************************************/
router.patch("/change", verifyToken, async (req, res, next) => {
  const { password, email, name, mobile } = req.body;

  try {
    let hash;
    if (!isEmptyOrSpaces(password)) hash = await bcrypt.hash(password, 12);

    // 회원 정보 업데이트
    await user.update(
      { password: hash, email, name, mobile },
      { where: { id: req.decoded.id } }
    );

    // 업데이트된 회원 정보 조회
    const updatedUser = await user.findOne({
      attributes: ["id", "author", "email", "name", "mobile"],
      where: { id: req.decoded.id },
    });
    res.json({
      result: true,
      message: "회원정보 수정이 완료되었습니다.",
      updated: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원정보 수정 END ************************************/

/************************************ 회원 조회 ************************************/

/** 조회 조건 요약 */
function sumUpCondition(whereCondition, id, email, name, mobile) {
  if (!isEmptyOrSpaces(id)) {
    whereCondition.id = id;
  }
  if (!isEmptyOrSpaces(email)) {
    whereCondition.email = email;
  }
  if (!isEmptyOrSpaces(name)) {
    whereCondition.name = name;
  }
  if (!isEmptyOrSpaces(mobile)) {
    whereCondition.mobile = mobile;
  }
}

/** 페이징 조건 요약 */
// limit(페이지 당 항목 수)가 설정 되어 있지 않으면, pageNum도 적용되지 않음
function sumUpPageCondition(pageCondition, limit, pageNum) {
  if (!isEmptyOrSpaces(limit)) {
    pageCondition.limit = limit;
    if (!isEmptyOrSpaces(pageNum)) {
      pageCondition.offset = (pageNum - 1) * limit;
    } else {
      pageCondition.offset = 0;
    }
  }
}

/** 각 조건은 AND 연산 */
router.get("/search", async (req, res, next) => {
  const { id, email, name, mobile, limit, pageNum } = req.query;

  const whereCondition = {};
  const pageCondition = {};
  const orderCondition = [["id", "ASC"]]; // 아이디를 기준으로 오름차순 정렬

  sumUpCondition(whereCondition, id, email, name, mobile);
  sumUpPageCondition(pageCondition, limit, pageNum);

  whereCondition.author = { [Op.ne]: 1 }; // 관리자 계정은 제외

  try {
    let foundUsers;
    if (_.isEmpty(pageCondition)) {
      foundUsers = await user.findAll({
        attributes: ["id", "email", "name", "mobile"],
        where: whereCondition,
        order: orderCondition,
      });
    } else {
      foundUsers = await user.findAll({
        attributes: ["id", "email", "name", "mobile"],
        where: whereCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        order: orderCondition,
      });
    }

    const totalCount = await user.findAll({
      attributes: [[fn("COUNT", col("id")), "count"]],
      where: whereCondition,
    });

    console.log("found: ", foundUsers);
    res.json({
      result: true,
      message: "회원 검색이 완료되었습니다.",
      found: foundUsers,
      totalCount: totalCount[0].dataValues.count,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원 조회 END ************************************/

module.exports = router;
