// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require('express-session');
const MongoDBSession=require('connect-mongodb-session')(session);
const bcrypt = require("bcryptjs");
const { User, Doctor, Admin, Contact } = require("./models/User");
const nodemailer = require("nodemailer");
const { spawn } = require("child_process");
const path = require("path");

const FileStore = require('session-file-store')(session);
require('dotenv').config(); 


const adminRoutes = require("./Routes/Admin");
const doctorRoutes = require("./Routes/Doctor");
const userRoutes = require('./Routes/Users'); 



const app = express();
app.set('trust proxy', 1);
app.use(express.json());

app.use(cors({
  // origin: 'http://localhost:3000',  // Allow requests only from the React app
  origin: process.env.FRONTEND_URL,
  credentials: true,  // Allow cookies and credentials to be sent with requests
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

// MongoDB connection
// const mongoURL=process.env.MONGO_URI_LOCAL;
const mongoURL = process.env.MONGO_URI;

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  //useCreateIndex:true,
  //useUnifiedTopology: true,
  
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("Failed to connect to MongoDB", err));

const store=new MongoDBSession({
    uri:mongoURL,
    collection:'mysessions',
});



//handle session
app.use(
  session({
    store: store, // Use file store to persist sessions
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,  // Set to true if using HTTPS in production
      sameSite: 'none',  //lax for development else none for production
      maxAge: 3600000, // 1 hour expiration
    },
  })
);

// const createAdmin = async () => {
//   try {
//     const email = "admin123@gmail.com";
//     const plainPassword = "123";

//     // Check if an admin already exists
//     const existingAdmin = await Admin.findOne({ email });
//     if (existingAdmin) {
//       console.log("Admin with this email already exists.");
//       return;
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(plainPassword, 10);

//     // Create new admin
//     const admin = new Admin({
//       username: "Admin",
//       email,
//       password: hashedPassword,
//     });

//     // Save admin to the database
//     await admin.save();
//     console.log("Admin created successfully:", admin);
//   } catch (error) {
//     console.error("Error creating admin:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// };

// // Execute the script
// createAdmin();

app.use("/admin", adminRoutes);
app.use("/doctor", doctorRoutes);
app.use("/users",userRoutes);



app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    // Save user data in session
    req.session.userId = newUser._id;

    // Respond with user information, role, and userId (like login response)
    res.status(201).json({
      message: "Signup successful",
      user: {
        username: newUser.username,
        email: newUser.email,
        role: "User",
        userId: newUser._id, // Include userId in the response
      },
      isUser: true,
      isDoctor: false,
      isAdmin: false,
    });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});




