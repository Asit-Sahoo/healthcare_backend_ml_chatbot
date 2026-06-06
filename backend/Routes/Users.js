

// module.exports = router;
const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "asitvanced2002@gmail.com",
    pass: "xpak ymcx kmed hjdr", // App password
  },
});

// Emergency alert email endpoint
router.post('/emergency-alert', async (req, res) => {
  const { email, mobile, location } = req.body;

  if (!email || !mobile || !location) {
    return res.status(400).json({ message: 'Missing data' });
  }

  const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  const mailOptions = {
    from: '"HealthCare App" <asitvanced2002@gmail.com>',
    to: 'asitsahoo3921@gmail.com',
    subject: '🚨 Emergency Alert Sent!',
    text: `Emergency alert sent by:
Mobile: ${mobile}
Email: ${email}
Location: Latitude: ${location.latitude}, Longitude: ${location.longitude}
Google Maps: ${googleMapsLink}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Emergency email sent successfully' });
  } catch (error) {
    console.error('Error sending emergency email:', error);
    res.status(500).json({ message: 'Email failed' });
  }
});

module.exports = router;

