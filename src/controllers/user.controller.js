import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { response } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";



//tokens methods
const generateAccessAndRefreshToken=async(userId)=>{
    try{
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken();
       const refreshToken= user.generateRefreshToken();

       user.refreshToken = refreshToken;
       await user.save({ validateBeforeSave:false });

       return {accessToken , refreshToken}

    }catch(error){
        throw new ApiError(500,"Something went Wrong creating tokens please try again later")
    }
}


 
const registerUser =  asyncHandler(async(req,res)=>{
 
    /**
     *  1.get user details from client - done 
     * validation of the data - not empty --done
     * check if user already exist : using username  
     * check for image : check if the file sxist (Avatar is there)-done
     * upload them to cloudinary, avatar  - done
     * create user object- create entry in DB 
     * remove pass and tokens field from response 
     * check for user creation 
     *  return the response in the client  
     */
   const {username , email , fullName, password} = req.body
   /**
    * console.log(`user: ${username} \n
                email: ${email} \n
                password: ${password} \n
                fullname ${fullName}`)
    * */
                if([fullName,email,username,password].some((field)=> field?.trim()==="")){
                    throw new ApiError(400 , "All fields are required")
                   }
                const existedUser = await User.findOne({
                    $or:[{ username } , { email }]})
                            
                if(existedUser){
                    throw new ApiError(409,"Already existed Username or Email")
                    }
            
                    
                const avatarLocalPath = req.files?.avatar[0]?.path;
                //const coverImageLocalPath = req.files?.coverImage[0]?.path;

                let coverImageLocalPath;
                if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
                    coverImageLocalPath = req.files.coverImage[0].path;
                }
                if(!avatarLocalPath){
                    throw new ApiError(400,"Avatar is required");
                }
                    const avatar =await uploadOnCloudinary(avatarLocalPath);
                    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
                    if(!avatar){
                        throw new ApiError(400,"Avatar is required");
                    }
                   const user = await User.create({
                            fullName,
                            avatar:avatar.url,
                            coverImage:coverImage?.url || "",
                            username: username.toLowerCase(),

                            email,
                            password
                        });
                   const createdUser = await User.findById(user._id).select(
                        "-password"
                       );
                    await generateAccessAndRefreshToken(createdUser._id);   
                   if(!createdUser) throw new ApiError(500,"Somehting went wrong while registering user");
                  
                   return res.status(201).json(
                    new ApiResponse(200,createdUser,"User Registered Successfuly")
                   ) 
                }
                )
const loginUser = asyncHandler(async (req, res) =>{
                    // req body -> data
                    // username or email
                    //find the user
                    //password check
                    //access and referesh token
                    //send cookie
                
                    const {email, username, password} = req.body
                    //console.log(email);
                
                    if (!username && !email) {
                        throw new ApiError(400, "username or email is required")
                    }
                    
                    const user = await User.findOne({
                        $or: [{username}, {email}]
                    });
                   // console.log(`---------------------------\n \n \n \n ${user}`)
                
                    if (!user) {
                        throw new ApiError(404, "User does not exist")
                    }
                
                   const isPasswordValid = await user.isPasswordCorrect(password)
                
                   if (!isPasswordValid) {
                    throw new ApiError(401, "Invalid user credentials")
                    }
                
                   const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
                
                    const loggedInUser = await User.findById(user._id).select("-password")
                
                    const options = {
                        httpOnly: true,
                        secure: true
                    }
                
                    return res
                    .status(200)
                    .cookie("accessToken", accessToken, options)
                    .cookie("refreshToken", refreshToken, options)
                    .json(
                        new ApiResponse(
                            200, 
                            {
                                user: loggedInUser, accessToken, refreshToken
                            },
                            "User logged In Successfully"
                        )
                    )
                
                })

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {

            $unset:{
                refreshToken:1
            }
    },{
        new:true
    }
    )

    const options = {
        httpOnly: true,
        secure:true    
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out!"))
})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
     
    if(!incommingRefreshToken){
        throw new ApiError(401,"UnAuthorized Request")}
   try {
     const decodedToken = jwt.verify(incommingRefreshToken,
                 process.env.REFRESH_TOKEN_SECRET
                 )
     
     const user = await User.findById(decodedToken?._id)
     if(!user){
         throw new ApiError(401,"Invalid Refresh Token Request")}
     if(incommingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token expired")
     }
 
     const options = {
         httpOnly:true,
         secure:true
 }
 
    const{accessToken,newrefreshToken}= await generateAccessAndRefreshToken(user._id)
 
     return res.status(200)
               .cookie("accessToken",accessToken,options)
               .cookie("refreshToken",newrefreshToken,options)
               .json(new ApiResponse(
                 200,
                 {
                     accessToken,
                     refreshToken:newrefreshToken,
 
                 },
                 "Access token updated "
               ) )
   } catch (error) {
    throw new ApiError(401, "Something went worng updating the token")
   }

})


const changePassword = asyncHandler(async(req,res)=>{
    const{oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect =await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
    }

    user.password= newPassword;
    const updatedPassword =await user.save({validateBeforeSave:false})
    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res.status(200)
                .json(200,req.user,"current User Fetched Successfully")

})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const{fullName } = req.body
    if(!fullName){
        throw new ApiError(400,"All Field are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {$set:{fullName:fullName}},
        {new :true}
        ).select("-password")

    return res.status(200).json(new ApiResponse(200,{user},"Account Details Updated Succesfully"))
        
})

const updateAvatarImage = asyncHandler(async(req,res)=>{

    const avatarLocalPath=req.file?.path;

    if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")    
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Somehting went wrong while upldaing the avatar") 
    }

   const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
    {
        new : true
    }).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"Avatar changed Successfuly"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;

    if(!username?.trim){
        throw new ApiError(400, "username missing ") 
    }

    const channel = await User.aggregate([
        {
            $match:{username:username},
        },
        {
            $lookup:{
                from:"subcriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                    subscribersCount:{
                        $size:"$subscirbers"
                    },
                    subscribedToCount:{
                        $size:"$subscribedTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                subscribedTOCount:1,
                email:1,
                isSubscribed:1,
                createdAt:1
            }
        }
        


])
    console.log(`---------\n------------\n-----------${channel}`)
    console.log(`---------\n------------\n-----------${channel[0]}`)
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exitss")    
    }

    return res.status(200)
                .json(new ApiResponse(200,channel[0],"User channel fetched Successfully!!"))

})


const getWatchHistory = asyncHandler(async(req,res)=>{
        const user = await User.aggregate([
            {$match:{
                _id:new mongoose.Types.ObjectId(req.user?._id)
            }},
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchhistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[{
                                    $project:{
                                        username:1,
                                        fullName:1,
                                        avatar:1
                                    }
                                }]
                            }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
                }
            }
        ])
        return res.status(200).json(new ApiResponse(
            200,user[0].watchHistory,"Watch history fetched successfully"))
})



export {registerUser, loginUser,logoutUser,refreshAccessToken,getCurrentUser, changePassword,updateAccountDetails , updateAvatarImage,getWatchHistory,getUserChannelProfile}
