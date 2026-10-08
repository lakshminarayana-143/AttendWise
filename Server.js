const express = require("express");

const connectDB = require('./config/db');
const dotenv = require("dotenv")
dotenv.config()

const app = express();
connectDB();
app.get('/',(req,res)=>{
    res.json({message : "Attendance Management API is running"})

})
app.listen(3000,()=>{
    console.log("server Running on port 3000")
})