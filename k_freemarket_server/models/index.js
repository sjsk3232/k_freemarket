const Sequelize = require("sequelize");
const config = require("../config/db_config");
const initModels = require("./init-models");

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);
const db = initModels(sequelize);

module.exports = { db, sequelize };
