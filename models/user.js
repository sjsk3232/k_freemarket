const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "user",
    {
      id: {
        type: DataTypes.STRING(15),
        allowNull: false,
        primaryKey: true,
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      author: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      email: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      mobile: {
        type: DataTypes.STRING(11),
        allowNull: false,
      },
      rating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
      updatedAt: {
        field: "updated_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "user",
      hasTrigger: true,
      timestamps: true,
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
