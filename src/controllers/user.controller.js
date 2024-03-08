import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const registerUser = asyncHandler(async (req, res) => {
    const { name, userName, email, password, bio, } = req.body

    console.log(req.body);
    
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

    const user = await User.create({
        name,
        userName:userName.toLowerCase(),
        email,
        password,
        bio,
        posts:[]
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

export { registerUser };

