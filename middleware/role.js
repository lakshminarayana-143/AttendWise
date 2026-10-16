const roleMiddleware = (...allowedRoutes)=>{
    return (req,res,next)=>{
        if(req.user){
         return   res.status(401).json({message :"Authentiacation required"});
        }
        if(!allowedRoutes.includes(req.user.role)){
            return res.status(403).json({message :"Access Denied , You do not have permission"})

        }
        next();
    }
}
module.exports = roleMiddleware;