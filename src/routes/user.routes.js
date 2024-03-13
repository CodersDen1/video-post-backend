import { Router } from "express";
import { changePassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatarImage } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }

    ]),
    registerUser
    )


    router.route("/login").post(loginUser)
    //secured routes
    router.route("/logout").post(verifyJwt,logoutUser)
    router.route("/refresh-token").post(refreshAccessToken)
    router.route("/current-user").get(verifyJwt,getCurrentUser)
    router.route("/update-password").patch(verifyJwt,changePassword)
    router.route("/update-account").patch(verifyJwt,updateAccountDetails)
    router.route("/update-avatar").patch(upload.fields({
                name:"avatar",
                maxCount:1
            }),
            updateAvatarImage)

    router.route("/watch").get(verifyJwt,getWatchHistory)
    router.route("/c/:username").get(verifyJwt,getUserChannelProfile)        
export default router;
