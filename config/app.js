//For Admins, use this to generate a JWT signing secret if you dont have one already
// const crypto = require('crypto');
// const secret = crypto.randomBytes(64).toString('hex');
// console.log('signing secret', secret)

//Establish local environment variables
const dotenv = require("dotenv").config();

//Create the app object
const express = require("express");
const path = require("path");
const http = require("http");
const url = require("url");
const cors = require('cors');
// const helmet = require('helmet');

const app = express();

// Import MongoDB connection
const { connectDB } = require("./db.js"); // Destructure connectDB from the export


//Handles both WSS and Socket.IO depending on the Client's request
const { createRealTimeServers } = require("./realTime");

//Process JSON and urlencoded parameters
app.use(express.json({ extended: true, limit: "1000mb" }));
app.use(express.urlencoded({ extended: true, limit: "1000mb" })); //The largest incoming payload

//Select the default port
const port = process.env.PORT || 3000;
const apiUrl = process.env.API_URL || 'http://localhost:3000';

//Setup Helmet - Prevent leaky headers
// const helmetConfig = helmet({
//   // Use most of Helmet's default settings
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"], // Adjust as needed
//       scriptSrc: ["'self'"], // Adjust as needed
//     },
//   },
//   // Explicitly disable headers that might leak info
//   hidePoweredBy: true, // Remove X-Powered-By header
//   xDownloadOptions: true, // Prevent IE from executing downloads
//   xXssProtection: false, // Disable deprecated X-XSS-Protection
//   referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Control referrer info
// });

// app.use(helmetConfig);

//Setup CORS - Prevent cross origin misuse
// const corsOptions = {
//   origin: (origin, callback) => {
//     if (process.env.NODE_ENV === 'DEV') {
//       // Allow all origins in development
//       callback(null, true);
//     } else if (process.env.NODE_ENV === 'PROD') {
//       // Only allow specific API_URL in production
//       const allowedOrigins = process.env.API_URL ? process.env.API_URL.split(',') : [];
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error('Not allowed by CORS'));
//       }
//     } else {
//       callback(new Error('Invalid NODE_ENV configuration'));
//     }
//   },
//   credentials: true, // Enable credentials if needed
//   optionsSuccessStatus: 200
// };

// // Usage with Express
// app.use(cors(corsOptions));

// Initialize MongoDB connection once
connectDB().catch((err) => {
  console.error("Failed to initialize MongoDB:", err);
  process.exit(1); // Exit if the connection fails
});

//Create HTTP Server
const server = http.createServer(app);
server.listen( port, '0.0.0.0', () =>
  console.log(`AI Starter Template - Node.js service listening at ${apiUrl}`)
);

//Establish both websocket and Socket.IO servers
createRealTimeServers(server, null);

app.use((req, res, next) => {
  req.fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
  next();
});

//Export the app for use on the index.js page
module.exports = { app };
