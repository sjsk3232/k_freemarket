const smtpTransport = require("../config/email_config");
const dotenv = require("dotenv");
dotenv.config();
const env = process.env;

const genRandomNum = (min, max) => {
  const randNum = Math.floor(Math.random() * (max - min + 1)) + min;

  return randNum;
};

const emailAuth = async (req, res) => {
  const number = genRandomNum(1000000, 9999999);

  const email = req.body.emailId + "@kumoh.ac.kr"; //수신자 이메일 주소

  const mailOptions = {
    from: env.MAIL_USER, //발신자 이메일 주소
    to: email, //수신자 이메일 주소
    subject: "금오장터 인증 관련 메일 입니다.",
    html: "<h1>인증번호를 입력해주세요</h1>" + `<h2>${number}</h2>`,
  };

  smtpTransport.sendMail(mailOptions, (err, response) => {
    console.log("response", response);

    if (err) {
      res.json({
        result: false,
        message: "메일 전송에 실패하였습니다.",
        err: err,
      });
    } else {
      res.json({
        result: true,
        message: " 메일 전송에 성공하였습니다. ",
        authNum: number,
      });
    }
    smtpTransport.close(); //전송종료
  });
};

module.exports = emailAuth;
