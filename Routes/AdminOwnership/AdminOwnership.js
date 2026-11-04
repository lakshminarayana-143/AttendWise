
const express = require("express");
const router = express.Router();

const AdminOwnershipController = require("../../controller/AdminOwnershipController");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// Public: Check whether initial setup is required
router.get(
  "/status",
  AdminOwnershipController.getSetupStatus
);

// Public: Create the first OG Admin using the setup secret
router.post(
  "/setup",
  AdminOwnershipController.createFirstOwner
);

// Protected: Only authenticated admins can view OG Admin information
router.get(
  "/owner",
  authMiddleware,
  roleMiddleware("admin"),
  AdminOwnershipController.getOwner
);

module.exports = router;
