const Subject = require("../models/Subject");

// CREATE SUBJECT — Faculty only
const createSubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can create subjects.",
      });
    }

    const { name, code, department, year, description } = req.body;

    if (!name || !code || !department || !year) {
      return res.status(400).json({
        success: false,
        message: "Name, code, department and year are required.",
      });
    }

    const subject = await Subject.create({
      name,
      code,
      department,
      year,
      description,
      faculty: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully.",
      subject,
    });
  } catch (error) {
    console.error("Create subject error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already created a subject with this code.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create subject.",
    });
  }
};

// GET ALL SUBJECTS
const getAllSubjects = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "faculty") {
      filter.faculty = req.user._id;
    } else if (req.user.role === "student") {
      filter.department = req.user.department;
      filter.year = req.user.year;
    }

    const subjects = await Subject.find(filter)
      .populate("faculty", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error("Get subjects error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subjects.",
    });
  }
};

// GET FACULTY SUBJECTS
const getMySubjects = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can access this resource.",
      });
    }

    const subjects = await Subject.find({
      faculty: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error("Get faculty subjects error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your subjects.",
    });
  }
};

// UPDATE SUBJECT — Owner faculty only
const updateSubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can update subjects.",
      });
    }

    const { name, code, department, year, description } = req.body;

    const subject = await Subject.findOne({
      _id: req.params.id,
      faculty: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or access denied.",
      });
    }

    if (name !== undefined) subject.name = name;
    if (code !== undefined) subject.code = code;
    if (department !== undefined) subject.department = department;
    if (year !== undefined) subject.year = year;
    if (description !== undefined) subject.description = description;

    await subject.save();

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully.",
      subject,
    });
  } catch (error) {
    console.error("Update subject error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A subject with this code already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update subject.",
    });
  }
};

// DELETE SUBJECT — Owner faculty only
const deleteSubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can delete subjects.",
      });
    }

    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      faculty: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully.",
    });
  } catch (error) {
    console.error("Delete subject error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete subject.",
    });
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getMySubjects,
  updateSubject,
  deleteSubject,
};