app.post("/api/login", async (req, res) => {
  const { email, password, isUser, isDoctor, isAdmin } = req.body;

  try {
    let user = null;
    let role = "";

    // Check the role and find the user in the corresponding collection
    if (isUser) {
      user = await User.findOne({ email });
      role = "User";
    } else if (isDoctor) {
      user = await Doctor.findOne({ email });
      role = "Doctor";
    } else if (isAdmin) {
      user = await Admin.findOne({ email });
      role = "Admin";
    } else {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // If no user is found
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Save user data in session
    req.session.userId = user._id;

    console.log("Login - Session ID:", req.sessionID);
    console.log("Login - Session Data:", req.session);

    // Respond with user information, role, and userId
    res.json({
      message: "Login successful",
      user: {
        username: user.username,
        email: user.email,
        role: role,
        userId: user._id, // Include userId in the response
      },
      isUser: !!isUser,
      isDoctor: !!isDoctor,
      isAdmin: !!isAdmin,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



app.get("/api/validate-session", (req, res) => {
  //console.log("Session ID:", req.sessionID); // Log session ID
  //console.log("Session Data:", req.session); // Log session data
  if (req.session && req.session.userId) {
    //console.log("Session valid:", req.session.userId);
    return res.json({ valid: true });
  } else {
    console.log("Session invalid");
    return res.json({ valid: false });
  }
});


app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});




//contact api

app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  
  try {
    const newContact = new Contact({ name, email, message });
    await newContact.save();

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error saving contact message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});




const sendAnalysisEmail = async (toEmail, symptoms, data) => {
  // Configure your email transport
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      // user: "asitvanced2002@gmail.com",        // ✅ use your actual email
      // pass: "xpak ymcx kmed hjdr",           // 🔒 use app password (not your real password!)
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Format the results into HTML
  const htmlResults = data.map((item, index) => `
    <h3>Disease ${index + 1}: ${item.disease}</h3>
    <p><strong>Probability:</strong> ${(item.probability * 100).toFixed(2)}%</p>
    <p><strong>Description:</strong> ${item.description}</p>
    <p><strong>Medications:</strong> ${item.medications.join(", ")}</p>
    <p><strong>Precautions:</strong> ${item.precautions.join(", ")}</p>
    <p><strong>Diets:</strong> ${item.diets.join(", ")}</p>
    <p><strong>Workout:</strong> ${item.workout.join(", ")}</p>
    <hr />
  `).join("");

  const mailOptions = {
    from: '"HealthCare App" asitvanced2002@gmail.com',
    to: toEmail,
    subject: "Your Health Analysis Report",
    html: `
      <h2>Symptom-Based Health Analysis</h2>
      <p><strong>Symptoms:</strong> ${symptoms}</p>
      <hr />
      ${htmlResults}
      <p>Stay healthy! 🚑</p>
    `,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};


app.post("/api/general", async (req, res) => {
  const { symptoms, email } = req.body;
  console.log(symptoms);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // 1. Forward symptoms to Flask server
    // const flaskResponse = await axios.post("http://localhost:5001/predict", {
    //   symptoms,
    // });
      const flaskResponse = await axios.post(
      `${process.env.FLASK_API_URL}/predict`,
      {
        symptoms,
      });

    // 2. Normalize the response
    const normalizedData = (Array.isArray(flaskResponse.data)
      ? flaskResponse.data
      : [flaskResponse.data]
    ).map((item) => ({
      description: item.description || "No description available",
      diets: Array.isArray(item.diets) ? item.diets : ["No diet information available"],
      disease: item.disease || "No disease information available",
      medications: Array.isArray(item.medications) ? item.medications : ["No medications available"],
      precautions: Array.isArray(item.precautions)
        ? item.precautions.filter((prec) => prec)
        : ["No precautions available"],
      probability: item.probability || 0.0,
      workout: Array.isArray(item.workout) ? item.workout : ["No workout information available"],
    }));
    
    // 3. Send analysis email
    // await sendAnalysisEmail(email, symptoms, normalizedData);
   
    // 4. Respond to frontend
    res.json(normalizedData);
  } catch (error) {
    console.error("Error in communication with Flask server or email sending", error.message);
    res.status(500).send("Internal server error");
  }
});







app.post("/api/:disease", async (req, res) => {
  const { disease } = req.params; // Get the disease from the URL
  const symptoms  = req.body; // Extract symptoms from the request body


   // Convert the symptoms array from strings to numbers
   const formattedSymptoms = symptoms.map(Number); // Convert all elements to numbers

  let flaskUrl; // Declare a variable to hold the Flask URL

  // Determine the appropriate Flask URL based on the disease type
  switch (disease) {
    case "parkinsonsdisease":
      // flaskUrl = "http://localhost:5001/predict_parkinsons";
      flaskUrl = `${process.env.FLASK_API_URL}/predict_parkinsons`;
      break;
    case "heartdisease":
      // flaskUrl = "http://localhost:5001/predict_heart_disease";
      flaskUrl = `${process.env.FLASK_API_URL}/predict_heart_disease`;
      break;
    case "diabetes":
      //  flaskUrl = "http://localhost:5001/predict_diabetes";
      flaskUrl = `${process.env.FLASK_API_URL}/predict_diabetes`;
      break;
    default:
      return res.status(400).send("Invalid disease type");
  }

  try {
    //Forwarding the symptoms data to the appropriate Flask server endpoint
    const flaskResponse = await axios.post(flaskUrl,formattedSymptoms);
    

    // Simplify the response
    const predictionKey = `${disease}_prediction`; // e.g., "diabetes_prediction"
    const predictionMessage = flaskResponse.data[predictionKey] || "No prediction available";

    // Send a simplified response back to the frontend
    res.json({ prediction: predictionMessage });
   
    
  } catch (error) {
    console.error("Error in communication with Flask server", error);
    res.status(500).send("Internal server error");
  }
});




// Proxy route to Flask
app.get('/get', async (req, res) => {
  try {
    const flaskResponse = await axios.get(
     `${process.env.CHATBOT_API_URL}/get`,{
      params: req.query, // Forward query params
      withCredentials: true, // Include cookies in the request
      headers: {
        Cookie: req.headers.cookie, // Forward cookies
      },
      timeout: 120000
    });

    // Send Flask's response back to React
    res.setHeader('Set-Cookie', flaskResponse.headers['set-cookie'] || []);
    res.json(flaskResponse.data);
  } catch (error) {
      console.error(
    "Chatbot Error:",
    error.response?.data || error.message
    );
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});



// =============================
// Start ML Flask API
// =============================

const mlApi = spawn("python", ["app.py"], {
  cwd: path.join(__dirname, "../flask"),
  stdio: "inherit",
  shell: true,
});

// =============================
// Start Chatbot Flask API
// =============================

const chatbotApi = spawn("python", ["app.py"], {
  cwd: path.join(
    __dirname,
    "../Disease-Symptom-Prediction-Chatbot-main"
  ),
  stdio: "inherit",
  shell: true,
});

// =============================
// Logs
// =============================

mlApi.on("close", (code) => {
  console.log(`ML API exited with code ${code}`);
});

chatbotApi.on("close", (code) => {
  console.log(`Chatbot API exited with code ${code}`);
});