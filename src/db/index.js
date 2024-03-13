import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async ()=>{
    try{
       const connection =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\n MONGODB connected!! \n ${connection.connection.host}`) // to confirm the connection of database 
    }catch(error){
        console.log("MONGODB connection ERROR" , error)
        process.exit(1)
    }
}

export default connectDB;