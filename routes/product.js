const express = require("express");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifySanctionedToken } = require("./middlewares");
const { Op, fn, col } = require("sequelize");
const { db } = require("../models");
const { user, user_sanction } = db;
const s3 = require("../modules/s3");
const upload = require("../modules/multer");

const router = express.Router();

/************************************ 상품 등록 ************************************/
const uploadImages = upload.fields([{ name: "thumbnail" }, { name: "img" }]);

router.post(
  "/sell",
  verifySanctionedToken,
  uploadImages,
  async (req, res, next) => {
    res.json({
      result: true,
      message: "상품이 등록되었습니다.",
      imgs: req.files,
    });
  }
);
/************************************ 상품 등록 END ************************************/

/************************************ 상품 삭제 ************************************/

/************************************ 상품 삭제 END ************************************/

/************************************ 상품 수정 ************************************/

/************************************ 상품 수정 END ************************************/

module.exports = router;
