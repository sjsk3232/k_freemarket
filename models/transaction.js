const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "transaction",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "product",
          key: "id",
        },
      },
      seller_id: {
        type: DataTypes.STRING(15),
        allowNull: false,
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
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "transaction",
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
          name: "product_id",
          using: "BTREE",
          fields: [{ name: "product_id" }],
        },
        {
          name: "seller_id",
          using: "BTREE",
          fields: [{ name: "seller_id" }],
        },
        {
          name: "buyer_id",
          using: "BTREE",
          fields: [{ name: "buyer_id" }],
        },
      ],
    }
  );
};
