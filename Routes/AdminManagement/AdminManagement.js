const express = require("express");
const router = express.Router();

const AdminManagementController = require("../../controller/AdminManagementController");
const authMiddleware = require("../../middleware/auth");
const ownerMiddleware = require("../../middleware/owner");

// Protect all routes: OG Admin only
router.use(authMiddleware);
router.use(ownerMiddleware);

// Get eligible students and approved faculty
router.get(
  "/eligible-users",
  AdminManagementController.getEligibleUsers
);

// Appoint temporary admin
router.post(
  "/temporary-admins",
  AdminManagementController.appointTemporaryAdmin
);

// Get all temporary admins
router.get(
  "/temporary-admins",
  AdminManagementController.getTemporaryAdmins
);

// Revoke temporary admin access
router.delete(
  "/temporary-admins/:id",
  AdminManagementController.revokeTemporaryAdmin
);

module.exports = router;