const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifyAdminToken } = require("./middlewares");
const { db } = require("../models");
const { report, report_reply } = db;
const { Op } = require("sequelize");

const router = express.Router();

/************************************ 신고/문의 등록 ************************************/
router.post("/register", verifyToken, async (req, res, next) => {
  const { title, content } = req.body;

  if (isEmptyOrSpaces(title) || isEmptyOrSpaces(content))
    return res.json({
      result: false,
      message: "등록하시려는 신고/문의글의 제목이나 본문이 없습니다.",
    });
  try {
    let newReport;
    newReport = await report.create({
      reporter_id: req.decoded.id,
      title,
      content,
    });

    res.json({
      result: true,
      message: "신고/문의 등록 완료했습니다.",
      newReport,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 신고/문의 등록 END ************************************/

/************************************ 신고/문의 답변 등록 ************************************/
router.post("/reply", verifyAdminToken, async (req, res, next) => {
  const { report_id, content } = req.body;
  try {
    const exReport = await report.findByPk(report_id);

    if (!exReport) {
      res.json({
        result: false,
        message: "입력한 id에 해당하는 신고/문의글이 존재하지 않습니다.",
      });
      console.log("-----exReport: ", exReport);
      return;
    }
    if (exReport.status == 1) {
      res.json({
        result: false,
        message: "해당 신고/문의글에 이미 답변이 등록되었습니다.",
      });
      console.log("-----exReport: ", exReport);
      return;
    }

    let newReply; // 신고/문의 답변 등록
    newReply = await report_reply.create({
      report_id,
      reply_id: req.decoded.id,
      content,
    });

    await report.update({ status: 1 }, { where: { id: report_id } }); // 신고/문의글 답변 상태 수정

    res.json({
      result: true,
      message: "신고/문의 답변 등록 완료했습니다.",
      newReply,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 신고/문의 답변 등록 END ************************************/

/************************************ 신고/문의 삭제 ************************************/
router.delete("/delete", verifyToken, async (req, res, next) => {
  const { report_id } = req.body;
  try {
    const exReport = await report.findByPk(report_id);

    if (!exReport) {
      res.json({
        result: false,
        message: "입력한 id에 해당하는 신고/문의글이 존재하지 않습니다.",
      });
      console.log("-----exReport: ", exReport);
      return;
    }
    if (exReport.reporter_id !== req.decoded.id) {
      res.json({
        result: false,
        message: "해당 신고/문의글의 작성자가 아닙니다.",
      });
      console.log("-----exReport: ", exReport);
      return;
    }

    await report.destroy({
      where: { id: report_id },
    });
    res.json({ result: true, message: "신고/문의글이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 신고/문의 삭제 END ************************************/

/************************************ 신고/문의 답변 삭제 ************************************/
router.delete("/deleteReply", verifyAdminToken, async (req, res, next) => {
  const { report_id } = req.body;
  try {
    const exReply = await report_reply.findOne({
      where: { report_id },
    });

    if (!exReply) {
      res.json({
        result: false,
        message: "입력한 id에 해당하는 신고/문의글에 답변이 존재하지 않습니다.",
      });
      console.log("-----exReply: ", exReply);
      return;
    }

    await report_reply.destroy({
      where: { report_id },
    });

    await report.update({ status: 0 }, { where: { id: report_id } }); // 신고/문의글 답변 상태 수정

    res.json({ result: true, message: "신고/문의글 답변이 삭제되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 신고/문의 답변 삭제 END ************************************/

/************************************ 관리자용 신고/문의 및 답변 조회 ************************************/

/** 관리자용 조회 조건 요약 */
function sumUpAdminCondition(whereCondition, reporter_id, titleKeyword) {
  if (!isEmptyOrSpaces(reporter_id)) {
    whereCondition.reporter_id = reporter_id;
  }
  if (!isEmptyOrSpaces(titleKeyword)) {
    whereCondition.title = { [Op.substring]: titleKeyword };
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
router.get("/searchForAdmin", verifyAdminToken, async (req, res, next) => {
  const { reporter_id, titleKeyword, limit, pageNum } = req.query;

  const whereCondition = {};
  const pageCondition = {};
  const orderCondition = [["created_at", "ASC"]]; // 신고/문의 작성시간을 기준으로 오름차순 정렬

  sumUpAdminCondition(whereCondition, reporter_id, titleKeyword);
  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundReports;
    if (_.isEmpty(pageCondition)) {
      foundReports = await report.findAll({
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: report_reply,
            as: "report_replies",
            attributes: [["reply_id", "replyer_id"], "content", "created_at"],
            required: false,
          },
        ],
      });
    } else {
      foundReports = await report.findAll({
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: report_reply,
            as: "report_replies",
            attributes: [["reply_id", "replyer_id"], "content", "created_at"],
            required: false,
          },
        ],
      });
    }

    const totalCount = await report.count({
      where: whereCondition,
    });

    console.log("found: ", foundReports);
    res.json({
      result: true,
      message: "신고/문의 검색이 완료되었습니다.",
      found: foundReports,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 관리자용 신고/문의 및 답변 조회 END ************************************/

/************************************ 회원용 신고/문의 및 답변 조회 ************************************/

/** 조회 조건 요약 */
function sumUpCondition(whereCondition, titleKeyword) {
  if (!isEmptyOrSpaces(titleKeyword)) {
    whereCondition.title = { [Op.substring]: titleKeyword };
  }
}

/** 각 조건은 AND 연산 */
router.get("/searchForMember", verifyToken, async (req, res, next) => {
  const { titleKeyword, limit, pageNum } = req.query;

  const whereCondition = {};
  const pageCondition = {};
  const orderCondition = [["created_at", "ASC"]]; // 신고/문의 작성시간을 기준으로 오름차순 정렬

  sumUpCondition(whereCondition, titleKeyword);
  sumUpPageCondition(pageCondition, limit, pageNum);

  whereCondition.reporter_id = req.decoded.id;

  try {
    let foundReports;
    if (_.isEmpty(pageCondition)) {
      foundReports = await report.findAll({
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: report_reply,
            as: "report_replies",
            attributes: [["reply_id", "replyer_id"], "content", "created_at"],
            required: false,
          },
        ],
      });
    } else {
      foundReports = await report.findAll({
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: report_reply,
            as: "report_replies",
            attributes: [["reply_id", "replyer_id"], "content", "created_at"],
          },
        ],
      });
    }

    const totalCount = await report.count({
      where: whereCondition,
    });

    console.log("found: ", foundReports);
    res.json({
      result: true,
      message: "신고/문의 검색이 완료되었습니다.",
      found: foundReports,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 관리자용 신고/문의 및 답변 조회 END ************************************/

module.exports = router;
