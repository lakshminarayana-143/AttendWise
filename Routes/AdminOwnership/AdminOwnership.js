const express = require("express");
const router = express.Router();

const AdminOwnershipController = require("../../controller/AdminOwnershipController");

// Check whether initial setup is required
router.get(
  "/status",
  AdminOwnershipController.getSetupStatus
);

// Create the first OG Admin
router.post(
  "/setup",
  AdminOwnershipController.createFirstOwner
);

// Get current OG Admin information
router.get(
  "/owner",
  AdminOwnershipController.getOwner
);

module.exports = router;    