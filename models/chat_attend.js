const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "chat_attend",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      chat_room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "chat_room",
          key: "id",
        },
      },
      seller_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      buyer_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "product",
          key: "id",
        },
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "chat_attend",
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "chat_attend_ibfk_1_idx",
          using: "BTREE",
          fields: [{ name: "chat_room_id" }],
        },
        {
          name: "chat_attend_ibfk_2_idx",
          using: "BTREE",
          fields: [{ name: "seller_id" }],
        },
        {
          name: "chat_attend_ibfk_3_idx",
          using: "BTREE",
          fields: [{ name: "buyer_id" }],
        },
        {
          name: "chat_attend_ibfk_4_idx",
          using: "BTREE",
          fields: [{ name: "product_id" }],
        },
      ],
    }
  );
};
