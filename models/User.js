const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      default: "student",
      required: true,
    },

    studentId: {
      type: String,
      trim: true,
      sparse: true,
    },

    department: {
      type: String,
      trim: true,
    },

    year: {
      type: Number,
      min: 1,
      max: 4,
    },

    facultyId: {
      type: String,
      trim: true,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    // Administrative ownership and temporary access
    adminAccess: {
      type: {
        type: String,
        enum: ["owner", "temporary"],
        default: null,
      },

      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },

      previousRole: {
        type: String,
        enum: ["student", "faculty"],
        default: null,
      },
    },

    // Used to invalidate existing login sessions after role changes
    sessionVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Database-level protection: only one OG Admin can exist.
userSchema.index(
  { "adminAccess.type": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "adminAccess.type": "owner",
    },
    name: "one_og_admin_only",
  }
);

module.exports = mongoose.model("User", userSchema);