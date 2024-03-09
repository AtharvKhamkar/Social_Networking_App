import mongoose from "mongoose";
import { Follow } from "../models/follow.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(401,"Error while generating accessToken or refreshToken")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, userName, email, password, bio, } = req.body
    
    if (
        [name, userName, email, password, bio].some((field) => 
            field?.trim() == "")
    ) {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{userName},{email}]
    })

    if (existedUser) {
        throw new ApiError(401,"user with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let [avatar,coverImage] = await Promise.all([uploadOnCloudinary(avatarLocalPath),uploadOnCloudinary(coverImageLocalPath)])

    const user = await User.create({
        name,
        userName:userName.toLowerCase(),
        email,
        password,
        bio,
        posts: [],
        avatar: avatar?.url,
        coverImage:coverImage?.url
    })

    const createdUser = await User.findById(user._id).select("-password")

    if (!createdUser) {
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                createdUser,
                "User Registered Successfully"
        )
    )
})

const loginUser = asyncHandler(async (req, res) => {
    //get email,userName,password from req.body
    //check user is already exists in database
    //if exists check password is correct or not
    //if correct generate accessToken and refreshToken
    //send accessToken and refreshToken as cookie
    //send response

    const { email, userName, password } = req.body;
    if (!userName || !email) {
        throw new ApiError(400,"Username or email is required for login")
    }

    const checkUser = await User.findOne({
        $or:[{userName},{email}]
    })

    if (!checkUser) {
        throw new ApiError(401,"Please register first")
    }

    const isPasswordValid = checkUser.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401,"Invalid password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(checkUser._id)
    
    const loggedInUser = await User.findById(checkUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure : true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User loggedIn Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken:1
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken",options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged Out"   
        )
    )
})

//endpoint to get all user details like all posts,followers count,follow count
const userDetails = asyncHandler(async (req, res) => {
    const  Id  = req.user?._id;

    // const user = await User.findById(Id)
    // const followers = await Follow.find({
    //     user:req.user?._id
    // })
    // const following = await Follow.find({
    //     follower:req.user?._id
    // })

    let [user, followers, following] = await Promise.all([
        User.findById(Id),
        Follow.find({
            user:req.user?._id
        }),
        Follow.find({
            follower:req.user?._id
        })
    ])



    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                    followers:followers.length,
                    following: following.length,
                    totalPosts:user.posts.length
                },
                "User profile details fetched successfully"
        )
    )
})

const allUserPost = asyncHandler(async (req, res) => {
    //get all post object that match post.owner = req.user._id
    //$lookup from from user model
    //return aggregate result
    const { page = 1, limit = 2 } = req.query;
    const postAggregate = await Post.aggregate([
        {
            $match: {
                owner:new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            name:1
                        }
                    }
                ]
                
            }
        },
        {
            $addFields: {
                owner: {
                    $first:"$owner.name"
                }
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit,10)
    }

    const allPosts = await Post.aggregatePaginate(postAggregate,options)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                allPosts,
                "All user posts fetched"
        )
    )
})

const getFollowDetails = asyncHandler(async (req, res) => {
    const followers = await Follow.find({ user: req.user?._id })
        .select("follower")
        .populate("follower", { userName: 1 })

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    followers
                },
                "Successfully fetched follower list"
        )
    )
})

const getFollowingDetails = asyncHandler(async (req, res) => {

    const followingList = await Follow.find({ follower: req.user?._id })
        .select("user")
        .populate("user", { userName: 1 })

    

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                followingList,
                "Successfully fetched following list"
        )
    )
})

//function to get all post of the users that are followed by current user(posts of the following users)
const userFeed = asyncHandler(async (req, res) => {

    //get all the following list of the user
    //extract all users mongoDB id from the array
    //then in pipeline only select post whose owner in following list


    const { page=1, limit=2} = req.query;
    const pipeline = [];
    const following = await Follow.find({
        follower:req.user?._id
    })

    const followingUsernames = following.map((item) => item.user)

    pipeline.push(
        {
            $match: {
                owner:{$in:followingUsernames}
            }
        },
        {
            $sort: {
                createdAt:-1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
                owner: {
                    $first:"$owner.userName"
                }
            }
        }
    )

    
    
    const feedAggregate = Post.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit:parseInt(limit,10)
    }

    const feed = await Post.aggregatePaginate(feedAggregate,options)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                feed,
                "Successfully fetched posts"
        )
    )
})

export { allUserPost, getFollowDetails, getFollowingDetails, loginUser, logoutUser, registerUser, userDetails, userFeed };

