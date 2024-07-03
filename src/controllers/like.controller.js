import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const likePost = asyncHandler(async (req, res) => {
    const { Id } = req.params;

    const checkIsLiked = await Like.findOne({
        post: Id,
        likedBy: req.user?._id
    })

    if (checkIsLiked) {
        await Like.findByIdAndDelete(checkIsLiked?._id);

        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Post Disliked"
            )
        )
    } else {
        await Like.create({
            post: Id,
            likedBy: req.user?._id
        })

        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Post liked"
            )
        )
    }
})

export { likePost };
