const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  department: user.department,
  year: user.year,
  facultyId: user.facultyId,
  isApproved: user.isApproved,
});

// STUDENT REGISTRATION
const SignUp = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      studentId,
      department,
      year,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !studentId?.trim() ||
      !department?.trim() ||
      year === undefined ||
      year === null ||
      year === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required student details.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim();

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const academicYear = Number(year);

    if (
      !Number.isInteger(academicYear) ||
      academicYear < 1 ||
      academicYear > 4
    ) {
      return res.status(400).json({
        success: false,
        message: "Academic year must be between 1 and 4.",
      });
    }

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const existingStudent = await User.findOne({
      studentId: normalizedStudentId,
      role: "student",
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "This student ID is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      studentId: normalizedStudentId,
      department: department.trim(),
      year: academicYear,

      // Never accept the role directly from public signup.
      role: "student",
      isApproved: true,
    });

    return res.status(201).json({
      success: true,
      message: "Student account created successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with these details already exists.",
      });
    }

    console.error("Student signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register student.",
    });
  }
};

// FACULTY REGISTRATION
const FacultySignUp = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      facultyId,
      department,
      invitationCode,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !facultyId?.trim() ||
      !department?.trim() ||
      !invitationCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required faculty details.",
      });
    }

    if (!process.env.FACULTY_SIGNUP_CODE) {
      return res.status(500).json({
        success: false,
        message: "Faculty registration is not configured.",
      });
    }

    if (invitationCode !== process.env.FACULTY_SIGNUP_CODE) {
      return res.status(403).json({
        success: false,
        message: "Invalid faculty invitation code.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFacultyId = facultyId.trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const existingFaculty = await User.findOne({
      facultyId: normalizedFacultyId,
    });

    if (existingFaculty) {
      return res.status(409).json({
        success: false,
        message: "This faculty ID is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      facultyId: normalizedFacultyId,
      department: department.trim(),
      role: "faculty",

      // Registration does not automatically grant faculty access.
      isApproved: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Faculty registration submitted. An administrator must approve your account before you can access faculty features.",
      user: formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with these details already exists.",
      });
    }

    console.error("Faculty signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register faculty.",
    });
  }
};

// LOGIN
const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (
      user.role === "faculty" &&
      !user.isApproved
    ) {
      return res.status(403).json({
        success: false,
        message: "Your faculty account is awaiting administrator approval.",
      });
    }

    const token = createToken(user);

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in.",
    });
  }
};

// LOGOUT
const Logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// CURRENT USER / SESSION RESTORATION
const Me = (req, res) => {
  return res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
};

module.exports = {
  SignUp,
  FacultySignUp,
  Login,
  Logout,
  Me,
};