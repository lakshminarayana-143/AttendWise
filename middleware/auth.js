
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // Check whether a temporary admin's access has expired
    if (
      user.adminAccess?.type === "temporary" &&
      user.adminAccess.expiresAt &&
      user.adminAccess.expiresAt <= new Date()
    ) {
      const previousRole = user.adminAccess.previousRole;

      if (!["student", "faculty"].includes(previousRole)) {
        return res.status(403).json({
          success: false,
          message: "Temporary admin access has expired. Contact the owner.",
        });
      }

      // Atomically restore the original role and invalidate old sessions
      await User.findOneAndUpdate(
        {
          _id: user._id,
          "adminAccess.type": "temporary",
          "adminAccess.expiresAt": { $lte: new Date() },
        },
        [
          {
            $set: {
              role: "$adminAccess.previousRole",
              adminAccess: {
                type: null,
                grantedBy: null,
                expiresAt: null,
                previousRole: null,
              },
              sessionVersion: {
                $add: [{ $ifNull: ["$sessionVersion", 0] }, 1],
              },
            },
          },
        ]
      );

      return res.status(401).json({
        success: false,
        message: "Your temporary admin access has expired. Please log in again.",
      });
    }

    // Validate session version
    const currentSessionVersion = user.sessionVersion ?? 0;

    if (decoded.sessionVersion !== currentSessionVersion) {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

module.exports = authMiddleware;
