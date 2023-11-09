const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifySanctionedToken } = require("./middlewares");
const { db } = require("../models");
const { review, transaction, product, user } = db;
const { fn, col } = require("sequelize");

const router = express.Router();

/************************************ 리뷰 작성 ************************************/
router.post("/write", verifySanctionedToken, async (req, res, next) => {
  const { transaction_id, rating, content } = req.body;

  if (isEmptyOrSpaces(transaction_id)) {
    return res.json({
      result: false,
      message:
        "요청사항에 리뷰를 작성하실 거래 항목 ID (transaction_id)가 없습니다.",
    });
  }
  if (isEmptyOrSpaces(rating)) {
    return res.json({
      result: false,
      message: "요청사항에 등록할 리뷰의 별점이 없습니다.",
    });
  }
  if (isEmptyOrSpaces(content)) {
    return res.json({
      result: false,
      message: "요청사항에 등록할 리뷰의 본문이 없습니다.",
    });
  }
  try {
    const exTransaction = await transaction.findOne({
      attributes: ["buyer_id", "seller_id"],
      where: { id: transaction_id },
    });

    if (!exTransaction) {
      return res.json({
        result: false,
        message: "리뷰를 작성하실 거래 항목이 존재하지 않습니다.",
      });
    }

    if (exTransaction.buyer_id !== req.decoded.id) {
      return res.json({
        result: false,
        message: "상품 구매자가 아니므로 리뷰를 작성할 수 없습니다.",
      });
    }

    const exReview = await review.findOne({
      where: { transaction_id },
    });

    if (exReview) {
      return res.json({
        result: false,
        message: "이미 해당 상품은 리뷰를 작성했습니다.",
      });
    }

    const newReview = await review.create({
      transaction_id,
      writer_id: exTransaction.buyer_id,
      shop_id: exTransaction.seller_id,
      rating: parseFloat(rating),
      content,
    });

    const countRatings = await review.findOne({
      attributes: [
        "shop_id",
        [fn("SUM", col("rating")), "sum_ratings"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: ["shop_id"],
      where: { shop_id: exTransaction.seller_id },
    });

    const calcRating = (
      parseFloat(countRatings.dataValues.sum_ratings) /
      countRatings.dataValues.count
    ).toFixed(1);

    await user.update(
      { rating: calcRating },
      {
        where: {
          id: exTransaction.seller_id,
        },
      }
    );

    res.json({
      result: true,
      message: "리뷰 작성을 완료했습니다.",
      newReview,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 리뷰 작성 END ************************************/

/************************************ 리뷰 삭제 ************************************/
router.delete("/delete", verifySanctionedToken, async (req, res, next) => {
  const { review_id } = req.body;
  try {
    const exReview = await review.findByPk(review_id);

    if (!exReview) {
      return res.json({
        result: false,
        message: "입력한 id에 해당하는 리뷰가 존재하지 않습니다.",
      });
    }

    if (exReview.writer_id !== req.decoded.id) {
      return res.json({
        result: false,
        message: "상품 구매자가 아니므로 리뷰를 삭제할 수 없습니다.",
      });
    }
    exReview.destroy();

    res.json({
      result: true,
      message: "리뷰가 삭제되었습니다.",
      deleted: exReview,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 리뷰 삭제 END ************************************/

/************************************ 작성한 리뷰 조회 ************************************/

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
router.get("/searchWriteReview", async (req, res, next) => {
  const { user_id, limit, pageNum } = req.query;

  const whereCondition = { writer_id: user_id };
  const pageCondition = {};
  const orderCondition = [["created_at", "DESC"]]; // 신고/문의 작성시간을 기준으로 오름차순 정렬

  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundReviews;
    if (_.isEmpty(pageCondition)) {
      foundReviews = await review.findAll({
        attributes: [
          ["id", "review_id"],
          "writer_id",
          "shop_id",
          "rating",
          "content",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: transaction,
            as: "transaction",
            attributes: ["product_id"],
            required: true,
            include: [
              {
                model: product,
                as: "product",
                attributes: ["title"],
                required: true,
              },
            ],
          },
        ],
      });
    } else {
      foundReviews = await review.findAll({
        attributes: [
          ["id", "review_id"],
          "writer_id",
          "shop_id",
          "rating",
          "content",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: transaction,
            as: "transaction",
            attributes: ["product_id"],
            required: true,
            include: [
              {
                model: product,
                as: "product",
                attributes: ["title"],
                required: true,
              },
            ],
          },
        ],
      });
    }

    const totalCount = await review.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "작성한 리뷰 조회가 완료되었습니다.",
      found: foundReviews,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 작성한 리뷰 조회 END ************************************/

/************************************ 작성된 리뷰 조회 ************************************/

/** 각 조건은 AND 연산 */
router.get("/searchWrittenReview", async (req, res, next) => {
  const { user_id, limit, pageNum } = req.query;

  const whereCondition = { shop_id: user_id };
  const pageCondition = {};
  const orderCondition = [["created_at", "DESC"]]; // 신고/문의 작성시간을 기준으로 오름차순 정렬

  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundReviews;
    if (_.isEmpty(pageCondition)) {
      foundReviews = await review.findAll({
        attributes: [
          ["id", "review_id"],
          "writer_id",
          "shop_id",
          "rating",
          "content",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: transaction,
            as: "transaction",
            attributes: ["product_id"],
            required: true,
            include: [
              {
                model: product,
                as: "product",
                attributes: ["title"],
                required: true,
              },
            ],
          },
        ],
      });
    } else {
      foundReviews = await review.findAll({
        attributes: [
          ["id", "review_id"],
          "writer_id",
          "shop_id",
          "rating",
          "content",
          "created_at",
        ],
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: transaction,
            as: "transaction",
            attributes: ["product_id"],
            required: true,
            include: [
              {
                model: product,
                as: "product",
                attributes: ["title"],
                required: true,
              },
            ],
          },
        ],
      });
    }

    const totalCount = await review.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "작성된 리뷰 조회가 완료되었습니다.",
      found: foundReviews,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 작성된 리뷰 조회 END ************************************/

module.exports = router;
