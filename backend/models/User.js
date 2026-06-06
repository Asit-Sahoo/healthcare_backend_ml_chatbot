
const mongoose = require("mongoose");

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Doctor schema
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  specialize: { type: String, required: true },
});

// Admin schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Contact schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

// Request schema
const requestSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  requests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
      userName: { type: String, required: true },
      gender: { type: String, required: true },
      age: { type: Number, required: true },
      symptoms: { type: String, required: true },
      phone: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }, // Timestamp for queue order
    },
  ],
});

// GetRequest schema
const getRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true }, // Primary key
  requests: [
    {
      doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true }, // Reference to the doctor
      symptoms: { type: String, required: true },
      prescription: { type: String, required: true }, // Prescription provided by the doctor
      dietPrecaution: { type: String, required: true }, // Precautionary measures/diet suggestions
      dateTime: { type: Date, default: Date.now }, // Timestamp for the record
    },
  ],
});


const doneRequestSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  requests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
      userName: { type: String, required: true },
      gender: { type: String, required: true },
      age: { type: Number, required: true },
      symptoms: { type: String, required: true },
      phone: { type: String, required: true },
      lastPrescribedDate: { type: Date, default: Date.now }, // Last prescribed date (for tracking the order)
      prescription: { type: String, required: true }, // Prescription provided by the doctor
      dietPrecaution: { type: String, required: true }, // Precautionary measures/diet suggestions
    },
  ],
});

// Models
const User = mongoose.model("User", userSchema);
const Doctor = mongoose.model("Doctor", doctorSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Contact = mongoose.model("Contact", contactSchema);
const Request = mongoose.model("Request", requestSchema);
const GetRequest = mongoose.model("GetRequest", getRequestSchema);
const DoneRequest = mongoose.model("DoneRequest", doneRequestSchema);

// Export all models
module.exports = {
  User,
  Doctor,
  Admin,
  Contact,
  Request, // Export the Request model instead of the raw schema
  GetRequest, 
  DoneRequest,
};


