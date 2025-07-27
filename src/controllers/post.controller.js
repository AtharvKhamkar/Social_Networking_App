import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const uploadPost = asyncHandler(async (req, res) => {
    //get post from local path req.files
    //get description from req.body
    //get owner from req.user
    //create post object and return response

    const { description } = req.body;
    const postLocalPath = req.files.content[0]?.path
    const content = await uploadOnCloudinary(postLocalPath);

    const post = await Post.create({
        content:content?.url,
        description,
        owner:req.user?._id
    })

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $push: {
                posts:post._id
            }
        }
    )

    const createdPost = await Post.findById(post._id)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                createdPost,
                "Post created successfully"
        )
    )
})

const updatePost = asyncHandler(async (req, res) => {
    //pass postId through req.params
    //find post available in database
    //edit post using req.body
    //return response

    const { Id } = req.params
    const contentLocalPath = req.files.content ? req.files.content[0].path : ""

    const checkPost = await Post.findById(Id);
    if (!checkPost) {
        // throw new ApiError(400, "Post not fount invalid Id")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Post not fount invalid Id"
        )
    )
    }

    if (contentLocalPath) {
        
        var content = await uploadOnCloudinary(contentLocalPath)
    }

    const modifiedPost = await Post.findByIdAndUpdate(
        Id,
        {
            $set: {
                content: content?.url,
                description:req.body?.description
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
                modifiedPost,
                "post updated Successfully"
        )
    )
})


const deletePost = asyncHandler(async (req, res) => {
    //send postId through req.params
    //delete post as per Id send response
    

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $pull: {
                posts: req.params?.Id
            }
        },
        {
            new:true
        }
    )
    
    const deletedPost = await Post.findByIdAndDelete(req.params?.Id)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                deletedPost._id,
                "Post deleted successfully"
        )
    )
})

export { deletePost, updatePost, uploadPost };

