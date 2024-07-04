import { Router } from "express";
import { deleteComment, fetchComment, fetchPostComment, updateComment, uploadComment } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

router.route("/:postId").post(upload.none(), verifyJWT, uploadComment);
router.route("/:postId").get(verifyJWT, fetchPostComment);
router.route("/:Id").get(verifyJWT, fetchComment);
router.route("/:Id").delete(verifyJWT, deleteComment);
router.route("/:Id").put(upload.none(), verifyJWT, updateComment);

export default router;