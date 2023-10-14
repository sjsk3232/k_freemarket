const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
const env = process.env;

const smtpTransport = nodemailer.createTransport({
  service: "naver",
  host: "smtp.naver.com",
  port: 465,
  secure: false,
  requireTLS: true,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PW,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = smtpTransport;
