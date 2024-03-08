import { Post } from "../models/post.model.js";
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

export { uploadPost };
