const express = require("express");

const router = express.Router();

const AuthController = require("../../controller/AuthController");
const authMiddleware = require("../../middleware/auth");

// Student registration
router.post("/SignUp", AuthController.SignUp);

// Faculty registration
router.post("/FacultySignUp", AuthController.FacultySignUp);

// Login
router.post("/Login", AuthController.Login);

// Logout
router.post("/Logout", AuthController.Logout);

// Get currently authenticated user
router.get("/Me", authMiddleware, AuthController.Me);

module.exports = router;