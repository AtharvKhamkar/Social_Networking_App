import { Router } from "express";
import { followUser } from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/add-follower/:Id").post(verifyJWT, followUser)

export default router;