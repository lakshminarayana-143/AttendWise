
const Subject = require("../models/Subject");
const User = require("../models/User");

// CREATE SUBJECT — Faculty only
const createSubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can create subjects.",
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
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: department.trim(),
      year: Number(year),
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

// GET ALL SUBJECTS — Based on logged-in user's role
const getAllSubjects = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "faculty") {
      filter.faculty = req.user._id;
    } else if (req.user.role === "student") {
      filter.department = req.user.department;
      filter.year = req.user.year;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view subjects.",
      });
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

// GET FACULTY SUBJECTS — Faculty only
const getMySubjects = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can access this resource.",
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

// GET STUDENTS FOR A SUBJECT — Faculty only
const getStudentsBySubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can access students.",
      });
    }

    // Verify that the subject belongs to the logged-in faculty.
    const subject = await Subject.findOne({
      _id: req.params.subjectId,
      faculty: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or access denied.",
      });
    }

    // Find approved students matching the subject's department and year.
    const students = await User.find({
      role: "student",
      isApproved: true,
      department: subject.department,
      year: subject.year,
    })
      .select("_id name email studentId department year")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        department: subject.department,
        year: subject.year,
      },
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get students by subject error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch students.",
    });
  }
};

// UPDATE SUBJECT — Owner faculty only
const updateSubject = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can update subjects.",
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

    if (name !== undefined) subject.name = name.trim();
    if (code !== undefined) subject.code = code.trim().toUpperCase();
    if (department !== undefined) subject.department = department.trim();
    if (year !== undefined) subject.year = Number(year);
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
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can delete subjects.",
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
  getStudentsBySubject,
  updateSubject,
  deleteSubject,
};
