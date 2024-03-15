import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";

const app = express();

app.use(morgan('dev'))

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({
    limit:"16kb"
}))

app.use(express.urlencoded({
    extended:true,limit:"16kb"
}))

app.use(express.static("public"))

app.use(cookieParser())

app.use(limiter)


//routes import
import { limiter } from "./config/ratelimiter.config.js";
import followRouter from "./routes/follow.routes.js";
import postRouter from "./routes/post.routes.js";
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users",userRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/follow",followRouter)

export { app };
