var DataTypes = require("sequelize").DataTypes;
var _chat_attend = require("./chat_attend");
var _chat_message = require("./chat_message");
var _chat_room = require("./chat_room");
var _product = require("./product");
var _product_Image = require("./product_Image");
var _report = require("./report");
var _report_reply = require("./report_reply");
var _review = require("./review");
var _transaction = require("./transaction");
var _user = require("./user");
var _user_sanction = require("./user_sanction");
var _wish_list = require("./wish_list");

function initModels(sequelize) {
  var chat_attend = _chat_attend(sequelize, DataTypes);
  var chat_message = _chat_message(sequelize, DataTypes);
  var chat_room = _chat_room(sequelize, DataTypes);
  var product = _product(sequelize, DataTypes);
  var product_Image = _product_Image(sequelize, DataTypes);
  var report = _report(sequelize, DataTypes);
  var report_reply = _report_reply(sequelize, DataTypes);
  var review = _review(sequelize, DataTypes);
  var transaction = _transaction(sequelize, DataTypes);
  var user = _user(sequelize, DataTypes);
  var user_sanction = _user_sanction(sequelize, DataTypes);
  var wish_list = _wish_list(sequelize, DataTypes);

  product.belongsToMany(user, {
    as: "user_id_users",
    through: wish_list,
    foreignKey: "product_id",
    otherKey: "user_id",
  });
  user.belongsToMany(product, {
    as: "product_id_products",
    through: wish_list,
    foreignKey: "user_id",
    otherKey: "product_id",
  });
  chat_attend.belongsTo(chat_room, {
    as: "chat_room",
    foreignKey: "chat_room_id",
  });
  chat_room.hasMany(chat_attend, {
    as: "chat_attends",
    foreignKey: "chat_room_id",
  });
  chat_message.belongsTo(chat_room, {
    as: "chat_room",
    foreignKey: "chat_room_id",
  });
  chat_room.hasMany(chat_message, {
    as: "chat_messages",
    foreignKey: "chat_room_id",
  });
  chat_attend.belongsTo(product, { as: "product", foreignKey: "product_id" });
  product.hasMany(chat_attend, {
    as: "chat_attends",
    foreignKey: "product_id",
  });
  product_Image.belongsTo(product, { as: "product", foreignKey: "product_id" });
  product.hasMany(product_Image, {
    as: "product_Images",
    foreignKey: "product_id",
  });
  transaction.belongsTo(product, { as: "product", foreignKey: "product_id" });
  product.hasMany(transaction, {
    as: "transactions",
    foreignKey: "product_id",
  });
  wish_list.belongsTo(product, { as: "product", foreignKey: "product_id" });
  product.hasMany(wish_list, { as: "wish_lists", foreignKey: "product_id" });
  report_reply.belongsTo(report, { as: "report", foreignKey: "report_id" });
  report.hasMany(report_reply, {
    as: "report_replies",
    foreignKey: "report_id",
  });
  review.belongsTo(transaction, {
    as: "transaction",
    foreignKey: "transaction_id",
  });
  transaction.hasOne(review, { as: "review", foreignKey: "transaction_id" });
  chat_attend.belongsTo(user, { as: "seller", foreignKey: "seller_id" });
  user.hasMany(chat_attend, { as: "chat_attends", foreignKey: "seller_id" });
  chat_attend.belongsTo(user, { as: "buyer", foreignKey: "buyer_id" });
  user.hasMany(chat_attend, {
    as: "buyer_chat_attends",
    foreignKey: "buyer_id",
  });
  chat_message.belongsTo(user, { as: "sender", foreignKey: "sender_id" });
  user.hasMany(chat_message, { as: "chat_messages", foreignKey: "sender_id" });
  product.belongsTo(user, { as: "seller", foreignKey: "seller_id" });
  user.hasMany(product, { as: "products", foreignKey: "seller_id" });
  report.belongsTo(user, { as: "reporter", foreignKey: "reporter_id" });
  user.hasMany(report, { as: "reports", foreignKey: "reporter_id" });
  report_reply.belongsTo(user, { as: "reply", foreignKey: "reply_id" });
  user.hasMany(report_reply, { as: "report_replies", foreignKey: "reply_id" });
  review.belongsTo(user, { as: "writer", foreignKey: "writer_id" });
  user.hasMany(review, { as: "reviews", foreignKey: "writer_id" });
  review.belongsTo(user, { as: "shop", foreignKey: "shop_id" });
  user.hasMany(review, { as: "shop_reviews", foreignKey: "shop_id" });
  transaction.belongsTo(user, { as: "seller", foreignKey: "seller_id" });
  user.hasMany(transaction, { as: "transactions", foreignKey: "seller_id" });
  transaction.belongsTo(user, { as: "buyer", foreignKey: "buyer_id" });
  user.hasMany(transaction, {
    as: "buyer_transactions",
    foreignKey: "buyer_id",
  });
  user_sanction.belongsTo(user, { as: "author", foreignKey: "author_id" });
  user.hasMany(user_sanction, {
    as: "user_sanctions",
    foreignKey: "author_id",
  });
  user_sanction.belongsTo(user, { as: "target", foreignKey: "target_id" });
  user.hasMany(user_sanction, {
    as: "target_user_sanctions",
    foreignKey: "target_id",
  });
  wish_list.belongsTo(user, { as: "user", foreignKey: "user_id" });
  user.hasMany(wish_list, { as: "wish_lists", foreignKey: "user_id" });

  return {
    chat_attend,
    chat_message,
    chat_room,
    product,
    product_Image,
    report,
    report_reply,
    review,
    transaction,
    user,
    user_sanction,
    wish_list,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
