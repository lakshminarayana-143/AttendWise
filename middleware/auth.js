const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware =async(req,res,next)=>{
    const token = req.cookies.token;
    console.log(token);
    if(!token){
        return res.status(401).json({message:"Cookie not found"})
    }
    const  isValidUser = jwt.verify(token,"LUCKY123");
    console.log(isValidUser);
    if(!isValidUser){
        return res.status(401).json({message:"User session expired"})
    }
    const user = await User.findById({_id:isValidUser.id});
    console.log(user)
    req.user=user;
    next();

    
}
module.exports= authMiddleware;