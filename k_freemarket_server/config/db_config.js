const dotenv = require("dotenv");
dotenv.config();
const env = process.env;

const config = {
  username: env.DB_USER,
  password: env.DB_PW,
  database: env.DB_NAME,
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
  timezone: "+09:00",
  dialectOptions: {
    charset: "utf8mb4",
    dateStrings: true,
    typeCast: true,
  },
};

module.exports = config;
