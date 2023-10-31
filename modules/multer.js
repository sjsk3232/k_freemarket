const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3 } = require("@aws-sdk/client-s3");
const config = require("../config/s3_config");

const s3 = new S3(config);

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "fm-img-bucket",
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${Date.now()}_${file.originalname}`); // 이름 설정
    },
  }),
});

module.exports = upload;
