
const express = require("express");
const router = express.Router();

const AuthController = require("../../controller/AuthController");

// Signup route
router.post("/SignUp", AuthController.SignUp);
 
// Login route
router.post("/Login", AuthController.Login);

module.exports = router;
