
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const User = require("../models/User");

const migrateTemporaryAdmins = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB.");

    const users = await User.find({
      role: "admin",
      "adminAccess.type": "temporary",
      "adminAccess.previousRole": {
        $in: ["student", "faculty"],
      },
    }).select("name email role adminAccess sessionVersion");

    console.log(`\nFound ${users.length} temporary admin account(s).\n`);

    if (users.length === 0) {
      console.log("No accounts require migration.");
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Current role: ${user.role}`);
      console.log(`   Original role: ${user.adminAccess.previousRole}`);
      console.log(`   Admin expiry: ${user.adminAccess.expiresAt || "Not set"}`);
    });

    const applyChanges = process.argv.includes("--apply");

    if (!applyChanges) {
      console.log("\nDRY RUN: No database changes were made.");
      console.log(
        "\nIf these accounts are correct, run: node scripts/migrateTemporaryAdmins.js --apply"
      );
      return;
    }

    let migrated = 0;

    for (const user of users) {
      const originalRole = user.adminAccess.previousRole;

      const result = await User.updateOne(
        {
          _id: user._id,
          role: "admin",
          "adminAccess.type": "temporary",
          "adminAccess.previousRole": originalRole,
        },
        {
          $set: {
            role: originalRole,
          },
          $inc: {
            sessionVersion: 1,
          },
        }
      );

      if (result.modifiedCount === 1) {
        migrated++;
        console.log(`Migrated: ${user.email} → ${originalRole}`);
      }
    }

    console.log(`\nMigration completed. Updated ${migrated} account(s).`);
    console.log("Temporary admin permissions and expiry dates were preserved.");
    console.log("OG Admin accounts were not modified.");
  } catch (error) {
    console.error("\nMigration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

migrateTemporaryAdmins();
