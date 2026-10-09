// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const user = require("../models/User")
 
// // REGISTER 
// const register = async(req,res)=>{
//     try{
//         const{name,email,password,role,studentId,department ,year} = req.body;
//         if(!name||!email||!password||!role){
//             return res.status(400).json({message :"Name email password and role fields required"})

//         }
//         if(!["Faculty","Student"].includes(role)){
//             return res.status(400).json({message :"Inavlid Role"})
//         } 
//         const existingUser = await user.findOne({email : email.toLowercase()});
//         if(existingUser){
//             return res.status(409).json({message : "User already exists"})
//         }
//         const hashPassword = await bcrypt.hash(password , 10);
//         const user = await user.create({
//             name,
//             password : hashPassword,
//             email : email.toLowerCase(),
//             role ,
//             studentId : role=== "student"? studentId : undefined ,
//             department ,
//             year ,
//         });
//         res.status(201).json({message : "Registered Successfully",user:{
//             id : user._id ,
//             name : user.name ,
//             email :user.email,
//             role : user.role ,
//         },
//     });
    
// }catch(error){
//     console.error("registration error",error);
//     res.status(500).json({message : "server error"});


//     }
// };