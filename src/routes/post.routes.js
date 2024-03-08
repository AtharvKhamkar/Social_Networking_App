import { Router } from "express";
import { deletePost, updatePost, uploadPost } from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/upload").post(upload.fields([
    {
        name: "content",
        maxCount:10
    }
]), verifyJWT, uploadPost)
router.route("/update/:Id").put(upload.fields([
    {
        name: "content",
        maxCount:10
    }
]), verifyJWT, updatePost)

router.route("/delete/:Id").delete(verifyJWT,deletePost)

export default router;