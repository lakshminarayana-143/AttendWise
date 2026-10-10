
const express = require("express");
const router = express.Router();

const AuthController = require("../../controller/AuthController");

// Signup route
router.post("/SignUp", AuthController.SignUp);

module.exports = router;
