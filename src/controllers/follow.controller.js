import { Follow } from "../models/follow.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const followUser = asyncHandler(async (req, res) => {
    //take userId of current user from req.user
    //pass userId of user whom to follow by req.params
    //create new object and return as response
    const checkFollowed = await Follow.findOne({
        $and:[{user:req.params?.Id},{follower:req.user?._id}]
    })

    if (checkFollowed) {
        throw new ApiError(400,"You have already followed")
    }

    const addFollower = await Follow.create({
        user: req.params?.Id,            //The person(A) whom to follow
        follower:req.user?._id           //The person(B) who is following that user(A)
    })

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                addFollower,
                "Followed successfully"
        )
    )
})

const unFollowUser = asyncHandler(async (req, res) => {
    //take userId of current user from req.user
    //pass userId of user whom to follow by req.params
    //find the object from database and delete
    
    await Follow.findOneAndDelete({
        $and:[{user:req.params?.Id},{follower:req.user?._id}]
    })
    

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Unfollowed successfully"
        )
    )
})

export { followUser, unFollowUser };

