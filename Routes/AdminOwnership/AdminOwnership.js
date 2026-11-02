const express = require("express");
const router = express.Router();

const AdminOwnershipController = require("../../controller/AdminOwnershipController");

// One-time OG Admin setup
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