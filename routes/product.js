const express = require("express");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifySanctionedToken } = require("./middlewares");
const { Op, fn, col } = require("sequelize");
const { db } = require("../models");
const { user, user_sanction, product, product_Image } = db;
const { s3, removeObjects } = require("../modules/s3");
const upload = require("../modules/multer");

const router = express.Router();

/************************************ 상품 등록 ************************************/
const uploadImages = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "img", maxCount: 5 },
]);

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
      const removeKeys = [];

      for (const key in req.files) {
        req.files[key].forEach((item) => {
          removeKeys.push({ Key: item.key });
        });
      }

      removeObjects(removeKeys);

      return res.json({
        result: false,
        message: "상품 등록 필수 항목이 입력되지 않았습니다.",
      });
    }

    try {
      createdProduct = await product.create({
        seller_id: req.decoded.id,
        title,
        content,
        price: parseInt(price),
        category,
      });
      console.log("created:", createdProduct);

      let thumbnail;
      let i = 0;
      if (!req.files["thumbnail"]) {
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
        message: "삭제 대상 상품이 존재하지 않습니다.",
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

    const removeKeys = [];

    for (const product_Image of target_imgs) {
      removeKeys.push({ Key: product_Image.key });
    }

    removeObjects(removeKeys);

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

/************************************ 상품 수정 END ************************************/

/************************************ 상품 조회 ************************************/

/************************************ 상품 조회 END ************************************/

module.exports = router;
