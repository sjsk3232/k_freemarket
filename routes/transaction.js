const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken } = require("./middlewares");
const { db } = require("../models");
const { transaction, product, product_Image } = db;

const router = express.Router();

/************************************ 구매 내역 조회 ************************************/

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
router.get("/searchPurchaseList", verifyToken, async (req, res, next) => {
  const { limit, pageNum } = req.query;

  const whereCondition = { buyer_id: req.decoded.id };
  const pageCondition = {};
  const orderCondition = [["created_at", "DESC"]];

  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundList;
    if (_.isEmpty(pageCondition)) {
      foundList = await transaction.findAll({
        attributes: ["seller_id", "buyer_id", "created_at"],
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: product,
            as: "product",
            attributes: [
              ["id", "product_id"],
              "seller_id",
              "title",
              "price",
              "category",
              "view",
              "like",
              "status",
              "updated_at",
            ],
            required: true,
            include: [
              {
                model: product_Image,
                as: "product_Images",
                attributes: ["key", "image_url", "image_type"],
                required: true,
              },
            ],
          },
        ],
      });
    } else {
      foundList = await transaction.findAll({
        attributes: [
          ["id", "transaction_id"],
          "seller_id",
          "buyer_id",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: product,
            as: "product",
            attributes: [
              ["id", "product_id"],
              "seller_id",
              "title",
              "price",
              "category",
              "view",
              "like",
              "status",
              "updated_at",
            ],
            required: true,
            include: [
              {
                model: product_Image,
                as: "product_Images",
                attributes: ["key", "image_url", "image_type"],
                required: true,
              },
            ],
          },
        ],
      });
    }

    const totalCount = await transaction.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "구매 내역 조회가 완료되었습니다.",
      found: foundList,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 구매 내역 조회 END ************************************/

/************************************ 판매 내역 조회 ************************************/

/** 각 조건은 AND 연산 */
router.get("/searchSaleList", verifyToken, async (req, res, next) => {
  const { limit, pageNum } = req.query;

  const whereCondition = { seller_id: req.decoded.id };
  const pageCondition = {};
  const orderCondition = [["created_at", "DESC"]];

  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundList;
    if (_.isEmpty(pageCondition)) {
      foundList = await transaction.findAll({
        attributes: [
          ["id", "transaction_id"],
          "seller_id",
          "buyer_id",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: product,
            as: "product",
            attributes: [
              ["id", "product_id"],
              "seller_id",
              "title",
              "price",
              "category",
              "view",
              "like",
              "status",
              "updated_at",
            ],
            required: true,
            include: [
              {
                model: product_Image,
                as: "product_Images",
                attributes: ["key", "image_url", "image_type"],
                required: true,
              },
            ],
          },
        ],
      });
    } else {
      foundList = await transaction.findAll({
        attributes: ["seller_id", "buyer_id", "created_at"],
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: product,
            as: "product",
            attributes: [
              ["id", "product_id"],
              "seller_id",
              "title",
              "price",
              "category",
              "view",
              "like",
              "status",
              "updated_at",
            ],
            required: true,
            include: [
              {
                model: product_Image,
                as: "product_Images",
                attributes: ["key", "image_url", "image_type"],
                required: true,
              },
            ],
          },
        ],
      });
    }

    const totalCount = await transaction.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "판매 내역 조회가 완료되었습니다.",
      found: foundList,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 판매 내역 조회 END ************************************/

module.exports = router;
