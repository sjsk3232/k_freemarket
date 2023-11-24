const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "chat_room",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      seller_check: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      buyer_check: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      seller_unread: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      buyer_unread: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "chat_room",
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
      ],
    }
  );
};
