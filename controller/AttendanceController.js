const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");
const User = require("../models/User");

// MARK ATTENDANCE
const markAttendance = async (req, res) => {
  try {
    const { subjectId, date, records } = req.body;

    // Validate required fields
    if (
      !subjectId ||
      !date ||
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject, date, and attendance records are required",
      });
    }

    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const classDate = new Date(date);

    if (Number.isNaN(classDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date",
      });
    }

    // Normalize the date to the start of the UTC day
    classDate.setUTCHours(0, 0, 0, 0);

    // Validate attendance records
    const studentIds = [];

    for (const record of records) {
      if (
        !record.studentId ||
        !mongoose.isValidObjectId(record.studentId) ||
        !["present", "absent"].includes(record.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each record needs a valid student ID and status",
        });
      }

      studentIds.push(record.studentId);
    }

    // Reject duplicate students in the same request
    if (new Set(studentIds.map(String)).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate students are not allowed",
      });
    }

    // Check the subject
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Only the faculty assigned to this subject can mark attendance
    if (String(subject.faculty) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot mark attendance for this subject",
      });
    }

    // Every submitted student must be enrolled in the subject
    const enrolledStudentIds = new Set(
      subject.students.map((id) => String(id))
    );

    const allStudentsEnrolled = studentIds.every((id) =>
      enrolledStudentIds.has(String(id))
    );

    if (!allStudentsEnrolled) {
      return res.status(400).json({
        success: false,
        message: "All students must be enrolled in this subject",
      });
    }

    // Check that submitted users are students
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
    }).select("_id");

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more student accounts are invalid",
      });
    }

    // Insert or update attendance records
    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          student: record.studentId,
          subject: subjectId,
          date: classDate,
        },
        update: {
          $set: {
            status: record.status,
            markedBy: req.user.id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      totalRecords: records.length,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
};

// VIEW MY ATTENDANCE — STUDENT
const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({
      student: req.user.id,
    })
      .populate("subject", "name code")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Get student attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

// VIEW ATTENDANCE FOR A SUBJECT — FACULTY
const getSubjectAttendance = async (req, res) => {
  try {
    const { subjectId } = req.params;

    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    if (String(subject.faculty) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this subject",
      });
    }

    const records = await Attendance.find({
      subject: subjectId,
    })
      .populate("student", "name email studentId")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Get subject attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subject attendance",
    });
  }
};

// ATTENDANCE SUMMARY — STUDENT
const getMyAttendanceSummary = async (req, res) => {
  try {
    const records = await Attendance.find({
      student: req.user.id,
    }).populate("subject", "name code");

    const summary = {};

    for (const record of records) {
      if (!record.subject) continue;

      const subjectId = String(record.subject._id);

      if (!summary[subjectId]) {
        summary[subjectId] = {
          subjectId,
          subjectName: record.subject.name,
          subjectCode: record.subject.code,
          totalClasses: 0,
          attendedClasses: 0,
          percentage: 0,
        };
      }

      summary[subjectId].totalClasses += 1;

      if (record.status === "present") {
        summary[subjectId].attendedClasses += 1;
      }
    }

    const subjects = Object.values(summary).map((item) => ({
      ...item,
      percentage:
        item.totalClasses === 0
          ? 0
          : Number(
              (
                (item.attendedClasses / item.totalClasses) *
                100
              ).toFixed(2)
            ),
    }));

    return res.status(200).json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Attendance summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate attendance summary",
    });
  }
};

module.exports = {
  markAttendance,
  getMyAttendance,
  getSubjectAttendance,
  getMyAttendanceSummary,
};