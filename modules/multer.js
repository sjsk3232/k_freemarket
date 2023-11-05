const multer = require("multer");
const multerS3 = require("multer-s3");
const { s3 } = require("./s3");
const { genRandomNum } = require("../util");

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(
        null,
        `${genRandomNum(1000, 9999)}_${Date.now()}_${file.originalname}`
      ); // 파일 Key 설정
    },
  }),
});

module.exports = upload;
