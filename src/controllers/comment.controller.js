import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const uploadComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;               //post Id that will be provided through url using req.params
    const { _id } = req.user;                //user Id that will be provided using token i.e verifyJWT

    const createdComment = await Comment.create({
        post: postId,
        content,
        commentBy:_id
    })
    
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                createdComment,
                "Successfully added comment"
        )
    )

})

const fetchComment = asyncHandler(async (req, res) => {
    const { Id } = req.params;

    const fetchedComment = await Comment.findById({
        _id:Id
    })

    if (!fetchedComment) {
        // throw new ApiError(400,"Comment not found")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Comment not found"
        )
    )
        
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                fetchedComment,
                "Comment fetched successfully"
        )
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { Id } = req.params;
    const { newContent } = req.body; 

    const existingComment = await Comment.findById(Id);

    if (!existingComment) {
        // throw new ApiError(400,"Comment not found")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Comment not found"
        )
    )
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        Id,
        {
            $set: {
                content:newContent
            }
        },
        {
            new:true
        }
    ) 

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully"
        )
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { Id } = req.params;

    const isOwner = await Comment.findOne({
        commentBy: req.user?._id
    });

    if (!isOwner) {
        // throw new ApiError(400,"Oly owner can delete comment")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Comment not found"
        )
    )
    }

    await Comment.findByIdAndDelete(Id)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Successfully deleted comment"
        )
    )
})

const fetchPostComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;


    const postComments = await Comment.aggregate([
        {
            $match: {
                post:new mongoose.Types.ObjectId(postId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "commentBy",
                foreignField: "_id",
                as: "commentBy",
                pipeline: [
                    {
                        $project: {
                            userName:1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                commentBy: {
                    $first:"$commentBy.userName"
                }
            }
        }
    ])


    return res.status(200)
        .json(
            new ApiResponse(
                200,
                postComments,
                "Post comments fetched successfully"
        )
    )
})

export { deleteComment, fetchComment, fetchPostComment, updateComment, uploadComment };

