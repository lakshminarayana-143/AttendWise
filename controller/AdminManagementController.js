
const mongoose = require("mongoose");
const User = require("../models/User");

// Appoint an existing student or faculty member as a temporary admin
const appointTemporaryAdmin = async (req, res) => {
  try {
    const { userId, expiresAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
    }

    const expiryDate = new Date(expiresAt);

    if (!expiresAt || Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "A valid expiry date is required.",
      });
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiry date must be in the future.",
      });
    }

    const targetUser = await User.findOne({
      _id: userId,
      role: { $in: ["student", "faculty"] },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Eligible student or faculty account not found.",
      });
    }

    const previousRole = targetUser.role;

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        role: previousRole,
        "adminAccess.type": { $nin: ["owner", "temporary"] },
      },
      {
        $set: {
          role: "admin",
          adminAccess: {
            type: "temporary",
            grantedBy: req.user._id,
            expiresAt: expiryDate,
            previousRole,
          },
        },
        $inc: {
          sessionVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("name email role adminAccess sessionVersion");

    if (!updatedUser) {
      return res.status(409).json({
        success: false,
        message: "This user is no longer eligible for temporary admin access.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Temporary admin appointed successfully.",
      admin: updatedUser,
    });
  } catch (error) {
    console.error("Appoint temporary admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to appoint temporary admin.",
    });
  }
};

// Get all temporary admins
const getTemporaryAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      role: "admin",
      "adminAccess.type": "temporary",
    })
      .select("name email role adminAccess")
      .populate("adminAccess.grantedBy", "name email")
      .sort({ "adminAccess.expiresAt": 1 });

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Get temporary admins error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch temporary admins.",
    });
  }
};

// Revoke temporary admin access and restore the original role
const revokeTemporaryAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID.",
      });
    }

    const admin = await User.findOneAndUpdate(
      {
        _id: id,
        role: "admin",
        "adminAccess.type": "temporary",
        "adminAccess.previousRole": {
          $in: ["student", "faculty"],
        },
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
      ],
      {
        new: true,
      }
    ).select("name email role sessionVersion");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Temporary admin not found or access already revoked.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Temporary admin access revoked successfully.",
      user: admin,
    });
  } catch (error) {
    console.error("Revoke temporary admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to revoke temporary admin access.",
    });
  }
};

module.exports = {
  appointTemporaryAdmin,
  getTemporaryAdmins,
  revokeTemporaryAdmin,
};
