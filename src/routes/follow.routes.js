import { Router } from "express";
import { followUser, toggleFollowUser, unFollowUser } from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/add-follower/:Id").post(verifyJWT, followUser)
router.route("/unfollow/:Id").delete(verifyJWT, unFollowUser)
router.route("/:Id").put(verifyJWT,toggleFollowUser)

export default router;