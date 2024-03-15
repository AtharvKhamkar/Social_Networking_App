import { Redis } from "ioredis";

export const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    tls:process.env.REDIS_HOST

})


redisClient.connect(()=>console.log("redis connected"))