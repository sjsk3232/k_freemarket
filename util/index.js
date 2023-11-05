const _ = require("lodash");

/** null or undefined or whitespace 확인 */
module.exports.isEmptyOrSpaces = (str) => {
  return _.isEmpty(_.trim(str));
};

module.exports.genRandomNum = (min, max) => {
  const randNum = Math.floor(Math.random() * (max - min + 1)) + min;

  return randNum;
};
