const Sequelize = require("sequelize");
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "chat_message",
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
          model: "chat_attend",
          key: "chat_room_id",
        },
      },
      sender_id: {
        type: DataTypes.STRING(15),
        allowNull: false,
        references: {
          model: "chat_attend",
          key: "attend_id",
        },
      },
      content: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      createdAt: {
        field: "created_at",
        type: Sequelize.DATE,
      },
    },
    {
      sequelize,
      tableName: "chat_message",
      timestamps: true,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "chat_room_id",
          using: "BTREE",
          fields: [{ name: "chat_room_id" }],
        },
        {
          name: "sender_id",
          using: "BTREE",
          fields: [{ name: "sender_id" }],
        },
      ],
    }
  );
};
