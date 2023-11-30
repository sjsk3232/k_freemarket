const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const morgan = require("morgan");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const chatWebSocket = require("./modules/chat_socket");
const chatRouter = require("./routes/chat");
const authRouter = require("./routes/auth");
const memberRouter = require("./routes/member");
const sanctionRouter = require("./routes/sanction");
const reportRouter = require("./routes/report");
const productRouter = require("./routes/product");
const wishListRouter = require("./routes/wish_list");
const transactionRouter = require("./routes/transaction");
const reviewRouter = require("./routes/review");
const passportConfig = require("./passport");
const { sequelize } = require("./models");

const app = express();
passportConfig();
app.set("port", process.env.PORT || 8000);
app.use(
  cors({
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("데이터베이스 연결 성공");
  })
  .catch((err) => {
    console.error(err);
  });
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
    },
  })
);
app.use(
  rateLimit({
    windowMs: 10 * 1000, // 10 seconds
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRouter);
app.use("/member", memberRouter);
app.use("/sanction", sanctionRouter);
app.use("/report", reportRouter);
app.use("/product", productRouter);
app.use("/transaction", transactionRouter);
app.use("/wishList", wishListRouter);
app.use("/review", reviewRouter);
app.use("/chat", chatRouter);

app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.status(err.status || 500).send(err.message);
});

const server = app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중");
});

chatWebSocket(server, app);
