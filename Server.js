const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

// Middleware must be configured after creating the Express app.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route imports
const Auth = require("./Routes/Authentication/Auth");

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AttendWise API is running.",
  });
});

// Authentication routes
app.use("/Auth", Auth);

// Start the server.
// Keep your existing MongoDB connection setup if it is already in this file.
const PORT = process.env.PORT || 3000;
connectDB().then(()=>{
  app.listen(PORT, () => {
  
  console.log(`AttendWise server running on port ${PORT}`);
});
}).catch((err)=>{
  console.log(err)
});
