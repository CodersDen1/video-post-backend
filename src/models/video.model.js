import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile:{
        type:String,
        required:true,   
    },
    thumbnail:{
        tpye:String,
        required:true
    },
    title:{
        tpye:String,
        required:true
    },
    description:{
        tpye:String,
        required:true
    },
    duration:{
        type:Number
    },
    views:{
        type: Number,
        default:0    
    },
    isPublished:{
            tpye:Boolean,
            default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},
{timestamps:true}
);

videoSchema.plugin(mongooseAggregatePaginate)

const Video = mongoose.model("Video",videoSchema);