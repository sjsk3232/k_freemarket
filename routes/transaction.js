const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken } = require("./middlewares");
const { db } = require("../models");
const { transaction, product, product_Image } = db;

const router = express.Router();

/************************************ 임시 상품 구매 ************************************/
router.post("/purchase", verifyToken, async (req, res, next) => {
  const { productId } = req.body;

  if (isEmptyOrSpaces(productId)) {
    return res.json({
      result: false,
      message: "구매하려는 상품의 ID가 입력되지 않았습니다.",
    });
  }
  try {
    const exProduct = await product.findOne({
      attributes: ["id", "seller_id", "status"],
      where: { id: productId },
    });

    if (!exProduct) {
      return res.json({
        result: false,
        message: "구매하려는 상품이 존재하지 않습니다.",
      });
    }

    if (exProduct.seller_id === req.decoded.id) {
      return res.json({
        result: false,
        message: "상품 판매자가 본인 상품을 구매할 수 없습니다.",
      });
    }

    if (exProduct.status === 2) {
      return res.json({
        result: false,
        message: "이미 판매된 상품입니다.",
      });
    }

    // 거래 내역 추가
    const newTransaction = await transaction.create({
      product_id: productId,
      seller_id: exProduct.seller_id,
      buyer_id: req.decoded.id,
    });

    // 상품 상태 판매 완료로 변경
    exProduct.update({ status: 2 });

    res.json({
      result: true,
      message: "거래가 완료되었습니다.",
      newTransaction,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 임시 상품 구매 END ************************************/

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
                where: { image_type: 1 },
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
                where: { image_type: 1 },
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
                where: { image_type: 1 },
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
                where: { image_type: 1 },
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
