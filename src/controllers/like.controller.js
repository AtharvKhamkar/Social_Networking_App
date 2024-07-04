import mongoose from "mongoose";
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

        const likeCountResult = await Like.aggregate([
            {
                $match: {
                    post:new mongoose.Types.ObjectId(Id)
                }
            },
            {
                $group: {
                    _id: null,
                    count:{$sum:1}
                }
            }
    
    
        ])

        const like_count = likeCountResult.length > 0 ? likeCountResult[0].count : 0;

        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        _id:Id,
                        like_count
                    },
                    "Post Disliked"
            )
        )
    } else {
        await Like.create({
            post: Id,
            likedBy: req.user?._id
        })

        const likeCountResult = await Like.aggregate([
            {
                $match: {
                    post:new mongoose.Types.ObjectId(Id)
                }
            },
            {
                $group: {
                    _id: null,
                    count:{$sum:1}
                }
            }
    
    
        ])
        const like_count = likeCountResult.length > 0 ? likeCountResult[0].count : 0;

        return res.status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        _id:Id,
                        like_count
                    },
                    "Post liked"
            )
        )
    }
})

export { likePost };
