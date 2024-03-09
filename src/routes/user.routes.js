import { Router } from "express";
import { allUserPost, deleteUserProfile, getFollowDetails, getFollowingDetails, loginUser, logoutUser, registerUser, updateProfile, userDetails, userFeed } from "../controllers/user.controller.js";
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
router.route("/logout").post(upload.none(), verifyJWT, logoutUser)
router.route("/delete-profile").delete(verifyJWT,deleteUserProfile)
router.route("/profile").get(upload.none(), verifyJWT, userDetails)
router.route("/update-profile").put(
    upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),verifyJWT,updateProfile
)
router.route("/user-posts").get(upload.none(), verifyJWT, allUserPost)
router.route("/followers").get(verifyJWT, getFollowDetails)
router.route("/following").get(verifyJWT, getFollowingDetails)
router.route("/").get(verifyJWT,userFeed)

export default router
