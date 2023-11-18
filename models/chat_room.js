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
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "product",
          key: "id",
        },
      },
      seller_check: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      buyer_check: {
        type: DataTypes.BOOLEAN,
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
