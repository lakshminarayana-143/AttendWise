const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Check JWT configuration
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error.",
      });
    }

    // 2. Read token from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      console.log("Authentication failed: token cookie missing");

      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // 3. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // 4. Find user in MongoDB
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log("Authentication failed: user not found");

      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // 5. Attach authenticated user
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Your session has expired. Please log in again."
          : "Invalid authentication token. Please log in again.",
    });
  }
};

module.exports = authMiddleware;
