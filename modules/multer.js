const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { s3 } = require("./s3");
const { genRandomNum } = require("../util");

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, callback) {
      callback(null, { fieldName: file.fieldname });
    },
    key: function (req, file, callback) {
      file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      );
      callback(
        null,
        `${genRandomNum(1000, 9999)}_${Date.now()}_${file.originalname}`
      ); // 파일 Key 설정
    },
  }),
  fileFilter: function (req, file, callback) {
    var ext = path.extname(file.originalname);
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".gif" && ext !== ".jpeg") {
      req.uploadError = new Error(
        "파일 확장자가 png, jpg, jpeg, gif인 파일만 업로드 가능합니다."
      );
      return callback(null, false);
    }
    callback(null, true);
  },
});

module.exports = upload;
