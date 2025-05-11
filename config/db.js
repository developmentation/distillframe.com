// db.js
const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB is already connected");
    return;
  }

  try {
    if (process.env.MONGODB) {
      const conn = await mongoose.connect(process.env.MONGODB, {});
      isConnected = true;
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } else {
      console.warn("No MongoDB Connection String. Please add one and try again.");
    }
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    isConnected = false;
    throw error; // Let the caller handle the error
  }
};

// Export connection status checker
const isDbConnected = () => isConnected;

module.exports = { connectDB, isDbConnected };