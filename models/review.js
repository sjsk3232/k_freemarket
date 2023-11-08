const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "review",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "transaction",
          key: "id",
        },
      },
      writer_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      shop_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      rating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
      },
      content: {
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
      tableName: "review",
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
          name: "transaction_id",
          using: "BTREE",
          fields: [{ name: "transaction_id" }],
        },
      ],
    }
  );
};
