
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// SIGNUP CONTROLLER
const SignUp = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      studentId,
      department,
      year,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    // Validate role
    if (!["faculty", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be faculty or student",
      });
    }

    // Validate student ID
    if (role === "student" && !studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      studentId: role === "student" ? studentId : undefined,
      department,
      year: role === "student" ? year : undefined,
    });

    // Send response without password
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { SignUp };
