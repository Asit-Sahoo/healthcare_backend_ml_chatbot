const express = require("express");
const router = express.Router();
const { User, Doctor, Admin, Contact,Request,GetRequest,DoneRequest} = require("../models/User");

// Route to get all doctors
router.get("/viewdoctor", async (req, res) => {
    
  try {
    const doctors = await Doctor.find(); // Fetch all doctors from the database
    //console.log(doctors);
    res.status(200).json(doctors); // Send doctors as a JSON response
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ error: "Error fetching doctors" });
  }
});


router.post("/submitRequest", async (req, res) => {
  try {
    const { doctorId, userId, userName, gender, age, symptoms, phone } = req.body;

    // Validate required fields
    if (!doctorId || !userId || !userName || !gender || !age || !symptoms || !phone) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Validate phone number format
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
    }

    // Find the request record for the doctor
    let requestRecord = await Request.findOne({ doctorId });

    if (!requestRecord) {
      // Create a new record if none exists for the doctor
      requestRecord = new Request({
        doctorId,
        requests: [
          { userId, userName, gender, age, symptoms, phone, createdAt: new Date() },
        ],
      });
    } else {
      // Append the new request to the existing record
      requestRecord.requests.push({
        userId,
        userName,
        gender,
        age,
        symptoms,
        phone,
        createdAt: new Date(),
      });
    }

    // Save the request record
    await requestRecord.save();

    res.status(201).json({ message: "Request submitted successfully!" });
  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/requests/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const requestRecord = await Request.findOne({ doctorId }).populate("requests.userId", "name email");

    if (!requestRecord || requestRecord.requests.length === 0) {
      return res.status(404).json({ message: "No requests found for this doctor." });
    }

    res.status(200).json({ requests: requestRecord.requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.post("/prescribe", async (req, res) => {
  try {
    const { userId, doctorId,symptoms, prescription, precaution } = req.body;
    console.log(symptoms);

    // Validate required fields
    if (!userId || !doctorId || !symptoms || !prescription || !precaution) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Step 1: Find existing prescription records for the user
    let prescriptionRecord = await GetRequest.findOne({ userId });

    if (!prescriptionRecord) {
      // Create a new prescription record if none exists for the user
      prescriptionRecord = new GetRequest({
        userId,
        requests: [
          {
            doctorId,
            symptoms:symptoms,
            prescription,
            dietPrecaution: precaution,
            dateTime: new Date(),
          },
        ],
      });
    } else {
      // Append the new prescription to the existing record
      prescriptionRecord.requests.push({
        doctorId,
        symptoms:symptoms,
        prescription,
        dietPrecaution: precaution,
        dateTime: new Date(),
      });
    }

    // Step 2: Save the prescription record
    await prescriptionRecord.save();

    // Step 3: Find the original request from the Request collection
    const requestRecord = await Request.findOne({ doctorId });

    if (!requestRecord) {
      return res.status(404).json({ message: "Request record not found." });
    }

    // Step 4: Find the specific request for this user
    const userRequestIndex = requestRecord.requests.findIndex((req) => {
      // Extract the ObjectId from userId and compare with req.userId
      return req.userId.toString() === userId._id.toString(); // Compare ObjectIds
    });

    if (userRequestIndex === -1) {
      return res.status(404).json({ message: "Request not found." });
    }

    // Step 5: Find the existing DoneRequest for the doctor and add the new prescription to the array
    let doneRequest = await DoneRequest.findOne({ doctorId });

    if (!doneRequest) {
      // If no DoneRequest exists for this doctor, create a new one
      doneRequest = new DoneRequest({
        doctorId,
        requests: [
          {
            userId: userId._id,
            userName: requestRecord.requests[userRequestIndex].userName,
            gender: requestRecord.requests[userRequestIndex].gender,
            age: requestRecord.requests[userRequestIndex].age,
            symptoms: requestRecord.requests[userRequestIndex].symptoms,
            phone: requestRecord.requests[userRequestIndex].phone,
            lastPrescribedDate: new Date(),
            prescription,
            dietPrecaution: precaution,
          },
        ],
      });
    } else {
      // If DoneRequest exists, append the new prescribed request to the requests array
      doneRequest.requests.push({
        userId: userId._id,
        userName: requestRecord.requests[userRequestIndex].userName,
        gender: requestRecord.requests[userRequestIndex].gender,
        age: requestRecord.requests[userRequestIndex].age,
        symptoms: requestRecord.requests[userRequestIndex].symptoms,
        phone: requestRecord.requests[userRequestIndex].phone,
        lastPrescribedDate: new Date(),
        prescription,
        dietPrecaution: precaution,
      });
    }

    // Step 6: Save the updated done request with the new prescription
    await doneRequest.save();

    // Step 7: Remove the request from the Request collection (mark as completed)
    requestRecord.requests.splice(userRequestIndex, 1); // Remove the specific request
    await requestRecord.save();

    res.status(201).json({ message: "Prescription completed successfully!" });
  } catch (error) {
    console.error("Error submitting prescription:", error);
    res.status(500).json({ message: "Server error." });
  }
});



router.get('/donerequests/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Fetch done requests from the DoneRequest collection
    const doneRequestRecord = await DoneRequest.findOne({ doctorId }).populate('requests.userId', 'name email');

    if (!doneRequestRecord || doneRequestRecord.requests.length === 0) {
      return res.status(404).json({ message: "No prescribed requests found for this doctor." });
    }

    res.status(200).json({ requests: doneRequestRecord.requests });
  } catch (error) {
    console.error("Error fetching prescribed requests:", error);
    res.status(500).json({ message: "Server error." });
  }
});

router.get("/appointment", async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate the userId parameter
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Fetch the user's requests from the GetRequest collection
    const userAppointments = await GetRequest.findOne({ userId });

    // Check if appointments exist for the user
    if (!userAppointments || userAppointments.requests.length === 0) {
      return res.status(404).json({ message: "No appointments found for this user." });
    }

    // Populate the doctor details for each request
    const populatedAppointments = await Promise.all(
      userAppointments.requests.map(async (request) => {
        const doctor = await Doctor.findById(request.doctorId);

        if (!doctor) {
          throw new Error(`Doctor with ID ${request.doctorId} not found.`);
        }

        return {
          doctorName: doctor.name,
          doctorSpecialize: doctor.specialize,
          symptoms: request.symptoms,
          prescription: request.prescription,
          dietPrecaution: request.dietPrecaution,
          dateTime: request.dateTime,
        };
      })
    );

    console.log(populatedAppointments);
    // Send the formatted data to the frontend
    res.status(200).json(populatedAppointments);

  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Server error." });
  }
});




module.exports = router;
