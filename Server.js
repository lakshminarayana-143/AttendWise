
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const connectDB = require("./config/db");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

// HOME ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    message: "AttendWise Attendance Management API is running",
  });
});

// REGISTER ROUTE
app.post("/register", async (req, res) => {
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
    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }

    // Validate email format
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Validate password
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    // Roles must match the User schema
    if (!["faculty", "student"].includes(role)) {
      return res.status(400).json({
        message: "Role must be faculty or student",
      });
    }

    // Student-specific validation
    if (role === "student" && !studentId?.trim()) {
      return res.status(400).json({
        message: "Student ID is required for students",
      });
    }

    // Validate year if supplied
    if (
      role === "student" &&
      year !== undefined &&
      (!Number.isInteger(Number(year)) || Number(year) < 1)
    ) {
      return res.status(400).json({
        message: "Year must be a positive integer",
      });
    }

    // Check for an existing email
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Check for an existing student ID
    if (role === "student") {
      const existingStudent = await User.findOne({
        studentId: studentId.trim(),
      });

      if (existingStudent) {
        return res.status(409).json({
          message: "Student ID is already registered",
        });
      }
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      studentId:
        role === "student" ? studentId.trim() : undefined,
      department: department?.trim() || undefined,
      year:
        role === "student" && year !== undefined
          ? Number(year)
          : undefined,
    });

    // Never return the password or password hash
    return res.status(201).json({
      message: "Registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentId: newUser.studentId,
        department: newUser.department,
        year: newUser.year,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handles concurrent duplicate registration attempts
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or student ID is already registered",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid user data",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Start server only after database connection succeeds
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`AttendWise server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start AttendWise:", error.message);
    process.exit(1);
  }
};

startServer();
