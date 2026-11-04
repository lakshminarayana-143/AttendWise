
const express = require("express");
const router = express.Router();

const AdminManagementController = require("../../controller/AdminManagementController");
const authMiddleware = require("../../middleware/auth");
const ownerMiddleware = require("../../middleware/owner");

// All routes in this file require OG Admin authentication
router.use(authMiddleware);
router.use(ownerMiddleware);

// Appoint a student or faculty member as temporary admin
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
