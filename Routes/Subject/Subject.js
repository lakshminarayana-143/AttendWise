
const express = require("express");
const router = express.Router();

const SubjectController = require("../../controller/SubjectController");
const authMiddleware = require("../../middleware/auth");
const roleMiddleware = require("../../middleware/role");

// All subject routes require authentication.
router.use(authMiddleware);

// Create subject — Approved faculty only.
router.post(
  "/create",
  roleMiddleware("faculty"),
  SubjectController.createSubject
);

// Get subjects based on logged-in user's role.
router.get(
  "/all",
  roleMiddleware("student", "faculty", "admin"),
  SubjectController.getAllSubjects
);

// Get subjects created by the logged-in faculty.
router.get(
  "/my-subjects",
  roleMiddleware("faculty"),
  SubjectController.getMySubjects
);

// Get students belonging to a subject — Faculty only.
router.get(
  "/:subjectId/students",
  roleMiddleware("faculty"),
  SubjectController.getStudentsBySubject
);

// Update subject — Faculty only.
router.put(
  "/:id",
  roleMiddleware("faculty"),
  SubjectController.updateSubject
);

// Delete subject — Faculty only.
router.delete(
  "/:id",
  roleMiddleware("faculty"),
  SubjectController.deleteSubject
);

module.exports = router;
