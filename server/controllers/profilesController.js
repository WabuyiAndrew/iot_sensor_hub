const Patient = require("../models/patient.js");
const Profile = require("../models/profile.js");
const Vital = require("../models/vital.js");
const { createSecretToken } = require("../util/SecretToken.js");
const bcrypt = require("bcryptjs"); // Import bcryptjs for password hashing

const fetchData = async (req, res) => {
  const vital = await Vital.find();
  return res.json({ vital });
};

const fetchProfile = async (req, res, next) => {
  try {
    const { patientid } = req.body;
    const vital = await Vital.findOne({ patientid });
    const user = await Patient.findOne({ patientid });
    res.json({
      user,
      vital,
    });
    // Remove next() after sending response. This line can cause "Cannot set headers after they are sent" error.
    // next();
  } catch (error) {
    console.error(error);
    // Send a 500 Internal Server Error response for unexpected errors
    res.status(500).json({ message: "Server error fetching profile.", success: false });
  }
};

const createProfile = async (req, res, next) => {
  try {
    const {
      firstname,
      lastname,
      username,
      mobno,
      emailid, // Ensure emailid is destructured for checks
      password,
      category,
      passkey,
    } = req.body;

    // 1. Check if user with this email already exists
    const existingUser = await Profile.findOne({ emailid });
    if (existingUser) {
      // If user exists, send a 409 Conflict status and include the existing email
      return res.status(409).json({
        message: `User with email ${emailid} already exists.`,
        success: false,
        existingEmail: emailid, // Send the email back for frontend display
      });
    }

    // 2. Validate the passkey based on category
    // These passkeys should ideally be stored as environment variables, not hardcoded.
    const DOCTOR_PASSKEY = "abcd"; // Example hardcoded passkey for doctor
    const NURSE_PASSKEY = "efgh"; // Example hardcoded passkey for nurse

    if (
      (category === "doctor" && passkey === DOCTOR_PASSKEY) ||
      (category === "nurse" && passkey === NURSE_PASSKEY)
    ) {
      // 3. Hash the password before saving (CRITICAL SECURITY STEP)
      const salt = await bcrypt.genSalt(10); // Generate a salt (cost factor 10)
      const hashedPassword = await bcrypt.hash(password, salt); // Hash the plain text password

      // 4. Create the new user profile in the database
      const user = await Profile.create({
        firstname,
        lastname,
        username,
        mobno,
        emailid,
        password: hashedPassword, // Save the hashed password, NOT the plain text one
        category,
      });

      // 5. Create a JWT token for the newly signed-up user
      const token = createSecretToken(JSON.stringify(user._id));

      // 6. Send successful signup response
      res.status(201).json({ // 201 Created status for successful resource creation
        message: "User signed up successfully",
        success: true,
        user: { // You might want to omit sensitive data like password here
          _id: user._id,
          username: user.username,
          emailid: user.emailid,
          category: user.category
        },
        token: token,
      });
    } else {
      // If passkey is invalid, send a 401 Unauthorized status
      return res.status(401).json({
        message: "Invalid Passkey",
        success: false,
      });
    }

    // Remove next() call after sending response. This line can cause "Cannot set headers after they are sent" error.
    // next();
  } catch (error) {
    console.error("Backend Error in createProfile:", error);
    // Send a 500 Internal Server Error response for unexpected errors during signup process
    res.status(500).json({ message: "Server error during signup.", success: false });
  }
};

const createPatientProfile = async (req, res, next) => {
  try {
    const {
      patientid,
      patientname,
      dateofadm,
      age,
      relmobno,
      sex,
      address,
      room,
      occupation,
      isolation,
      precautions,
      allergies,
      admdiagnosis,
      docuavail,
      history,
    } = req.body;
    const existingUser = await Patient.findOne({ patientid });
    if (existingUser) {
      return res.status(409).json({ message: "Patient already exists" }); // Changed to 409 Conflict
    }
    await Patient.create({
      patientid,
      patientname,
      dateofadm,
      age,
      relmobno,
      sex,
      address,
      room,
      occupation,
      isolation,
      precautions,
      allergies,
      admdiagnosis,
      docuavail,
      history,
    });

    res.status(201).json({
      message: "Patient profile created successfully",
      success: true,
    });
    // Remove next() after sending response.
    // next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating patient profile.", success: false });
  }
};

const addPatientVital = async (req, res, next) => {
  try {
    const {
      patientid,
      patientname,
      drincharge,
      nurseupdate,
      update,
      temp,
      heartrate,
      resprate,
      oxysat,
      sysbp,
      dibp,
    } = req.body;
    const existingUser = await Vital.findOne({ patientid });
    if (existingUser) {
      existingUser.update.push(update);
      existingUser.nurseupdate.push(nurseupdate);
      existingUser.temp.push(temp);
      existingUser.heartrate.push(heartrate);
      existingUser.resprate.push(resprate);
      existingUser.oxysat.push(oxysat);
      existingUser.sysbp.push(sysbp);
      existingUser.dibp.push(dibp);
      await existingUser.save();
      return res.json({ message: "Vitals Updated Successfully" }); // Consider a 200 OK or 204 No Content for updates
    }
    await Vital.create({
      patientid,
      patientname,
      drincharge,
      nurseupdate,
      update,
      temp,
      heartrate,
      resprate,
      oxysat,
      sysbp,
      dibp,
    });

    res.status(201).json({
      message: "Vitals added successfully",
      success: true,
    });
    // Remove next() after sending response.
    // next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error adding patient vital.", success: false });
  }
};

const updateProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    const { firstname, lastname, username, mobno, emailid, password } = req.body;

    // IMPORTANT: If password is being updated, hash it here too!
    let updateFields = { firstname, lastname, username, mobno, emailid };
    if (password) {
        const salt = await bcrypt.genSalt(10);
        updateFields.password = await bcrypt.hash(password, salt);
    }

    await Profile.findByIdAndUpdate(profileId, updateFields, { new: true }); // {new: true} returns the updated document

    const profile = await Profile.findById(profileId);
    res.json({ profile }); // 200 OK is default for res.json()
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating profile.", success: false });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const profileId = req.params.id;
    const result = await Profile.deleteOne({ _id: profileId }); // Use _id for Mongoose IDs
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Profile not found." });
    }
    res.json({ success: "Record deleted" }); // 200 OK is default
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting profile.", success: false });
  }
};

const checkProfile = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" }); // 400 Bad Request
    }
    const user = await Profile.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Incorrect username or password" }); // 401 Unauthorized
    }
    // Compare provided password with the hashed password in the DB
    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(401).json({ message: "Incorrect username or password" }); // 401 Unauthorized
    }
    const token = createSecretToken(user._id);
    res.status(200).json({ // 200 OK for successful login
      message: "User logged in successfully",
      success: true,
      id: user._id,
      token: token,
      category: user.category // Include category for frontend routing/permissions
    });
    // Remove next() after sending response.
    // next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during login.", success: false });
  }
};

module.exports = {
  addPatientVital,
  createPatientProfile,
  fetchData,
  fetchProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  checkProfile,
};