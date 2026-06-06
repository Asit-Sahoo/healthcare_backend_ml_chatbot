const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const { User, Doctor, Admin, Contact } = require("../models/User");

// Get all doctors
router.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Error fetching doctors" });
  }
});

// Add a doctor
router.post("/addDoctor", async (req, res) => {
    const { name, email, password,  specialize } = req.body;
    try {
      console.log("Incoming Data:", req.body);
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newDoctor = new Doctor({
        name,
        email,
        password: hashedPassword,
        specialize,
      });
  
      const savedDoctor = await newDoctor.save();
      res.status(201).json(savedDoctor);
    } catch (error) {
      console.error("Error saving doctor:", error);
  
      // Handle duplicate email error
      if (error.code === 11000) {
        return res.status(400).json({ error: "Email already exists" });
      }
  
      res.status(500).json({ error: "Error adding doctor" });
    }
  });
  

// Delete a doctor
router.delete("/deleteDoctor/:id", async (req, res) => {
  try {
    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting doctor" });
  }
});

// Add an admin
router.post("/addAdmin", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword,
    });
    const savedAdmin = await newAdmin.save();
    res.json(savedAdmin);
  } catch (error) {
    res.status(500).json({ error: "Error adding admin" });
  }
});

module.exports = router;
