const express = require("express");
const router = express.Router();

const AdminController = require("../../controller/AdminController");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// Get pending faculty
router.get(
  "/pending-faculty",
  AdminController.getPendingFaculty
);

// Approve faculty
router.patch(
  "/approve-faculty/:id",
  AdminController.approveFaculty
);

// Reject faculty
router.delete(
  "/reject-faculty/:id",
  AdminController.rejectFaculty
);

module.exports = router;