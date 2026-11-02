const mongoose = require("mongoose");

const adminOwnershipSchema = new mongoose.Schema(
  {
    // There can only be one ownership record.
    key: {
      type: String,
      enum: ["ATTENDWISE_OWNER"],
      default: "ATTENDWISE_OWNER",
      required: true,
      unique: true,
    },

    // Current and only OG Admin
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Successor selected by the current OG Admin
    pendingSuccessor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    transferInitiatedAt: {
      type: Date,
      default: null,
    },

    // Optional reason for ownership transfer
    transferReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Explicitly enforce one ownership record.
adminOwnershipSchema.index(
  { key: 1 },
  {
    unique: true,
    name: "unique_attendwise_ownership",
  }
);

module.exports = mongoose.model(
  "AdminOwnership",
  adminOwnershipSchema
);