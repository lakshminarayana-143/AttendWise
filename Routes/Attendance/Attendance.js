const express = require("express");
const router = express.Router();

const {
  markAttendance,
  getMyAttendance,
  getSubjectAttendance,
  getMyAttendanceSummary,
} = require("../../controllers/attendanceController");

const authMiddleware = require("../../middleware/authMiddleware");
const roleMiddleware = require("../../middleware/roleMiddleware");

// Faculty marks attendance
router.post(
  "/mark",
  authMiddleware,
  roleMiddleware("faculty"),
  markAttendance
);

// Students view their own attendance
router.get(
  "/my",
  authMiddleware,
  roleMiddleware("student"),
  getMyAttendance
);

// Students view attendance percentages
router.get(
  "/my/summary",
  authMiddleware,
  roleMiddleware("student"),
  getMyAttendanceSummary
);

// Faculty views attendance for their subjects
router.get(
  "/subject/:subjectId",
  authMiddleware,
  roleMiddleware("faculty"),
  getSubjectAttendance
);

module.exports = router;