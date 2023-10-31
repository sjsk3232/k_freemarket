const passport = require("passport");
const local = require("./localStrategy");
const { db } = require("../models");
const { user } = db;

module.exports = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id); // 두번 째 인수가 deserializeUser의 id가 된다
  });

  passport.deserializeUser((id, done) => {
    user
      .findOne({
        where: { id },
      })
      .then((user) => done(null, user)) // user를 req.user에 저장
      .catch((err) => done(err));
  });

  local();
};
