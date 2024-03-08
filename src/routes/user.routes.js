import { Router } from "express";
import { loginUser, registerUser, userDetails } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/register")
    .post(upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]), registerUser)

router.route("/login").post(upload.none(), loginUser)
router.route("/profile").get(upload.none(),verifyJWT,userDetails)

export default router
