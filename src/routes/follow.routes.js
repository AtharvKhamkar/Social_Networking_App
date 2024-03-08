import { Router } from "express";
import { followUser, unFollowUser } from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/add-follower/:Id").post(verifyJWT, followUser)
router.route("/unfollow/:Id").delete(verifyJWT,unFollowUser)

export default router;