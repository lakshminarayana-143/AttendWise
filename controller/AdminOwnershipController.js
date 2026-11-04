
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AdminOwnership = require("../models/AdminOwnership");

// Create the first and only OG Admin
const createFirstOwner = async (req, res) => {
  let session;

  try {
    const { name, email, password, setupSecret } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !setupSecret) {
      return res.status(400).json({
        success: false,
        message: "All admin details are required.",
      });
    }

    if (!process.env.ADMIN_SETUP_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Admin setup is not configured.",
      });
    }

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin setup secret.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const existingOwnership = await AdminOwnership.findOne({
        key: "ATTENDWISE_OWNER",
      }).session(session);

      if (existingOwnership) {
        throw new Error("OG Admin has already been established.");
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
      }).session(session);

      if (existingUser) {
        throw new Error("This email is already registered.");
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [admin] = await User.create(
        [
          {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
            isApproved: true,
            adminAccess: {
              type: "owner",
              grantedBy: null,
              expiresAt: null,
              previousRole: null,
            },
          },
        ],
        { session }
      );

      await AdminOwnership.create(
        [
          {
            key: "ATTENDWISE_OWNER",
            owner: admin._id,
          },
        ],
        { session }
      );
    });

    return res.status(201).json({
      success: true,
      message: "OG Admin created successfully.",
    });
  } catch (error) {
    console.error("Create OG Admin error:", error);

    if (
      error.message === "OG Admin has already been established." ||
      error.message === "This email is already registered."
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An OG Admin or registered email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to establish OG Admin.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// Get current OG Admin information
const getOwner = async (req, res) => {
  try {
    const ownership = await AdminOwnership.findOne({
      key: "ATTENDWISE_OWNER",
    }).populate("owner", "name role");

    if (!ownership || !ownership.owner) {
      return res.status(404).json({
        success: false,
        message: "OG Admin has not been established.",
      });
    }

    return res.status(200).json({
      success: true,
      owner: ownership.owner,
    });
  } catch (error) {
    console.error("Get OG Admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve OG Admin.",
    });
  }
};

// Check whether initial OG Admin setup is required
const getSetupStatus = async (req, res) => {
  try {
    const ownership = await AdminOwnership.findOne({
      key: "ATTENDWISE_OWNER",
    }).select("_id");

    return res.status(200).json({
      success: true,
      setupRequired: !ownership,
    });
  } catch (error) {
    console.error("Admin setup status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check admin setup status.",
    });
  }
};

module.exports = {
  createFirstOwner,
  getOwner,
  getSetupStatus,
};
