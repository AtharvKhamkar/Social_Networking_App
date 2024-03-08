import { Router } from "express";
import { uploadPost } from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/upload").post(upload.fields([
    {
        name: "content",
        maxCount:10
    }
]),verifyJWT,uploadPost)

export default router;