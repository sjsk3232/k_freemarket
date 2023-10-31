const _ = require("lodash");

/** null or undefined or whitespace 확인 */
module.exports.isEmptyOrSpaces = (str) => {
  return _.isEmpty(_.trim(str));
};
