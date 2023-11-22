const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "user_sanction",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      author_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      target_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      target_email: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      expire_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: "9999-12-31 00:00:00",
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "user_sanction",
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
          name: "author_id",
          using: "BTREE",
          fields: [{ name: "author_id" }],
        },
        {
          name: "target_id",
          using: "BTREE",
          fields: [{ name: "target_id" }],
        },
      ],
    }
  );
};
