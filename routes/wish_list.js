const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken } = require("./middlewares");
const { db } = require("../models");
const { wish_list, product, product_Image } = db;

const router = express.Router();

/************************************ 찜 상품 추가 ************************************/
router.post("/add", verifyToken, async (req, res, next) => {
  const { productId } = req.body;

  if (isEmptyOrSpaces(productId)) {
    return res.json({
      result: false,
      message: "요청항목에 찜 목록에 추가하려는 상품 ID가 없습니다.",
      receivedData: { productId },
    });
  }

  try {
    // 이미 찜 목록에 존재하는지 확인
    const exWishList = await wish_list.findOne({
      where: { user_id: req.decoded.id, product_id: productId },
    });

    if (exWishList) {
      return res.json({
        result: false,
        message: "이미 해당 상품이 찜 목록에 존재합니다.",
      });
    }

    const exProduct = await product.findOne({
      attributes: ["id", "seller_id", "like"],
      where: { id: productId },
    });

    // 찜하려는 상품이 존재하는지 확인
    if (!exProduct) {
      return res.json({
        result: false,
        message: "찜 목록에 추가하려는 상품이 존재하지 않습니다.",
      });
    }

    // 찜하려는 상품이 본인이 등록한 상품인지 확인
    if (exProduct.seller_id === req.decoded.id) {
      return res.json({
        result: false,
        message: "판매자 본인이 판매 상품을 찜 목록에 추가할 수 없습니다.",
      });
    }

    const newWishList = await wish_list.create({
      user_id: req.decoded.id,
      product_id: productId,
    });

    await exProduct.increment("like");

    res.json({
      result: true,
      message: "찜 목록에 추가 완료했습니다.",
      newWishList,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 찜 상품 추가 END ************************************/

/************************************ 찜 상품 삭제 ************************************/
router.delete("/delete", verifyToken, async (req, res, next) => {
  const { productId } = req.body;

  if (isEmptyOrSpaces(productId)) {
    return res.json({
      result: false,
      message: "요청항목에 찜 목록에서 삭제하려는 상품 ID가 없습니다.",
      receivedData: { productId },
    });
  }

  try {
    const foundWishList = await wish_list.findOne({
      where: { user_id: req.decoded.id, product_id: productId },
    });

    if (!foundWishList) {
      return res.json({
        result: false,
        message: "삭제하려는 상품이 찜 목록에 없습니다.",
        receivedData: { productId },
      });
    }

    await foundWishList.destroy();
    await product.decrement(["like"], { where: { id: productId } });

    res.json({
      result: true,
      message: "찜 목록에서 삭제 완료했습니다.",
      removedWishList: foundWishList,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 찜 상품 삭제 END ************************************/

/************************************ 찜 목록 조회 ************************************/

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
router.get("/search", verifyToken, async (req, res, next) => {
  const { limit, pageNum } = req.query;

  const pageCondition = {};
  const orderCondition = [["created_at", "DESC"]]; // 찜 목록에 추가한 시간을 기준으로 오름차순 정렬

  sumUpPageCondition(pageCondition, limit, pageNum);

  try {
    let foundWishList;
    if (_.isEmpty(pageCondition)) {
      foundWishList = await wish_list.findAll({
        where: { user_id: req.decoded.id },
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
              "status",
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
      foundWishList = await wish_list.findAll({
        where: { user_id: req.decoded.id },
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
              "status",
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

    const totalCount = await wish_list.count({
      where: { user_id: req.decoded.id },
    });

    res.json({
      result: true,
      message: "찜 목록 조회가 완료되었습니다.",
      found: foundWishList,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 찜 목록 조회 END ************************************/

module.exports = router;
