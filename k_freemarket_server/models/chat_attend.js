const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "chat_attend",
    {
      attend_id: {
        type: DataTypes.STRING(15),
        allowNull: false,
        primaryKey: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      chat_room_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: "chat_room",
          key: "id",
        },
      },
    },
    {
      sequelize,
      tableName: "chat_attend",
      timestamps: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "attend_id" }, { name: "chat_room_id" }],
        },
        {
          name: "chat_room_id",
          using: "BTREE",
          fields: [{ name: "chat_room_id" }],
        },
      ],
    }
  );
};
