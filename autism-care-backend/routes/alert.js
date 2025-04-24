
const express = require('express');
// const mongoose = require('mongoose');
const { protect, caretaker } = require('../middleware/authMiddleware');
const autShift = require('../models/Shift');
const autUser = require('../models/User');  
const nodemailer = require('nodemailer');
const autAlert = require('../models/Alert'); 
const twilio = require('twilio');

const autRouter = express.Router();

const autAccountSid = process.env.AUT_TWILIO_SID;
const autAuthToken = process.env.AUT_TWILIO_AUTHTOKEN;
const autClient = new twilio(autAccountSid, autAuthToken);

const autTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUT_EMAIL,  
    pass: process.env.AUT_EMAIL_PASS
  }
});

//-----------------------------------------for sending SMS------------------------------------------------
autRouter.post('/sendSMS', protect, caretaker, async (req, res) => {
  const { message, recipients, childId } = req.body;
  console.log('Received childId:', childId);
  console.log('CaretakerId:', req.user._id);
  console.log('Message:', message);
  try {
    const autSmsPromises = recipients.map(recipient => 
      autClient.messages.create({
        body: message,
        from: '+447458657172', 
        to: recipient
      })
    );
    await Promise.all(autSmsPromises);
    const autAlertRecord = await autAlert.findOneAndUpdate(
      { childId, caretakerId: req.user._id, date: new Date().toISOString().split('T')[0] },
      {
        $addToSet: { type: 'SMS', recipients: { $each: recipients } }, 
        message: message
      },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'SMS sent successfully', alert: autAlertRecord });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
});

//-----------------------------------------for sending Email--------------------------------------------------
autRouter.post('/sendEmail', protect, caretaker, async (req, res) => {
  const { message, recipients, childId } = req.body;
  const autMailOptions = {
    from: 'madhushreekanagaraj@gmail.com',
    subject: 'Emergency Alert',
    text: message
  };
  try {
    const autEmailPromises = recipients.map(recipient => 
      autTransporter.sendMail({ ...autMailOptions, to: recipient })
    );
    await Promise.all(autEmailPromises);

    const autAlertRecord = await autAlert.findOneAndUpdate(
      { childId, caretakerId: req.user._id, date: new Date().toISOString().split('T')[0] },
      {
        $addToSet: { type: 'Email', recipients: { $each: recipients } }, 
        message: message
      },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Email sent successfully', alert: autAlertRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

//----------------------------------------get child details------------------------------------------
autRouter.get('/ChildDetails', protect, caretaker, async (req, res) => {
  try {
    const autCurrentDate = new Date();
    autCurrentDate.setHours(0, 0, 0, 0);
    const autEndOfToday = new Date(autCurrentDate).setHours(23, 59, 59, 999);

    const autShiftRecord = await autShift.findOne({
        caretakerId: req.user._id,
        status: 'accepted',
        startDate: { $lte: autEndOfToday },
        endDate: { $gte: autCurrentDate }
    }).populate('childId');

    if (!autShiftRecord || !autShiftRecord.childId) {
        return res.status(404).json({ message: 'No child is assigned for today' });
    }

    const autChildDetails = await autUser.findById(autShiftRecord.childId._id);
    if (!autChildDetails) {
        return res.status(404).json({ message: 'Child details not found' });
    }

    const autAdmins = await autUser.find({ role: 'admin' }).select('mobileNumber email');

    res.json({
        childId: autChildDetails._id,
        childName: autChildDetails.childName,
        smsRecipient: autChildDetails.mobileNumber,
        emailRecipient: autChildDetails.email,
        gender: autChildDetails.childGender,
        age: autChildDetails.childAge,
        address: autChildDetails.address,
        admins: autAdmins
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = autRouter;

