const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");
const User = require("../models/User");

// MARK ATTENDANCE — Faculty only
const markAttendance = async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can mark attendance.",
      });
    }

    const { subjectId, date, session, records } = req.body;

    if (!subjectId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Subject, date and attendance records are required.",
      });
    }

    const attendanceDate = new Date(`${date}T00:00:00.000Z`);

    if (Number.isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance date.",
      });
    }

    // Verify subject ownership
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

    // Validate attendance records
    const studentIds = records.map((record) => record.studentId);

    if (
      studentIds.some((id) => !id) ||
      new Set(studentIds.map(String)).size !== studentIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Every student must have a unique student ID.",
      });
    }

    for (const record of records) {
      if (!["present", "absent"].includes(record.status)) {
        return res.status(400).json({
          success: false,
          message: "Attendance status must be present or absent.",
        });
      }
    }

    // Verify students belong to this subject's department and year
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

    const attendanceSession = session?.trim() || "Regular";

    // Insert or update attendance
    const operations = records.map((record) => ({
      updateOne: {
        filter: {
          subject: subject._id,
          student: record.studentId,
          date: attendanceDate,
          session: attendanceSession,
        },
        update: {
          $set: {
            status: record.status,
            remarks: record.remarks || "",
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
      total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0;

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
    if (req.user.role !== "faculty") {
      return res.status(403).json({
        success: false,
        message: "Only faculty members can view subject attendance.",
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
      const selectedDate = new Date(`${req.query.date}T00:00:00.000Z`);

      if (Number.isNaN(selectedDate.getTime())) {
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