const express = require("express");
const router = express.Router();

const SubjectController = require("../../controller/SubjectController");
const authMiddleware = require("../../middleware/auth");

// Create a new subject — Faculty only
router.post(
  "/create",
  authMiddleware,
  SubjectController.createSubject
);

// Get subjects based on logged-in user's role
router.get(
  "/all",
  authMiddleware,
  SubjectController.getAllSubjects
);

// Get subjects created by the logged-in faculty
router.get(
  "/my-subjects",
  authMiddleware,
  SubjectController.getMySubjects
);

// Update a subject
router.put(
  "/:id",
  authMiddleware,
  SubjectController.updateSubject
);

// Delete a subject
router.delete(
  "/:id",
  authMiddleware,
  SubjectController.deleteSubject
);

module.exports = router;