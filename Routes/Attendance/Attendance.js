const express = require("express");
const router = express.Router();

const AttendanceController = require("../../controller/AttendanceController");
const authMiddleware = require("../../middleware/auth");

// Faculty: Mark attendance
router.post(
  "/mark",
  authMiddleware,
  AttendanceController.markAttendance
);

// Student: View personal attendance history
router.get(
  "/my-attendance",
  authMiddleware,
  AttendanceController.getMyAttendance
);

// Faculty: View attendance for a subject
router.get(
  "/subject/:subjectId",
  authMiddleware,
  AttendanceController.getSubjectAttendance
);

module.exports = router;