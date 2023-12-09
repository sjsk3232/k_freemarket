const { S3 } = require("@aws-sdk/client-s3");
const config = require("../config/s3_config");

const s3 = new S3(config);

const removeObjects = (removeKeys) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Delete: {
      Objects: removeKeys,
      Quiet: false,
    },
  };
  s3.deleteObjects(params, (err, data) => {
    if (err) console.log(err, err.stack);
    else console.log(data);
  });
};

module.exports = { s3, removeObjects };
