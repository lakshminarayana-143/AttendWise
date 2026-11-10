const express = require("express");
const router = express.Router();

const AttendanceController = require("../../controller/AttendanceController");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// All attendance routes require authentication.
router.use(authMiddleware);

// Faculty: Mark attendance.
router.post(
  "/mark",
  roleMiddleware("faculty"),
  AttendanceController.markAttendance
);

// Student: View personal attendance history.
router.get(
  "/my-attendance",
  roleMiddleware("student"),
  AttendanceController.getMyAttendance
);

// Faculty: View attendance for a subject.
router.get(
  "/subject/:subjectId",
  roleMiddleware("faculty"),
  AttendanceController.getSubjectAttendance
);

module.exports = router;