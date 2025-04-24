
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); 
const { protect } = require('../middleware/authMiddleware');
const autRouter = express.Router();


const seedDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123', 10);

      const adminUser = new User({
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin1@gmail.com',
        password: hashedPassword,
        approved: true,  
      });

      await adminUser.save();
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default admin user:', error);
  }
};
seedDefaultAdmin();

//---------------------------User Registration---------------------------------------------------------------
autRouter.post('/register', async (req, res) => {
  const { role, title, firstName, lastName, email, password, mobileNumber, childName, childGender, childAge, address, moreInfo, specialization, yearsExperience } = req.body;

  const autNameRegex = /^[A-Za-z]+$/;
  const autMobileNumberRegex = /^\+[1-9]{1}[0-9]{3,14}$/;

  if (!autNameRegex.test(firstName)) {  //validate first name
    return res.status(400).json({ message: 'First name should only contain letters' });
  }

  if (!autNameRegex.test(lastName)) {
    return res.status(400).json({ message: 'Last name should only contain letters' });
  }

  if (!autMobileNumberRegex.test(mobileNumber)) {
    return res.status(400).json({ message: 'Mobile number should be valid and include country code' });
  }

  if (role === 'parent' && !autNameRegex.test(childName)) {
    return res.status(400).json({ message: 'Child name should only contain letters' });
  }
  if (role === 'caretaker' && (yearsExperience === undefined || yearsExperience === '')) {
    return res.status(400).json({ message: 'Years of experience is required for caretakers' });
  }

  if (role === 'therapist') {
    if (!specialization) {
      return res.status(400).json({ message: 'Specialization is required for therapists' });
    }
    if (yearsExperience === undefined || yearsExperience === '') {
      return res.status(400).json({ message: 'Years of experience is required for therapists' });
    }
  } 
  try {
    const autUserExists = await User.findOne({ email }); //checks email if already exist or not

    if (autUserExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const autUser = new User({ role, title, firstName, lastName, email, password, mobileNumber, childName, childGender, childAge, address, moreInfo, specialization, yearsExperience  });
    await autUser.save();

    res.status(201).json({ message: 'User registered, waiting for approval' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --------------------------For login-------------------------------------------------------
autRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const autUser = await User.findOne({ email });

    if (!autUser) {
      return res.status(400).json({ message: 'Email is not registered' });
    }

    if (!autUser.approved) {    //registration request sent but not approved by admin
      return res.status(403).json({ message: 'User is not approved by admin' });
    }

    const autIsMatch = await autUser.matchPassword(password);

    if (!autIsMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    const autToken = jwt.sign({ id: autUser._id, role: autUser.role }, process.env.AUT_AUTH_SEC_KEY, { expiresIn: '1h' });  //expires within 1 hr

    res.json({ token: autToken, role: autUser.role });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//----------------------------current child-----------------------------------
autRouter.get('/getCurrentChild', protect, async (req, res) => {
  try {
    const autChild = await User.findOne({ _id: req.user._id, role: 'parent' })
                            .select('childName childGender childAge address');
    if (!autChild) {
      return res.status(404).json({ message: 'Child not found' });
    }
    res.json(autChild);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//----------------------------------Get profile--------------------------------------------
autRouter.get('/profile', protect, async (req, res) => {
  try {
    const autProfile = await User.findById(req.user._id).select('-password');
    if (!autProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(autProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//-----------------------------Update profile----------------------------------------------
autRouter.put('/updateProfile', protect, async (req, res) => {
  const { firstName, lastName, email, mobileNumber, address, moreInfo, childName, childAge, childGender, yearsExperience, specialization } = req.body;
//--------------------------validation part------------------------
  const nameRegex = /^[A-Za-z]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mobileRegex = /^\+[1-9]{1}[0-9]{3,14}$/;
  
  const errors = {};


  if (!firstName || firstName.length < 2 || !nameRegex.test(firstName)) {
    errors.firstName = 'First name must be at least 2 characters long and contain only letters.';
  }

  if (!lastName || lastName.length < 2 || !nameRegex.test(lastName)) {
    errors.lastName = 'Last name must be at least 2 characters long and contain only letters.';
  }

  if (!email || !emailRegex.test(email)) {
    errors.email = 'Please enter a valid email address.';
  } else {
    try {
      const autUserExists = await User.findOne({ email });
      if (autUserExists) {
        errors.email = 'User already exists';
      }
    } catch (error) {
      console.error('Error checking existing email:', error);
      return res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  if (!mobileNumber || !mobileRegex.test(mobileNumber)) {
    errors.mobileNumber = 'Please enter a valid mobile number with country code (e.g., +1234567890).';
  }

  if (Object.keys(errors).length > 0) {
    const errorMessages = Object.values(errors).join(', ');
    
    return res.status(400).json({ 
      message: `Validation error: ${errorMessages}`, 
      errors 
    });
  }

  try {
    const autProfile = await User.findById(req.user._id);

    if (!autProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    autProfile.firstName = firstName || autProfile.firstName;
    autProfile.lastName = lastName || autProfile.lastName;
    autProfile.email = email || autProfile.email;
    autProfile.mobileNumber = mobileNumber || autProfile.mobileNumber;
    autProfile.address = address || autProfile.address;
    autProfile.moreInfo = moreInfo || autProfile.moreInfo;

    if (autProfile.role === 'parent') {
      autProfile.childName = childName || autProfile.childName;
      autProfile.childAge = childAge || autProfile.childAge;
      autProfile.childGender = childGender || autProfile.childGender;
    }

    if (autProfile.role === 'caretaker' || autProfile.role === 'therapist') {
      autProfile.yearsExperience = yearsExperience || autProfile.yearsExperience;
    }

    if (autProfile.role === 'therapist') {
      autProfile.specialization = specialization || autProfile.specialization;
    }

    const autUpdatedProfile = await autProfile.save();
    

    const autResponse = {
      _id: autUpdatedProfile._id,
      role: autUpdatedProfile.role,
      title: autUpdatedProfile.title,
      firstName: autUpdatedProfile.firstName,
      lastName: autUpdatedProfile.lastName,
      email: autUpdatedProfile.email,
      mobileNumber: autUpdatedProfile.mobileNumber,
      address: autUpdatedProfile.address,
      moreInfo: autUpdatedProfile.moreInfo,
      approved: autUpdatedProfile.approved,
      yearsExperience: autUpdatedProfile.yearsExperience,
    };

    if (autProfile.role === 'parent') {
      autResponse.childName = autUpdatedProfile.childName;
      autResponse.childAge = autUpdatedProfile.childAge;
      autResponse.childGender = autUpdatedProfile.childGender;
    }

    if (autProfile.role === 'therapist') {
      autResponse.specialization = autUpdatedProfile.specialization;
    }

    res.json(autResponse);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = autRouter;
