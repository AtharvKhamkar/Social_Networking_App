import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { redisClient } from "../config/redis.config.js";
import { Follow } from "../models/follow.model.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendEmail } from "./email.controller.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })
        return {accessToken,refreshToken}
    } catch (error) {
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Error while generating accessToken or refreshToken"
        )
    )
        
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, userName, email, password, bio, } = req.body
    
    if (
        [name, userName, email, password, bio].some((field) => 
            field?.trim() == "")
    ) {
        // throw new ApiError(400,"All fields are required")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "All fields are required"
        )
    )
        
    }

    const existedUser = await User.findOne({
        $or:[{userName},{email}]
    })

    if (existedUser) {
        // throw new ApiError(401,"user with email or username already exists")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "user with email or username already exists"
        )
    )
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
        // throw new ApiError(500,"Something went wrong while registering the user")
        return res.status(500)
        .json(
            new ApiResponse(
                500,
                null,
                "Something went wrong while registering the user"
        )
    )
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
        // throw new ApiError(400,"Username or email is required for login")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Username or email is required for login"
        )
    )

    }

    const checkUser = await User.findOne({
        $or:[{userName},{email}]
    })

    if (!checkUser) {
        // throw new ApiError(401,"Please register first")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Please register first"
        )
    )
    }

    const isPasswordValid = await checkUser.isPasswordCorrect(password);
    if (!isPasswordValid) {
        // throw new ApiError(401,"Invalid password")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Invalid password"
        )
    )
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    console.log(incomingRefreshToken)

    if (!incomingRefreshToken) {
        // throw new ApiError(401,"Invalid refresh token")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Invalid refresh token"
        )
    )
    }

    const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    const user = await User.findById(decodedRefreshToken?._id)

    if (!user) {
        // throw new ApiError(401,"Invalid user")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Invalid user"
        )
    )
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        // throw new ApiError(401,"Invalid user")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Invalid user"
        )
    )
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user?._id)
    
    const options = {
        httpOnly: true,
        secure:true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,refreshToken
                },
                "New refreshToken generated successfully"
        )
    )
})

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    const fetchedUser = await User.findOne({ email })
    if (!fetchedUser) {
        // throw new ApiError(400,"Invalid user")
        return res.status(400)
        .json(
            new ApiResponse(
                400,
                null,
                "Invalid user"
        )
    )
    }

    console.log(fetchedUser)

    const token = await fetchedUser.generatePasswordResetToken();
    await fetchedUser.save();

    console.log(fetchedUser)

    const info = `Hey please follow the given URL to reset your password.This link will only valid for next 10 min from now.<a href='https://social-networking-app.onrender.com/api/v1/users/reset-password/${token}'>Click here</>`;
    const data = {
        to: email,
        subject: "Password reset",
        text: "Hey user",
        html:info
    }
    sendEmail(data);

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                token,
                "Password reset email send successfully"
        )
    )
})

const resetPassword = asyncHandler(async (req, res) => {
    //get newPassword throgh req.body and token through req.params
    //hash token
    //retrive user from database using hashed token and resetTokenExpiry
    //if user found change password and make resetToken and expiry undefined

    const { newPassword } = req.body
    const { token } = req.params
    
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const fetchedUser = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry:{$gt:Date.now()}
    })

    if (!fetchedUser) {
        // throw new ApiError(400,"Token expired,please try again later")
        return res.status(401)
        .json(
            new ApiResponse(
                401,
                null,
                "Token expired,please try again later"
        )
    )
    }
    fetchedUser.password = newPassword
    fetchedUser.passwordResetToken = undefined
    fetchedUser.passwordResetTokenExpiry = undefined
    await fetchedUser.save()

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "password reset successfully"
        )
    )
})

const updateProfile = asyncHandler(async (req, res) => {
    const Id = req.user._id;
    const avatarLocalPath = req.files?.avatar ? req.files?.avatar[0]?.path : ""
    const coverImageLocalPath = req.files?.coverImage ? req.files?.coverImage[0]?.path : ""

    if (avatarLocalPath) {
        var avatar = await uploadOnCloudinary(avatarLocalPath)
    }

    if (coverImageLocalPath) {
        var coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }

    const modifiedProfile = await User.findByIdAndUpdate(
        Id,
        {
            $set: {
                name: req.body?.name,
                userName: req.body?.userName,
                email: req.body?.email,
                bio: req.user?.bio,
                avatar: avatar?.url,
                coverImage:coverImage?.url

            }
        },
        {
            new:true
        }
    ).select("-refreshToken -password")

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                modifiedProfile,
                "Profile updated successfully"
        )
    )

})

const deleteUserProfile = asyncHandler(async (req, res) => {
    //get userid from req.user.id
    //find userid in the database and delete
    //find all the post whose owner is given userid and delete
    //find all follow objects whose user or follwer is given userid

    const Id = req.user?._id

    const deletedUser = await User.findByIdAndDelete(Id)

    await Promise.all([
        Post.find({
            owner:Id
        }),
        Follow.find({
            $or:[{user:Id},{follower:Id}]
        })
    ])

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                { "deletedUser": deletedUser._id },
                "User profile deleted successfully"
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
        User.findById(Id).select("-password -refreshToken"),
        Follow.find({
            user:Id
        }),
        Follow.find({
            follower:Id
        })
    ])

    await redisClient.set(req.cacheKey,JSON.stringify({
        user,
        followers:followers.length,
        following: following.length,
        totalPosts:user.posts.length
    }),'EX',60)



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

