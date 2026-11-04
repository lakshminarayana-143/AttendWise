
const AdminOwnership = require("../models/AdminOwnership");

const ownerMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (
      req.user.role !== "admin" ||
      req.user.adminAccess?.type !== "owner"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the original owner can perform this operation.",
      });
    }

    const ownership = await AdminOwnership.findOne({
      key: "ATTENDWISE_OWNER",
      owner: req.user._id,
    });

    if (!ownership) {
      return res.status(403).json({
        success: false,
        message: "You are not the registered owner.",
      });
    }

    next();
  } catch (error) {
    console.error("Owner middleware error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify ownership.",
    });
  }
};

module.exports = ownerMiddleware;
  