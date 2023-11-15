const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const { db } = require("../models");
const { user } = db;

module.exports = () => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "id",
        passwordField: "password",
      },
      async (id, password, done) => {
        try {
          const exUser = await user.findByPk(id);
          if (exUser) {
            //비밀번호 검증
            const result = await bcrypt.compare(password, exUser.password);
            if (result) {
              done(null, exUser);
            } else {
              done(null, false, {
                result: false,
                message: "비밀번호가 일치하지 않습니다.",
              });
            }
          } else {
            done(null, false, {
              result: false,
              message: "가입되지 않은 회원입니다.",
            });
          }
        } catch (error) {
          console.error(error);
          done(error);
        }
      }
    )
  );
};
