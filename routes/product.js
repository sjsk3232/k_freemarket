const express = require("express");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { isEmptyOrSpaces } = require("../util");
const { verifyToken, verifySanctionedToken } = require("./middlewares");
const { Op, fn, col } = require("sequelize");
const { db } = require("../models");
const { user, user_sanction } = db;
const upload = require("../modules/multer");

const router = express.Router();

router.post("/sell", async (req, res, next) => {
  const uploadSingle = upload.single("image");
  uploadSingle(req, res, (error) => {
    if (error) {
      console.error(error);
      return res
        .status(500)
        .json({ result: false, message: "Error uploading file" });
    }
    console.log(req.file);
    res.json({ result: true, message: "", file: req.file });
  });
});

module.exports = router;
