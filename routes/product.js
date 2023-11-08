const express = require("express");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifySanctionedToken } = require("./middlewares");
const { Op } = require("sequelize");
const { db } = require("../models");
const { product, product_Image } = db;
const { removeObjects } = require("../modules/s3");
const upload = require("../modules/multer");

const router = express.Router();

// Req.files로 온 이미지들을 S3에서 삭제
function removeReqImgs(req) {
  const removeKeys = [];

  for (const idx in req.files) {
    req.files[idx].forEach((item) => {
      removeKeys.push({ Key: item.key });
    });
  }
  removeObjects(removeKeys);
}

// 시퀄라이저에서 찾아온 이미지들을 S3에서 삭제
function removeSeqImgs(target_imgs) {
  const removeKeys = [];

  for (const product_Image of target_imgs) {
    removeKeys.push({ Key: product_Image.key });
  }

  removeObjects(removeKeys);
}

// S3에 이미지 업로드
const uploadImages = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "img", maxCount: 5 },
]);

/************************************ 상품 등록 ************************************/
router.post(
  "/sell",
  verifySanctionedToken,
  uploadImages,
  async (req, res, next) => {
    const thumbnailLeng =
      req.files && req.files["thumbnail"] ? req.files["thumbnail"].length : 0;
    const imgLeng = req.files && req.files["img"] ? req.files["img"].length : 0;

    if (thumbnailLeng + imgLeng < 1)
      return res.json({
        result: false,
        message: "상품 이미지가 첨부되지 않았습니다.",
      });

    const { title, content, price, category } = req.body;
    const checkCondition =
      isEmptyOrSpaces(title) ||
      isEmptyOrSpaces(content) ||
      isEmptyOrSpaces(price) ||
      isEmptyOrSpaces(category);

    // 필수 항목을 받지 못하면, s3에 저장한 이미지 삭제
    if (checkCondition) {
      removeReqImgs(req);

      return res.json({
        result: false,
        message: "상품 등록 필수 항목이 입력되지 않았습니다.",
      });
    }

    try {
      // 상품 정보 저장
      createdProduct = await product.create({
        seller_id: req.decoded.id,
        title,
        content,
        price: parseInt(price),
        category,
      });
      console.log("created:", createdProduct);

      // 상품 이미지 정보 저장
      let thumbnail;
      let i = 0;
      if (thumbnailLeng === 0) {
        thumbnail = req.files["img"][0];
        i = 1;
      } else {
        thumbnail = req.files["thumbnail"][0];
      }
      // 썸네일 저장
      const savedThumbnail = await product_Image.create({
        product_id: createdProduct.id,
        key: thumbnail.key,
        image_url: thumbnail.location,
        image_type: 1,
      });
      // 나머지 이미지 저장
      const savedImgs = [];
      for (; i < imgLeng; i++) {
        const img = req.files["img"][i];
        const savedImg = await product_Image.create({
          product_id: createdProduct.id,
          key: img.key,
          image_url: img.location,
        });
        savedImgs.push(savedImg);
      }

      res.json({
        result: true,
        message: "상품 등록을 완료했습니다.",
        savedThumbnail,
        savedImgs,
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  }
);
/************************************ 상품 등록 END ************************************/

/************************************ 상품 삭제 ************************************/
router.delete("/remove", verifySanctionedToken, async (req, res, next) => {
  const { id } = req.decoded; // req.decoded.id가 토큰의 회원 id
  const { productId } = req.body;
  try {
    const target = await product.findByPk(productId);
    if (isEmptyOrSpaces(target)) {
      return res.json({
        result: false,
        message: "삭제 대상 상품이 DB에 존재하지 않습니다.",
      });
    }

    if (target.seller_id !== id) {
      return res.json({
        result: false,
        message: "상품을 등록하신 회원이 아닙니다.",
      });
    }

    const target_imgs = await product_Image.findAll({
      attributes: ["key"],
      where: { product_id: productId },
    });

    removeSeqImgs(target_imgs);

    await product.destroy({
      where: { id: productId },
    });
    res.json({ result: true, message: "상품 삭제가 완료되었습니다." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 상품 삭제 END ************************************/

/************************************ 상품 수정 ************************************/
router.patch(
  "/change",
  verifySanctionedToken,
  uploadImages,
  async (req, res, next) => {
    const { productId, title, content, price, category, status } = req.body;

    // 정상적인 요청 여부 판별
    if (isEmptyOrSpaces(productId)) {
      removeReqImgs(req);
      return res.json({
        result: false,
        message: "요청사항에 삭제 대상 상품의 ID가 입력되지 않았습니다.",
      });
    }
    try {
      const target = await product.findByPk(productId); // DB에서 상품 검색

      if (isEmptyOrSpaces(target)) {
        removeReqImgs(req);
        return res.json({
          result: false,
          message: "삭제 대상 상품이 DB에 존재하지 않습니다.",
        });
      }

      if (target.seller_id !== req.decoded.id) {
        removeReqImgs(req);
        return res.json({
          result: false,
          message: "상품을 등록하신 회원이 아닙니다.",
        });
      }
      // 정상적인 요청 여부 판별 END

      const thumbnailLeng =
        req.files && req.files["thumbnail"] ? req.files["thumbnail"].length : 0;
      const imgLeng =
        req.files && req.files["img"] ? req.files["img"].length : 0;
      let savedThumbnail;
      const savedImgs = [];

      if (thumbnailLeng + imgLeng !== 0) {
        // 이전 이미지 정보 삭제
        const target_imgs = await product_Image.findAll({
          attributes: ["key"],
          where: { product_id: productId },
        });

        // 이전 이미지 정보 S3에서 삭제
        removeSeqImgs(target_imgs);

        // 이전 이미지 정보 DB에서 삭제
        await product_Image.destroy({
          where: { product_id: productId },
        });

        // 상품 이미지 정보 저장
        let thumbnail,
          i = 0;
        if (thumbnailLeng === 0) {
          thumbnail = req.files["img"][0];
          i = 1;
        } else {
          thumbnail = req.files["thumbnail"][0];
        }
        // 썸네일 저장
        savedThumbnail = await product_Image.create({
          product_id: productId,
          key: thumbnail.key,
          image_url: thumbnail.location,
          image_type: 1,
        });
        // 나머지 이미지 저장
        for (; i < imgLeng; i++) {
          const img = req.files["img"][i];
          const savedImg = await product_Image.create({
            product_id: productId,
            key: img.key,
            image_url: img.location,
          });
          savedImgs.push(savedImg);
        }
      }

      // 상품 정보 업데이트
      await product.update(
        { title, content, price, category, status },
        { where: { id: productId } }
      );

      const updatedProduct = await product.findOne({
        attributes: [
          "id",
          "seller_id",
          "title",
          "content",
          "price",
          "category",
          "status",
        ],
        where: { id: productId },
      });

      res.json({
        result: true,
        message: "상품 정보가 수정되었습니다.",
        updated: updatedProduct,
        savedThumbnail,
        savedImgs,
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  }
);
/************************************ 상품 수정 END ************************************/

/************************************ 상품 목록 조회 ************************************/

/** 조회 조건 요약 */
function sumUpCondition(whereCondition, productId, sellerId, category, state) {
  if (!isEmptyOrSpaces(productId)) {
    whereCondition.id = productId;
  }
  if (!isEmptyOrSpaces(sellerId)) {
    whereCondition.seller_id = sellerId;
  }
  if (!isEmptyOrSpaces(category)) {
    whereCondition.category = category;
  }
  if (!isEmptyOrSpaces(state)) {
    whereCondition.status = parseInt(state);
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

/** 정렬 순서 조건 요약 */
function sumUpOrderCondition(orderCondition, order) {
  switch (order) {
    case "ASCPRICE": // 가격 낮은 순
      orderCondition.push(["price", "ASC"]);
      break;
    case "DESCPRICE": // 가격 높은 순
      orderCondition.push(["price", "DESC"]);
      break;
    case "LATEST": // 최신 업데이트 순
      orderCondition.push(["updated_at", "DESC"]);
      break;
    case "VIEW": // 조회수 높은 순
      orderCondition.push(["view", "DESC"]);
      break;
    case "LIKE": // 찜 많은 순
      orderCondition.push(["like", "DESC"]);
      break;
    default:
      break;
  }
}

/** 각 조건은 AND 연산 */
router.get("/searchList", async (req, res, next) => {
  const {
    productId,
    sellerId,
    keyword,
    category,
    state,
    order,
    limit,
    pageNum,
  } = req.query;

  console.log("keyword: ", keyword);
  console.log("order: ", order);
  let whereCondition = {};
  const pageCondition = {};
  const orderCondition = [];

  sumUpCondition(whereCondition, productId, sellerId, category, state);
  if (!isEmptyOrSpaces(keyword)) {
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        { title: { [Op.substring]: keyword } },
        { content: { [Op.substring]: keyword } },
      ],
    };
  }
  sumUpPageCondition(pageCondition, limit, pageNum);
  sumUpOrderCondition(orderCondition, order);

  try {
    let foundProducts;
    if (_.isEmpty(pageCondition)) {
      foundProducts = await product.findAll({
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
        where: whereCondition,
        order: orderCondition,
        include: [
          {
            model: product_Image,
            as: "product_Images",
            attributes: ["key", "image_url", "image_type"],
            required: true,
          },
        ],
      });
    } else {
      foundProducts = await product.findAll({
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
        where: whereCondition,
        order: orderCondition,
        limit: parseInt(pageCondition.limit),
        offset: parseInt(pageCondition.offset),
        include: [
          {
            model: product_Image,
            as: "product_Images",
            attributes: ["key", "image_url", "image_type"],
            required: true,
          },
        ],
      });
    }

    const totalCount = await product.count({
      where: whereCondition,
    });

    res.json({
      result: true,
      message: "상품 목록 검색이 완료되었습니다.",
      found: foundProducts,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 상품 목록 조회 END ************************************/

/************************************ 상품 조회 ************************************/
router.get("/searchOne", async (req, res, next) => {
  const { productId } = req.query;

  if (isEmptyOrSpaces(productId)) {
    return res.json({
      result: false,
      message: "요청사항에 조회할 상품의 ID가 입력되지 않았습니다.",
    });
  }

  try {
    await product.increment("view", {
      where: {
        id: productId,
      },
    });

    const foundProduct = await product.findOne({
      attributes: [
        ["id", "product_id"],
        "seller_id",
        "title",
        "content",
        "price",
        "category",
        "view",
        "like",
        "status",
        "updated_at",
      ],
      where: { id: productId },
      include: [
        {
          model: product_Image,
          as: "product_Images",
          attributes: ["key", "image_url", "image_type"],
          required: true,
        },
      ],
    });

    res.json({
      result: true,
      message: "상품 조회가 완료되었습니다.",
      found: foundProduct,
    });
  } catch (error) {
    console.error(error);
    return next(error);
  }
});
/************************************ 상품 조회 END ************************************/

module.exports = router;
