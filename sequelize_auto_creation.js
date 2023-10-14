const dotenv = require("dotenv");
dotenv.config();
const env = process.env;
const seqAuto = require("sequelize-auto");
const auto = new seqAuto(env.DB_NAME, env.DB_USER, env.DB_PW, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: env.DB_DIALECT,
});

auto.run((err) => {
  if (err) throw err;
});
