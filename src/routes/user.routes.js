import { Router } from "express";
import { allUserPost, anyUserPostDetails, anyUserProfileDetails, deleteUserProfile, forgotPassword, getFollowDetails, getFollowingDetails, loginUser, logoutUser, refreshAccessToken, registerUser, resetPassword, suggestFriends, updateProfile, userDetails, userFeed } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkCache } from "../middlewares/cache.middleware.js";
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
router.route("/refresh-token").post(upload.none(), refreshAccessToken)
router.route("/forgot-password").patch(upload.none(),forgotPassword)
router.route("/reset-password/:token").patch(upload.none(),resetPassword)
router.route("/delete-profile").delete(verifyJWT,deleteUserProfile)
router.route("/profile").get(upload.none(), verifyJWT, checkCache("userDetails"), userDetails)
router.route("/suggest-friends").get(verifyJWT,suggestFriends)
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
router.route("/user-posts").get(upload.none(), verifyJWT, checkCache("allUserPost"), allUserPost)
router.route("/user-posts/:_id").get(verifyJWT,anyUserPostDetails)
router.route("/followers").get(verifyJWT,checkCache("getFollowDetails"),getFollowDetails)
router.route("/following").get(verifyJWT,checkCache("getFollowingDerails"),getFollowingDetails)
router.route("/").get(verifyJWT, checkCache("userFeed"), userFeed)
router.route("/:userName").get(verifyJWT,anyUserProfileDetails)


export default router
