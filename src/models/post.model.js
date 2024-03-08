import mongoose, { Schema } from "mongoose";

const postSchema = new Schema({
    content: {
        type: String,
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "Users"
    },
    description: {
        type: String,
        required:true
    }
}, { timestamps: true })

export const Post = mongoose.model("Post", postSchema);