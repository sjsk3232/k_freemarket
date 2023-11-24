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
          model: "chat_room",
          key: "id",
        },
      },
      sender_id: {
        type: DataTypes.STRING(15),
        allowNull: true,
        references: {
          model: "user",
          key: "id",
        },
      },
      content: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      unread: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
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
      updatedAt: false,
      indexes: [
        {
          name: "PRIMARY",
          unique: true,
          using: "BTREE",
          fields: [{ name: "id" }],
        },
        {
          name: "chat_message_ibfk_1_idx",
          using: "BTREE",
          fields: [{ name: "chat_room_id" }],
        },
        {
          name: "chat_message_ibfk_2_idx",
          using: "BTREE",
          fields: [{ name: "sender_id" }],
        },
      ],
    }
  );
};
