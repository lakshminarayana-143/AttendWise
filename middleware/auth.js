
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

    // Check temporary admin expiry without changing the original role
    if (
      user.adminAccess?.type === "temporary" &&
      user.adminAccess.expiresAt &&
      user.adminAccess.expiresAt <= new Date()
    ) {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          "adminAccess.type": "temporary",
          "adminAccess.expiresAt": { $lte: new Date() },
        },
        [
          {
            $set: {
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
        ],
        { new: true }
      );

      if (updatedUser) {
        return res.status(401).json({
          success: false,
          message:
            "Your temporary admin access has expired. Please log in again.",
        });
      }

      // Another request may have already processed the expiry.
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
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

    // Attach the original role and additional admin permissions
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
