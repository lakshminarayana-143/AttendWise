
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AdminOwnership = require("../models/AdminOwnership");

// Create the first and only OG Admin from an existing account
const createFirstOwner = async (req, res) => {
  let session;

  try {
    const { email, password, setupSecret } = req.body;

    if (!email?.trim() || !password || !setupSecret) {
      return res.status(400).json({
        success: false,
        message: "Email, password and setup secret are required.",
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

    const normalizedEmail = email.trim().toLowerCase();

    session = await mongoose.startSession();

    let ownerDetails = null;

    await session.withTransaction(async () => {
      const existingOwnership = await AdminOwnership.findOne({
        key: "ATTENDWISE_OWNER",
      }).session(session);

      if (existingOwnership) {
        throw new Error("OG Admin has already been established.");
      }

      const user = await User.findOne({
        email: normalizedEmail,
      })
        .select("+password")
        .session(session);

      if (!user) {
        throw new Error("No account found with this email.");
      }

      if (!["student", "faculty"].includes(user.role)) {
        throw new Error("Only student or faculty accounts can become OG Admin.");
      }

      if (!user.isApproved) {
        throw new Error("Your account must be approved before becoming OG Admin.");
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.password
      );

      if (!passwordMatches) {
        throw new Error("Incorrect account password.");
      }

      const previousRole = user.role;

      user.role = "admin";
      user.isApproved = true;
      user.adminAccess = {
        type: "owner",
        grantedBy: null,
        expiresAt: null,
        previousRole,
      };

      user.sessionVersion = (user.sessionVersion || 0) + 1;

      await user.save({ session });

      await AdminOwnership.create(
        [
          {
            key: "ATTENDWISE_OWNER",
            owner: user._id,
            pendingSuccessor: null,
            transferInitiatedAt: null,
            transferReason: "",
          },
        ],
        { session }
      );

      ownerDetails = {
        name: user.name,
        email: user.email,
        previousRole,
      };
    });

    return res.status(201).json({
      success: true,
      message: "OG Admin created successfully.",
      owner: ownerDetails,
    });
  } catch (error) {
    console.error("Create OG Admin error:", error);

    const clientErrors = [
      "OG Admin has already been established.",
      "No account found with this email.",
      "Only student or faculty accounts can become OG Admin.",
      "Your account must be approved before becoming OG Admin.",
      "Incorrect account password.",
    ];

    if (clientErrors.includes(error.message)) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An OG Admin or ownership record already exists.",
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
    }).populate("owner", "name email role");

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
