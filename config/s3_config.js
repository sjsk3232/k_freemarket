const env = process.env;

const config = {
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: env.ACCESS_KEY_ID,
    secretAccessKey: env.SECRET_ACCESS_KEY,
  },
};

module.exports = config;
