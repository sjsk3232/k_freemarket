const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("./s3");

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
      cb(null, `${Date.now()}_${file.originalname}`); // 파일 Key 설정
    },
  }),
  fileFilter: (req, file, cb) => {
    // 업로드 조건 설정
    try {
      console.log(req.body);
      if (req.body.thumbnail.length !== 1) {
        cb(new Error("썸네일 수가 1이 아닙니다."));
      } else if (req.body.img.length > 3) {
        cb(new Error("상품 이미지 수가 10개 초과했습니다."));
      } else cb(null, true);
    } catch (err) {
      console.log(err);
      cb(err);
    }
  },
});

module.exports = upload;
