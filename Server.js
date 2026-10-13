
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const Auth = require("./Routes/Authentication/Auth");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/Auth",Auth)

// HOME ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    message: "AttendWise Attendance Management API is running",
  });
});


// Start server only after database connection succeeds
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`AttendWise server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start AttendWise:", error.message);
    process.exit(1);
  }
};

startServer();
