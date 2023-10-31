const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifyAdminToken } = require("./middlewares");
const { db } = require("../models");
const { user, user_sanction } = db;
const { fn, col } = require("sequelize");

const router = express.Router();

/************************************ 회원 제재 ************************************/
router.post("/impose", verifyAdminToken, async (req, res, next) => {
  const { id, reason, expire_at } = req.body;
  try {
    // DB에서 가입된 회원 검색
    const exUser = await user.findByPk(id);

    if (!exUser) {
      res.json({
        result: false,
        message: "제재 대상 회원이 존재하지 않습니다.",
      });
      return;
    } else if (exUser.author === 1) {
      res.json({
        result: false,
        message: "제재 대상이 관리자일 수 없습니다.",
      });
      return;
    }

    let newSanction;
    if (isEmptyOrSpaces(expire_at)) {
      newSanction = await user_sanction.create({
        author_id: req.decoded.id,
        target_id: id,
        target_email: exUser.email,
        reason,
      });
    } else {
      newSanction = await user_sanction.create({
        author_id: req.decoded.id,
        target_id: id,
        target_email: exUser.email,
        reason,
        expire_at,
      });
    }

    res.json({
      result: true,
      message: "회원 제재 완료되었습니다.",
      newSanction,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원 제재 END ************************************/

/************************************ 회원 제재 취소 ************************************/
router.delete("/cancel", verifyAdminToken, async (req, res, next) => {
  const id = req.query.sanctionId;

  try {
    const deletedSanction = await user_sanction.findOne({
      where: { id: parseInt(id) },
    });

    if (deletedSanction) await deletedSanction.destroy();

    res.json({
      result: true,
      message: "회원 제재가 취소되었습니다.",
      deletedSanction,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원 제재 취소 END ************************************/

/** 조회 조건 요약 */
function sumUpCondition(whereCondition, author_id, target_id, target_email) {
  if (!isEmptyOrSpaces(author_id)) {
    whereCondition.author_id = author_id;
  }
  if (!isEmptyOrSpaces(target_id)) {
    whereCondition.target_id = target_id;
  }
  if (!isEmptyOrSpaces(target_email)) {
    whereCondition.target_email = target_email;
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

/************************************ 관리자용 회원 제재 목록 조회 ************************************/

/** 각 조건은 AND 연산 */
router.get("/searchForAdmin", verifyAdminToken, async (req, res, next) => {
  const { author_id, target_id, target_email, limit, pageNum } = req.query;

  const whereCondition = {};
  const pageCondition = {};
  const orderCondition = [["created_at", "ASC"]]; // 제재 적용 일자를 기준으로 오름차순 정렬

  sumUpCondition(whereCondition, author_id, target_id, target_email);
  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundSanctions;
    if (_.isEmpty(pageCondition)) {
      foundSanctions = await user_sanction.findAll({
        where: whereCondition,
        order: orderCondition,
      });
    } else {
      foundSanctions = await user_sanction.findAll({
        where: whereCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        order: orderCondition,
      });
    }

    const totalCount = await user_sanction.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "회원 제재 목록 검색이 완료되었습니다.",
      found: foundSanctions,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 관리자용 회원 제재 목록 조회 END ************************************/

/************************************ 회원용 회원 제재 목록 조회 ************************************/
router.get("/searchForMember", verifyToken, async (req, res, next) => {
  const { author_id, target_email, limit, pageNum } = req.query;

  const whereCondition = {};
  const pageCondition = {};
  const orderCondition = [["created_at", "ASC"]]; // 제재 적용 일자를 기준으로 오름차순 정렬

  sumUpCondition(whereCondition, author_id, req.decoded.id, target_email);
  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundSanctions;
    if (_.isEmpty(pageCondition)) {
      foundSanctions = await user_sanction.findAll({
        where: whereCondition,
        order: orderCondition,
      });
    } else {
      foundSanctions = await user_sanction.findAll({
        where: whereCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        order: orderCondition,
      });
    }

    const totalCount = await user_sanction.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "회원 제재 목록 검색이 완료되었습니다.",
      found: foundSanctions,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 회원용 회원 제재 목록 조회 ************************************/

module.exports = router;