const anyUserProfileDetails = asyncHandler(async (req, res) => {
    const { userName } = req.params;
    const { _id } = req.user;                 //current user ID
    
    // const user = await User.findById(Id)
    // const followers = await Follow.find({
    //     user:req.user?._id
    // })
    // const following = await Follow.find({
    //     follower:req.user?._id
    // })

    const user = await User.findOne({
        userName:userName
    }).select("-password -refreshToken");

    if (!user) {
        return res.status(404).json(
            new ApiResponse(
                404,
                null,
                "User not found"
            )
        );
    }

    let [followingStatus, followers, following] = await Promise.all([
        Follow.findOne({
            user: user._id,
            follower: _id
        }).then(follow => !!follow), 
        Follow.find({
            user:user._id
        }),
        Follow.find({
            follower:user._id
        })
    ])

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user,
                    followingStatus,
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
    const pipeline = []

    pipeline.push(
        {
            $match: {
                owner:new mongoose.Types.ObjectId(req.user?._id)
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
    )
    
    const postAggregate = Post.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit,10)
    }

    const allPosts = await Post.aggregatePaginate(postAggregate, options)
    
    await redisClient.set(req.cacheKey,JSON.stringify(allPosts),'EX',60)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                allPosts,
                "All user posts fetched"
        )
    )
})

const anyUserPostDetails = asyncHandler(async (req, res) => {
    //get all post object that match post.owner = req.user._id
    //$lookup from from user model
    //return aggregate result
    const { page = 1, limit = 2 } = req.query;
    const { _id } = req.params;
    const pipeline = [];

    pipeline.push(
        {
            $match: {
                owner:new mongoose.Types.ObjectId(_id)
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
    )

    
    
    const postAggregate = Post.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit,10)
    }

    const allPosts = await Post.aggregatePaginate(postAggregate, options)

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
    const Id = req.user?._id

    const followers = await Follow.find({ user: Id })
        .select("follower")
        .populate("follower", { userName: 1 })
    
    await redisClient.set(req.cacheKey,JSON.stringify(followers),'EX',60)

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
    const Id = req.user?._id

    const followingList = await Follow.find({ follower: Id })
        .select("user")
        .populate("user", { userName: 1 })

    await redisClient.set(req.cacheKey,JSON.stringify(followingList),'EX',60)

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
    
    const Id = req.user?._id
    const { page=1, limit=2} = req.query;
    const pipeline = [];
    const following = await Follow.find({
        follower:Id
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
                            userName: 1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first:"$owner.userName"
                    
                },
                avatar: {
                    $first:"$owner.avatar"
                }
            }
        },
        {
            $lookup: {
                from: "likes",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr:{$eq:["$post","$$postId"]}
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count:{$sum:1}
                        }
                    }
                ],
                as:"like_count"
            }
        },
        {
            $addFields: {
                like_count: {
                    $cond: {
                        if: { $gt: [{ $size: "$like_count" }, 0] },
                        then: { $arrayElemAt: ["$like_count.count", 0] },
                        else:0
                    }
                }
            }
        },
        {
            $lookup: {
                from: "likes",
                let: { postId: "$_id", userId: req.user._id },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$post", "$$postId"] },
                                    { $eq: ["$likedBy","$$userId"] }
                                ]
                            }
                        }
                    }
                ],
                as:"like_status"
            }
        },
        {
            $addFields: {
                like_status: {
                    $cond: {
                        if: { $gt: [{ $size: "$like_status" }, 0] },
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
            $lookup: {
                from: "comments",
                let: { commentId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr:{$eq:["$post","$$commentId"]}
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            count:{$sum:1}
                        }
                    }
                ],
                as:"comment_count"
            }
        },
        {
            $addFields: {
                comment_count: {
                    $cond: {
                        if: { $gt: [{ $size: "$comment_count" }, 0] },
                        then: { $arrayElemAt: ["$comment_count.count", 0] },
                        else:0
                    }
                }
            }
        }
    )

    
    
    const feedAggregate = Post.aggregate(pipeline)

    const options = {
        page: parseInt(page, 10),
        limit:parseInt(limit,10)
    }

    const feed = await Post.aggregatePaginate(feedAggregate, options)
    
    await redisClient.set(req.cacheKey,JSON.stringify(feed),'EX',60)

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                feed,
                "Successfully fetched posts"
        )
    )
})

const suggestFriends = asyncHandler(async (req, res) => {

    const { page=1, limit=5 } = req.params;
    const { _id } = req.user;
    const pipeline = [];

    const following = await Follow.find({
        follower:_id
    })

    const followingUsernames = following.map((item) => item.user)

    pipeline.push(
        {
            $match: {
                _id:{$nin:followingUsernames}
            }
        },
    )

    const suggestAggregate = User.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit:parseInt(limit,10)
    }

    const suggest = await User.aggregatePaginate(suggestAggregate, options);



    
    const users = await User.find({}).select("-refreshToken -password")

    return res.status(200)
        .json(
            new ApiResponse(
                200,
                suggest,
                "All suggested user fetched successfully"
        )
    )
})

export { allUserPost, anyUserPostDetails, anyUserProfileDetails, deleteUserProfile, forgotPassword, getFollowDetails, getFollowingDetails, loginUser, logoutUser, refreshAccessToken, registerUser, resetPassword, suggestFriends, updateProfile, userDetails, userFeed };

