const User = require("../models/User");

// Get all faculty accounts waiting for approval
const getPendingFaculty = async (req, res) => {
  try {
    const faculty = await User.find({
      role: "faculty",
      isApproved: false,
    }).select("-password");

    return res.status(200).json({
      success: true,
      count: faculty.length,
      faculty,
    });
  } catch (error) {
    console.error("Get pending faculty error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch pending faculty.",
    });
  }
};

// Approve faculty account
const approveFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await User.findOneAndUpdate(
      {
        _id: id,
        role: "faculty",
        isApproved: false,
      },
      {
        $set: { isApproved: true },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Pending faculty account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Faculty approved successfully.",
      faculty,
    });
  } catch (error) {
    console.error("Approve faculty error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve faculty.",
    });
  }
};

// Reject and delete pending faculty account
const rejectFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await User.findOneAndDelete({
      _id: id,
      role: "faculty",
      isApproved: false,
    });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Pending faculty account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Faculty registration rejected.",
    });
  } catch (error) {
    console.error("Reject faculty error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reject faculty.",
    });
  }
};

module.exports = {
  getPendingFaculty,
  approveFaculty,
  rejectFaculty,
};