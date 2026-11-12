
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");
const User = require("../models/User");

// Validate YYYY-MM-DD without accepting invalid calendar dates.
const parseAttendanceDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

// MARK ATTENDANCE — Faculty only
const markAttendance = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can mark attendance.",
      });
    }

    const { subjectId, date, session, records } = req.body;

    if (
      !subjectId ||
      !date ||
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Subject, date and attendance records are required.",
      });
    }

    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

    const attendanceDate = parseAttendanceDate(date);

    if (!attendanceDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date.",
      });
    }

    const attendanceSession =
      session === undefined ? "Regular" : session;

    if (
      typeof attendanceSession !== "string" ||
      !attendanceSession.trim() ||
      attendanceSession.trim().length > 50
    ) {
      return res.status(400).json({
        success: false,
        message: "Session must contain 1 to 50 characters.",
      });
    }

    // Verify subject ownership.
    const subject = await Subject.findOne({
      _id: subjectId,
      faculty: req.user._id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or access denied.",
      });
    }

    // Validate student IDs and attendance records.
    const studentIds = records.map(
      (record) => record?.studentId
    );

    if (
      studentIds.some(
        (id) =>
          !id ||
          !mongoose.isValidObjectId(id)
      ) ||
      new Set(studentIds.map(String)).size !== studentIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Every student must have a unique valid student ID.",
      });
    }

    for (const record of records) {
      if (!["present", "absent"].includes(record.status)) {
        return res.status(400).json({
          success: false,
          message: "Attendance status must be present or absent.",
        });
      }

      if (
        record.remarks !== undefined &&
        typeof record.remarks !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Remarks must be text.",
        });
      }
    }

    // Verify students belong to this subject's department and year.
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      isApproved: true,
      department: subject.department,
      year: subject.year,
    }).select("_id");

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "One or more students are invalid or do not belong to this subject's department and year.",
      });
    }

    // Insert or update attendance.
    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          subject: subject._id,
          student: record.studentId,
          date: attendanceDate,
          session: attendanceSession.trim(),
        },
        update: {
          $set: {
            status: record.status,
            remarks: record.remarks?.trim() || "",
            markedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully.",
      totalStudents: records.length,
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to mark attendance.",
    });
  }
};

// GET STUDENT ATTENDANCE — Student only
const getMyAttendance = async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their attendance history.",
      });
    }

    const filter = {
      student: req.user._id,
    };

    if (req.query.subjectId) {
      if (!mongoose.isValidObjectId(req.query.subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
      }

      filter.subject = req.query.subjectId;
    }

    const attendance = await Attendance.find(filter)
      .populate("subject", "name code department year")
      .populate("markedBy", "name email")
      .sort({ date: -1, createdAt: -1 });

    const total = attendance.length;
    const present = attendance.filter(
      (item) => item.status === "present"
    ).length;
    const absent = attendance.filter(
      (item) => item.status === "absent"
    ).length;

    const percentage =
      total > 0
        ? Number(((present / total) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      summary: {
        total,
        present,
        absent,
        percentage,
      },
      attendance,
    });
  } catch (error) {
    console.error("Get student attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance history.",
    });
  }
};

// GET SUBJECT ATTENDANCE — Faculty only
const getSubjectAttendance = async (req, res) => {
  try {
    if (req.user.role !== "faculty" || !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Only approved faculty members can view attendance.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID.",
      });
    }

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

    const filter = {
      subject: subject._id,
    };

    if (req.query.date) {
      const selectedDate = parseAttendanceDate(req.query.date);

      if (!selectedDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid date.",
        });
      }

      filter.date = selectedDate;
    }

    const attendance = await Attendance.find(filter)
      .populate("student", "name email studentId department year")
      .populate("markedBy", "name")
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      subject,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("Get subject attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch subject attendance.",
    });
  }
};

module.exports = {
  markAttendance,
  getMyAttendance,
  getSubjectAttendance,
};
