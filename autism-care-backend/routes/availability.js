const express = require('express');
const autRouter = express.Router();
const { protect } = require('../middleware/authMiddleware');
const AvailabilityModel = require('../models/Availability'); 
const autUpdateAppandAvail = require('../middleware/updateStatus');
const autSendEmail = require('../utils/mailer');
const autAppointment = require('../models/Appointment');

//--------------------function to generate time slots---------------------
const autGenerateTimeSlots = (startTime, endTime, slotDuration, breakTime) => {
  const autStart = new Date(`2020-01-01T${startTime}:00`);
  const autEnd = new Date(`2020-01-01T${endTime}:00`);
  const autSlots = [];
  const autDuration = slotDuration * 60000; // 1hr
  while (autStart.getTime() + autDuration <= autEnd.getTime()) {  
    const autSlotStart = new Date(autStart);
    if (breakTime && autSlotStart.getHours() === breakTime.start.getHours()) {
      autStart.setHours(breakTime.end.getHours(), breakTime.end.getMinutes());
      continue;
    }
    const autSlotEnd = new Date(autStart.getTime() + autDuration);
    autSlots.push({ startTime: autSlotStart.toTimeString().substring(0, 5), endTime: autSlotEnd.toTimeString().substring(0, 5) });
    autStart.setTime(autSlotEnd.getTime()); 
  }
  return autSlots;
};
//-----------------------------set availability-----------------------------------------------------
autRouter.post('/setAvailability',autUpdateAppandAvail, protect, async (req, res) => {
  const { dates, startTime = '09:00', endTime = '19:00' } = req.body; // (9.00am - 7.00pm)
  const autTherapistId = req.user._id;
  const autSlotDuration = 60; 
  const autLunchBreak = { start: new Date(`2020-01-01T13:00:00`), end: new Date(`2020-01-01T14:00:00`) };
  try {
    const autAvailabilities = dates.map(dateStr => {
      const autDate = new Date(dateStr);
      if (isNaN(autDate)) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      const autSlots = autGenerateTimeSlots(startTime, endTime, autSlotDuration, autLunchBreak);
      return {
        therapist: autTherapistId,
        date: autDate,
        slots: autSlots
      };});
    await AvailabilityModel.insertMany(autAvailabilities);
    res.status(201).json({ message: 'Availability set successfully with time slots' });
  } catch (error) {
    console.error('Error setting availability:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//--------------------------get availability----------------------------------------------------
autRouter.get('/getAvailability', protect,autUpdateAppandAvail, async (req, res) => {
  const autTherapistId = req.user._id;
  const autCurrentDate = new Date();
  autCurrentDate.setHours(0, 0, 0, 0); 

  try {
    const availability = await AvailabilityModel.find({ 
      therapist: autTherapistId,
      date: { $gte: autCurrentDate }
    });
    res.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//-------------------cancel availability-----------------------------------------------
autRouter.put('/cancelAvailability/:id', protect,autUpdateAppandAvail, async (req, res) => {
  const { cancelType } = req.body; 
  const autAvailabilityId = req.params.id;

  try {
    console.log(`Attempting to cancel availability with ID: ${autAvailabilityId} and cancel type: ${cancelType}`);

    const availabilityRecord = await AvailabilityModel.findById(autAvailabilityId).populate('therapist');
    if (!availabilityRecord) {
      console.log(`Availability with ID ${autAvailabilityId} not found`);
      return res.status(404).json({ message: 'Availability not found' });
    }

    const autAppointmentDate = availabilityRecord.date;
    const autTherapistId = availabilityRecord.therapist._id;

    const autStartOfDay = new Date(autAppointmentDate);
    autStartOfDay.setUTCHours(0, 0, 0, 0);

    const autEndOfDay = new Date(autAppointmentDate);
    autEndOfDay.setUTCHours(23, 59, 59, 999);

    let autAppointmentsToCancel = await autAppointment.find({
      therapist: autTherapistId,
      date: {
        $gte: autStartOfDay,
        $lte: autEndOfDay
      },
      status: 'approved'
    }).populate('parent', 'email');

    if (cancelType !== 'wholeDay') {
      autAppointmentsToCancel = autAppointmentsToCancel.filter(autAppointment => {
        const [hour, minute] = autAppointment.time.split(':').map(Number);
        const autAppointmentTimeInMinutes = hour * 60 + minute;

        if (cancelType === 'firstHalf') {
          return autAppointmentTimeInMinutes < 13 * 60; // Before 13:00
        } else if (cancelType === 'secondHalf') {
          return autAppointmentTimeInMinutes >= 13 * 60; // 13:00 and after
        }
      });

      console.log(`Filtered to ${autAppointmentsToCancel.length} appointments to cancel based on time.`);
    }

    for (const autAppointment of autAppointmentsToCancel) {
      autAppointment.status = 'cancelled';
      await autAppointment.save();

      await autSendEmail({
        to: autAppointment.parent.email,
        subject: 'Appointment Cancelled',
        text: `Dear Parent,
We regret to inform you that the appointment for your child, ${autAppointment.childName}, scheduled on ${new Date(autAppointment.date).toLocaleDateString()} at ${autAppointment.time} has been cancelled due to the therapist's unavailability. We apologize for the inconvenience.`,
        html: `<p>Dear Parent,</p>
<p>We regret to inform you that the appointment for your child, <strong>${autAppointment.childName}</strong>, scheduled on ${new Date(autAppointment.date).toLocaleDateString()} at ${autAppointment.time} has been cancelled due to the therapist's unavailability.</p>`
      });
    }

    if (cancelType === 'wholeDay') {
      await AvailabilityModel.findByIdAndDelete(autAvailabilityId);
      res.json({ message: 'Availability cancelled for the whole day' });
    } else {
      if (cancelType === 'firstHalf') {
        availabilityRecord.firstHalfCancelled = true;
      } else if (cancelType === 'secondHalf') {
        availabilityRecord.secondHalfCancelled = true;
      }

      const autUpdatedSlots = availabilityRecord.slots.filter(slot => {
        const autSlotTime = parseInt(slot.startTime.split(':')[0]);
        if (cancelType === 'firstHalf') {
          return autSlotTime >= 13; 
        } else if (cancelType === 'secondHalf') {
          return autSlotTime < 13; 
        }
        return true;
      });

      availabilityRecord.slots = autUpdatedSlots;

      if (availabilityRecord.slots.length === 0) {
        await AvailabilityModel.findByIdAndDelete(autAvailabilityId);
        res.json({ message: 'Availability cancelled for the whole day' });
      } else {
        await availabilityRecord.save();
        res.json({ message: 'Availability updated successfully' });
      }
    }
  } catch (error) {
    console.error('Error cancelling availability:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = autRouter;

