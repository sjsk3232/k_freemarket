const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "report_reply",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      report_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "report",
          key: "id",
        },
      },
      reply_id: {
        type: DataTypes.STRING(15),
        allowNull: false,
        references: {
          model: "user",
          key: "id",
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "report_reply",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "report_id",
          using: "BTREE",
          fields: [{ name: "report_id" }],
        },
        {
          name: "reply_id",
          using: "BTREE",
          fields: [{ name: "reply_id" }],
        },
      ],
    }
  );
};
