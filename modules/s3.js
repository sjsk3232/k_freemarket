const { S3 } = require("@aws-sdk/client-s3");
const config = require("../config/s3_config");

const s3 = new S3(config);

module.exports = s3;
