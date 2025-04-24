// const express = require('express');
// const router = express.Router();
// const { protect, therapist } = require('../middleware/authMiddleware');
// const User = require('../models/User');
// const Availability = require('../models/Availability');
// const autSendEmail = require('../utils/mailer');
// const Appointment = require('../models/Appointment');
// const updateAppandAvail = require('../middleware/updateStatus');
// const schedule = require('node-schedule');

// //-------------------------get specialization----------------------------------
// router.get('/specializations', async (req, res) => {
//   try {
//     const specializations = await User.distinct('specialization', { role: 'therapist' });
//     res.json(specializations);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// //---------------------------get therapist based on specialization-------------------
// router.get('/therapists', async (req, res) => {
//   const { specialization } = req.query;
//   try {
//     const therapists = await User.find({ specialization, role: 'therapist' , approved: true});
//     res.json(therapists.map(therapist => ({
//       id: therapist._id,
//       name: therapist.firstName + ' ' + therapist.lastName
//     })));
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// //----------------------------therapist available dates--------------------------------
// router.get('/availabilityDates', updateAppandAvail, async (req, res) => {
//   const { therapistId } = req.query;
//   try {
//     const availability = await Availability.find({ therapist: therapistId }).select('date');
//     const availableDates = availability.map(avail => avail.date.toISOString().split('T')[0]);
//     res.json(availableDates);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });
// // router.get('/availabilityDates', async (req, res) => {
// //   const { therapistId } = req.query;
// //   try {
// //     const availability = await Availability.find({ therapist: therapistId }).select('date');
// //     const availableDates = availability.map(avail => avail.date.toISOString().split('T')[0]);
// //     res.json(availableDates);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // });

// // ----------------------------get time slots for that particular date------------------------------------
// router.get('/availableSlots', updateAppandAvail, async (req, res) => {
//   const { therapistId, date } = req.query;
//   try {
//     const availability = await Availability.findOne({ therapist: therapistId, date: new Date(date) });
    
//     if (!availability) {
//       return res.status(404).json({ message: 'No availability found for the selected date' });
//     }

//     res.json(availability.slots);  
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // router.get('/availableSlots', async (req, res) => {
// //   const { therapistId, date } = req.query;
// //   try {
// //     // Convert the date to a range to match any time within the date
// //     const startOfDay = new Date(date);
// //     startOfDay.setHours(0, 0, 0, 0);

// //     const endOfDay = new Date(date);
// //     endOfDay.setHours(23, 59, 59, 999);

// //     const availability = await Availability.findOne({
// //       therapist: therapistId,
// //       date: { $gte: startOfDay, $lte: endOfDay }
// //     });

// //     if (!availability) {
// //       return res.status(404).json({ message: 'No availability found for the selected date' });
// //     }

// //     res.json(availability.slots);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // });


// //------------------------------------book appointment--------------------------------------------------
// router.post('/bookAppointment', protect, async (req, res) => {
//   const { therapistId, date, time } = req.body;
//   try {
//     const appointmentDate = new Date(`${date}T${time}`);
//     const currentDate = new Date();
//     const diffHours = (appointmentDate.getTime() - currentDate.getTime()) / (1000 * 3600);

//     if (diffHours < 24) {
//       return res.status(400).json({ message: 'Appointments must be scheduled at least 24 hours in advance.' });
//     }

//     const parent = req.user._id;
//     const child = await User.findById(parent);
  
//     if (!child) {
//       return res.status(400).json({ message: 'No child details associated with the parent' });
//     }

//     const appointment = new Appointment({
//       therapist: therapistId,
//       parent,
//       patient: child._id,
//       date: appointmentDate,
//       time,
//       childName: child.childName,
//       childGender: child.childGender,
//       childAge: child.childAge
//     });

//     await Availability.updateOne(
//       { therapist: therapistId, date: appointmentDate, 'slots.startTime': time },
//       { $set: { 'slots.$.isBooked': true } }
//     );

//     await appointment.save();
//     res.status(201).json(appointment);
//   } catch (error) {
//     console.error('Failed to book appointment:', error.message);
//     res.status(500).json({ message: 'Failed to book appointment', error: error.message });
//   }
// });

// // router.post('/bookAppointment', protect, async (req, res) => {
// //   const { therapistId, date, time } = req.body;
// //   try {
// //     const parent = req.user._id;
// //     const child = await User.findById(parent);

// //     if (!child) {
// //       return res.status(400).json({ message: 'No child details associated with the parent' });
// //     } 
// //     const appointment = new Appointment({
// //       therapist: therapistId,
// //       parent,
// //       patient: child._id,
// //       date: new Date(date),
// //       time,
// //       childName: child.childName,
// //       childGender: child.childGender,
// //       childAge: child.childAge
// //     });
// //   await Availability.updateOne(
// //     { therapist: therapistId, date: new Date(date), 'slots.startTime': time },
// //     { $set: { 'slots.$.isBooked': true } }
// //   );
// //   await appointment.save();
// //   res.status(201).json(appointment);
// // } catch (error) {
// //   console.error('Failed to book appointment:', error.message);
// //   res.status(500).json({ message: 'Failed to book appointment', error: error.message });
// // }
// // });

// //-------------------------------therapist get the request----------------------------------------
// router.get('/requests', updateAppandAvail, async (req, res) => {
//   try {
//     const appointments = await Appointment.find({
//       therapist: req.user._id,  
//       status: 'pending'
//     })
//     .populate('parent', 'firstName lastName email childName childGender childAge');

//     res.json(appointments);
//   } catch (error) {
//     res.status(500).send({ message: 'Error fetching appointment requests', error });
//   }
// });

// // ---------------------------therapist approve appointment--------------------------------------------
// router.post('/approve/:id', updateAppandAvail, async (req, res) => {
//   try {
//     const appointment = await Appointment.findById(req.params.id);
//     const appointmentDate = new Date(appointment.date);
//     const currentDate = new Date();
//     const diffHours = (appointmentDate.getTime() - currentDate.getTime()) / (1000 * 3600);

//     if (diffHours < 24) {
//       return res.status(400).json({ message: 'Cannot approve appointments scheduled within 24 hours.' });
//     }

//     const updatedAppointment = await Appointment.findByIdAndUpdate(
//       req.params.id,
//       { status: 'approved' },
//       { new: true }
//     ).populate('therapist', 'firstName lastName specialization')
//      .populate('parent', 'email');

//     if (!updatedAppointment) {
//       return res.status(404).json({ message: 'Appointment not found' });
//     }
// // router.post('/approve/:id', async (req, res) => {
// //   try {
// //     const updatedAppointment = await Appointment.findByIdAndUpdate(
// //       req.params.id,
// //       { status: 'approved' },
// //       { new: true }
// //     )
// //       .populate('therapist', 'firstName lastName specialization')
// //       .populate('parent', 'email');

// //     if (!updatedAppointment) {
// //       return res.status(404).json({ message: 'Appointment not found' });
// //     }
//     await autSendEmail({
//       to: updatedAppointment.parent.email,
//       subject: 'Appointment Approved',
//       text: `Dear Parent,
      
//       We are pleased to inform you that your appointment has been approved. Below are the details of your scheduled appointment:
      
//         - Therapist: Dr. ${updatedAppointment.therapist.firstName} ${updatedAppointment.therapist.lastName}
//         - Specialization: ${updatedAppointment.therapist.specialization}
//         - Child's Name: ${updatedAppointment.childName}
//         - Child's Age: ${updatedAppointment.childAge} years
//         - Child's Gender: ${updatedAppointment.childGender}
//         - Date: ${new Date(updatedAppointment.date).toLocaleDateString()}
//         - Time: ${updatedAppointment.time}
      
//       Please ensure to arrive at least 10 minutes before the scheduled time. If you need to reschedule or have any questions, do not hesitate to contact us.
      
//       Thank you for choosing our services.
      
//       Best regards,
//       The Care Team`,
//       html: `<p>Dear Parent,</p>
      
//       <p>We are pleased to inform you that your appointment has been approved. Below are the details of your scheduled appointment:</p>
      
//     <ul>
//       <li><strong>Therapist:</strong> Dr. ${updatedAppointment.therapist.firstName} ${updatedAppointment.therapist.lastName}</li>
//       <li><strong>Specialization:</strong> ${updatedAppointment.therapist.specialization}</li>
//       <li><strong>Child's Name:</strong> ${updatedAppointment.childName}</li>
//       <li><strong>Child's Age:</strong> ${updatedAppointment.childAge} years</li>
//       <li><strong>Child's Gender:</strong> ${updatedAppointment.childGender}</li>
//       <li><strong>Date:</strong> ${new Date(updatedAppointment.date).toLocaleDateString()}</li>
//       <li><strong>Time:</strong> ${updatedAppointment.time}</li>
//     </ul>
      
//       <p>Please ensure to arrive at least 10 minutes before the scheduled time. If you need to reschedule or have any questions, do not hesitate to contact us.</p>
      
//       <p>Thank you for choosing our services.</p>
      
//       <p>Best regards,<br>The Care Team</p>`
//     });

//     //------------------------scheduling automatic reminders--------------------------------
//     const appointmentDateTime = new Date(updatedAppointment.date);
//     const appointmentTimeParts = updatedAppointment.time.split(':');
//     appointmentDateTime.setHours(appointmentTimeParts[0], appointmentTimeParts[1]);
//     const reminderTime = new Date(appointmentDateTime);
//     // reminderTime.setMinutes(reminderTime.getMinutes() - 5); 
//     reminderTime.setHours(reminderTime.getHours() -24);
//     schedule.scheduleJob(reminderTime, async () => {
//       try {
//         await autSendEmail({
//           to: updatedAppointment.parent.email,
//           subject: 'Appointment Reminder',
//           text: `Dear Parent,         
//           This is a reminder for your appointment scheduled for tomorrow. Below are the details of your appointment:          
//             - Therapist: Dr. ${updatedAppointment.therapist.firstName} ${updatedAppointment.therapist.lastName}
//             - Specialization: ${updatedAppointment.therapist.specialization}
//             - Child's Name: ${updatedAppointment.childName}
//             - Date: ${new Date(updatedAppointment.date).toLocaleDateString()}
//             - Time: ${updatedAppointment.time}    
//           Please ensure to arrive at least 10 minutes before the scheduled time.   
//           Best regards,
//           The Care Team`,
//           html: `<p>Dear Parent,</p>         
//           <p>This is a reminder for your appointment scheduled for tomorrow. Below are the details of your appointment:</p>         
//         <ul>
//           <li><strong>Therapist:</strong> Dr. ${updatedAppointment.therapist.firstName} ${updatedAppointment.therapist.lastName}</li>
//           <li><strong>Specialization:</strong> ${updatedAppointment.therapist.specialization}</li>
//           <li><strong>Child's Name:</strong> ${updatedAppointment.childName}</li>
//           <li><strong>Date:</strong> ${new Date(updatedAppointment.date).toLocaleDateString()}</li>
//           <li><strong>Time:</strong> ${updatedAppointment.time}</li>
//         </ul>        
//           <p>Please ensure to arrive at least 10 minutes before the scheduled time.</p>       
//           <p>Best regards,<br>The Care Team</p>`
//         });
//       } catch (err) {
//         console.error('Failed to send reminder email:', err.message);
//       } });
//     res.json(updatedAppointment);
//   } catch (error) {
//     console.error('Failed to approve appointment:', error.message);
//     res.status(500).send({ message: 'Failed to approve appointment', error: error.message });
//   }});

// //-------------------therapist rejected -----------------------------------------------
// router.post('/reject/:id', updateAppandAvail, async (req, res) => {
//   try {
//     const appointment = await Appointment.findById(req.params.id).populate('therapist', 'firstName lastName specialization').populate('parent', 'email firstName lastName');

//     if (!appointment) {
//       return res.status(404).json({ message: 'Appointment not found' });
//     }

//     await autSendEmail({
//       to: appointment.parent.email, 
//       subject: 'Appointment Rejected',
//       text: `Dear Parent,

//       We regret to inform you that your appointment request has been rejected. Below are the details of the rejected appointment:

//       - Therapist: Dr. ${appointment.therapist.firstName} ${appointment.therapist.lastName}
//       - Specialization: ${appointment.therapist.specializations}
//       - Child's Name: ${appointment.childName}
//       - Child's Age: ${appointment.childAge} years
//       - Child's Gender: ${appointment.childGender}
//       - Date: ${new Date(appointment.date).toLocaleDateString()}
//       - Time: ${appointment.time}

//       If you have any questions or need further assistance, please contact us.

//       Best regards,
//       The Care Team`,
//       html: `<p>Dear Parent,</p>
      
//       <p>We regret to inform you that your appointment request has been rejected. Below are the details of the rejected appointment:</p>
      
//       <ul>
//         <li><strong>Therapist:</strong> Dr. ${appointment.therapist.firstName} ${appointment.therapist.lastName}</li>
//         <li><strong>Specialization:</strong> ${appointment.therapist.specializations}</li>
//         <li><strong>Child's Name:</strong> ${appointment.childName}</li>
//         <li><strong>Child's Age:</strong> ${appointment.childAge} years</li>
//         <li><strong>Child's Gender:</strong> ${appointment.childGender}</li>
//         <li><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</li>
//         <li><strong>Time:</strong> ${appointment.time}</li>
//       </ul>
      
//       <p>If you have any questions or need further assistance, please contact us.</p>
      
//       <p>Best regards,<br>The Care Team</p>`
//     });

//     await appointment.remove();
//     res.json({ message: 'Appointment rejected and parent notified via email' });
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to reject appointment', error: error.message });
//   }
// });

// //--------------therapist get approved appointments------------------------
// router.get('/approved', updateAppandAvail, async (req, res) => {
//   try {
//     const appointments = await Appointment.find({
//       therapist: req.user._id,  
//       status: 'approved'
//     })
//     .populate('parent', 'firstName lastName email childName childGender childAge');

//     res.json(appointments);
//   } catch (error) {
//     res.status(500).send({ message: 'Error fetching approved appointments', error });
//   }
// });



// //------------------------parents cancel appointment-------------------------------------------
// router.delete('/cancel/:id', protect, async (req, res) => {
//   try {
//     const appointment = await Appointment.findById(req.params.id);
//     if (!appointment) {
//       return res.status(404).json({ message: 'Appointment not found' });
//     }
//     await Availability.updateOne(
//       { therapist: appointment.therapist, date: appointment.date, 'slots.startTime': appointment.time },
//       { $set: { 'slots.$.isBooked': false } }
//     );
//     await appointment.remove();
//     res.status(200).json({ message: 'Appointment cancelled successfully' });
//   } catch (error) {
//     console.error('Error cancelling appointment:', error.message);
//     res.status(500).json({ message: 'Failed to cancel appointment', error: error.message });
//   }
// });


// //-----------------------user get their appointments list---------------------------------------
// router.get('/userAppointments', updateAppandAvail, protect, async (req, res) => {
//   try {
//       const userId = req.user._id;
//       const appointments = await Appointment.find({ parent: userId })
//           .populate('therapist', 'firstName lastName') 
//           .sort({ date: -1 }); 
//       res.json(appointments);
//   } catch (error) {
//       console.error('Error fetching user appointments:', error.message);
//       res.status(500).json({ message: 'Failed to fetch user appointments', error: error.message });
//   }
// });


// module.exports = router;

const express = require('express');
const autRouter = express.Router();
const { protect, therapist } = require('../middleware/authMiddleware');
const autUser = require('../models/User');
const autAvailability = require('../models/Availability');
const autSendEmail = require('../utils/mailer');
const autAppointment = require('../models/Appointment');
const autUpdateAppandAvail = require('../middleware/updateStatus');
const autSchedule = require('node-schedule');

//-------------------------get specialization----------------------------------
autRouter.get('/specializations', async (req, res) => {
  try {
    const autSpecializations = await autUser.distinct('specialization', { role: 'therapist' });
    res.json(autSpecializations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//---------------------------get therapist based on specialization-------------------
autRouter.get('/therapists', async (req, res) => {
  const { specialization } = req.query;
  try {
    const autTherapists = await autUser.find({ specialization, role: 'therapist', approved: true });
    res.json(autTherapists.map(therapist => ({
      id: therapist._id,
      name: therapist.firstName + ' ' + therapist.lastName
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//----------------------------therapist available dates--------------------------------
autRouter.get('/availabilityDates', autUpdateAppandAvail, async (req, res) => {
  const { therapistId } = req.query;
  try {
    const availability = await autAvailability.find({ therapist: therapistId }).select('date');
    const availableDates = availability.map(avail => avail.date.toISOString().split('T')[0]);
    res.json(availableDates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ----------------------------get time slots for that particular date------------------------------------
autRouter.get('/availableSlots', autUpdateAppandAvail, async (req, res) => {
  const { therapistId, date } = req.query;
  try {
    const availability = await autAvailability.findOne({ therapist: therapistId, date: new Date(date) });
    
    if (!availability) {
      return res.status(404).json({ message: 'No availability found for the selected date' });
    }

    res.json(availability.slots);  
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//------------------------------------book appointment--------------------------------------------------
autRouter.post('/bookAppointment', protect, async (req, res) => {
  const { therapistId, date, time } = req.body;
  try {
    const autAppointmentDate = new Date(`${date}T${time}`);
    const autCurrentDate = new Date();
    const autDiffHours = (autAppointmentDate.getTime() - autCurrentDate.getTime()) / (1000 * 3600);

    // Ensure appointments are only booked at least 24 hours in advance
    if (autDiffHours < 24) {
      return res.status(400).json({ message: 'Appointments must be scheduled at least 24 hours in advance.' });
    }

    const autParent = req.user._id;
    const autChild = await autUser.findById(autParent);

    if (!autChild) {
      return res.status(400).json({ message: 'No child details associated with the parent.' });
    }

    const availabilityRecord = await autAvailability.findOne({
      therapist: therapistId,
      date: new Date(date),
      'slots.startTime': time,
      'slots.isBooked': false
    });

    if (!availabilityRecord) {
      return res.status(400).json({ message: 'The selected time slot is already booked.' });
    }

    const autAppointmentRecord = new autAppointment({
      therapist: therapistId,
      parent: autParent,
      patient: autChild._id,
      date: autAppointmentDate,
      time,
      childName: autChild.childName,
      childGender: autChild.childGender,
      childAge: autChild.childAge,
      status: 'pending' 
    });

    await autAvailability.updateOne(
      { therapist: therapistId, date: new Date(date), 'slots.startTime': time },
      { $set: { 'slots.$.isBooked': true } }
    );

    await autAppointmentRecord.save();
    res.status(201).json({ message: 'Appointment booked successfully', appointment: autAppointmentRecord });
  } catch (error) {
    console.error('Failed to book appointment:', error.message);
    res.status(500).json({ message: 'Failed to book appointment', error: error.message });
  }
});


//-------------------------------therapist get the request----------------------------------------
autRouter.get('/requests', autUpdateAppandAvail,async (req, res) => {
  try {
    const autAppointments = await autAppointment.find({
      therapist: req.user._id,  
      status: 'pending'
    })
    .populate('parent', 'firstName lastName email childName childGender childAge');

    res.json(autAppointments);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching appointment requests', error });
  }
});

// ---------------------------therapist approve appointment--------------------------------------------
autRouter.post('/approve/:id',autUpdateAppandAvail,  async (req, res) => {
  try {
    const autAppointmentRecord = await autAppointment.findById(req.params.id);
    const autAppointmentDate = new Date(autAppointmentRecord.date);
    const autCurrentDate = new Date();
    const autDiffHours = (autAppointmentDate.getTime() - autCurrentDate.getTime()) / (1000 * 3600);

    if (autDiffHours < 24) {
      return res.status(400).json({ message: 'Cannot approve appointments scheduled within 24 hours.' });
    }

    const autUpdatedAppointment = await autAppointment.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    ).populate('therapist', 'firstName lastName specialization')
     .populate('parent', 'email');

    if (!autUpdatedAppointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await autSendEmail({
      to: autUpdatedAppointment.parent.email,
      subject: 'Appointment Approved',
      text: `Dear Parent,
      
      We are pleased to inform you that your appointment has been approved. Below are the details of your scheduled appointment:
      
        - Therapist: Dr. ${autUpdatedAppointment.therapist.firstName} ${autUpdatedAppointment.therapist.lastName}
        - Specialization: ${autUpdatedAppointment.therapist.specialization}
        - Child's Name: ${autUpdatedAppointment.childName}
        - Child's Age: ${autUpdatedAppointment.childAge} years
        - Child's Gender: ${autUpdatedAppointment.childGender}
        - Date: ${new Date(autUpdatedAppointment.date).toLocaleDateString()}
        - Time: ${autUpdatedAppointment.time}
      
      Please ensure to arrive at least 10 minutes before the scheduled time. If you need to reschedule or have any questions, do not hesitate to contact us.
      
      Thank you for choosing our services.
      
      Best regards,
      The Care Team`,
      html: `<p>Dear Parent,</p>
      
      <p>We are pleased to inform you that your appointment has been approved. Below are the details of your scheduled appointment:</p>
      
    <ul>
      <li><strong>Therapist:</strong> Dr. ${autUpdatedAppointment.therapist.firstName} ${autUpdatedAppointment.therapist.lastName}</li>
      <li><strong>Specialization:</strong> ${autUpdatedAppointment.therapist.specialization}</li>
      <li><strong>Child's Name:</strong> ${autUpdatedAppointment.childName}</li>
      <li><strong>Child's Age:</strong> ${autUpdatedAppointment.childAge} years</li>
      <li><strong>Child's Gender:</strong> ${autUpdatedAppointment.childGender}</li>
      <li><strong>Date:</strong> ${new Date(autUpdatedAppointment.date).toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${autUpdatedAppointment.time}</li>
    </ul>
      
      <p>Please ensure to arrive at least 10 minutes before the scheduled time. If you need to reschedule or have any questions, do not hesitate to contact us.</p>
      
      <p>Best regards,<br>The Care Team</p>`
    });

    //------------------------scheduling automatic reminders--------------------------------
    const autAppointmentDateTime = new Date(autUpdatedAppointment.date);
    const autAppointmentTimeParts = autUpdatedAppointment.time.split(':');
    autAppointmentDateTime.setHours(autAppointmentTimeParts[0], autAppointmentTimeParts[1]);
    const autReminderTime = new Date(autAppointmentDateTime);
    autReminderTime.setHours(autReminderTime.getHours() - 24);
    autSchedule.scheduleJob(autReminderTime, async () => {
      try {
        await autSendEmail({
          to: autUpdatedAppointment.parent.email,
          subject: 'Appointment Reminder',
          text: `Dear Parent,         
          This is a reminder for your appointment scheduled for tomorrow. Below are the details of your appointment:          
            - Therapist: Dr. ${autUpdatedAppointment.therapist.firstName} ${autUpdatedAppointment.therapist.lastName}
            - Specialization: ${autUpdatedAppointment.therapist.specialization}
            - Child's Name: ${autUpdatedAppointment.childName}
            - Date: ${new Date(autUpdatedAppointment.date).toLocaleDateString()}
            - Time: ${autUpdatedAppointment.time}    
          Please ensure to arrive at least 10 minutes before the scheduled time.   
          Best regards,
          The Care Team`,
          html: `<p>Dear Parent,</p>         
          <p>This is a reminder for your appointment scheduled for tomorrow. Below are the details of your appointment:</p>         
        <ul>
          <li><strong>Therapist:</strong> Dr. ${autUpdatedAppointment.therapist.firstName} ${autUpdatedAppointment.therapist.lastName}</li>
          <li><strong>Specialization:</strong> ${autUpdatedAppointment.therapist.specialization}</li>
          <li><strong>Child's Name:</strong> ${autUpdatedAppointment.childName}</li>
          <li><strong>Date:</strong> ${new Date(autUpdatedAppointment.date).toLocaleDateString()}</li>
          <li><strong>Time:</strong> ${autUpdatedAppointment.time}</li>
        </ul>        
          <p>Please ensure to arrive at least 10 minutes before the scheduled time.</p>       
          <p>Best regards,<br>The Care Team</p>`
        });
      } catch (err) {
        console.error('Failed to send reminder email:', err.message);
      }});
    res.json(autUpdatedAppointment);
  } catch (error) {
    console.error('Failed to approve appointment:', error.message);
    res.status(500).send({ message: 'Failed to approve appointment', error: error.message });
  }});

//-------------------therapist rejected -----------------------------------------------
autRouter.post('/reject/:id', autUpdateAppandAvail, async (req, res) => {
  try {
    const autAppointmentRecord = await autAppointment.findById(req.params.id)
      .populate('therapist', 'firstName lastName specialization')
      .populate('parent', 'email firstName lastName');

    if (!autAppointmentRecord) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await autSendEmail({
      to: autAppointmentRecord.parent.email, 
      subject: 'Appointment Rejected',
      text: `Dear Parent,

      We regret to inform you that your appointment request has been rejected. Below are the details of the rejected appointment:

      - Therapist: Dr. ${autAppointmentRecord.therapist.firstName} ${autAppointmentRecord.therapist.lastName}
      - Specialization: ${autAppointmentRecord.therapist.specialization}
      - Child's Name: ${autAppointmentRecord.childName}
      - Child's Age: ${autAppointmentRecord.childAge} years
      - Child's Gender: ${autAppointmentRecord.childGender}
      - Date: ${new Date(autAppointmentRecord.date).toLocaleDateString()}
      - Time: ${autAppointmentRecord.time}

      If you have any questions or need further assistance, please contact us.

      Best regards,
      The Care Team`,
      html: `<p>Dear Parent,</p>
      
      <p>We regret to inform you that your appointment request has been rejected. Below are the details of the rejected appointment:</p>
      
      <ul>
        <li><strong>Therapist:</strong> Dr. ${autAppointmentRecord.therapist.firstName} ${autAppointmentRecord.therapist.lastName}</li>
        <li><strong>Specialization:</strong> ${autAppointmentRecord.therapist.specialization}</li>
        <li><strong>Child's Name:</strong> ${autAppointmentRecord.childName}</li>
        <li><strong>Child's Age:</strong> ${autAppointmentRecord.childAge} years</li>
        <li><strong>Child's Gender:</strong> ${autAppointmentRecord.childGender}</li>
        <li><strong>Date:</strong> ${new Date(autAppointmentRecord.date).toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${autAppointmentRecord.time}</li>
      </ul>
      
      <p>If you have any questions or need further assistance, please contact us.</p>
      
      <p>Best regards,<br>The Care Team</p>`
    });

    await autAppointmentRecord.remove();
    res.json({ message: 'Appointment rejected and parent notified via email' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reject appointment', error: error.message });
  }
});

//--------------therapist get approved appointments------------------------
autRouter.get('/approved',autUpdateAppandAvail,  async (req, res) => {
  try {
    const autApprovedAppointments = await autAppointment.find({
      therapist: req.user._id,  
      status:  { $in: ['approved', 'completed', 'missed'] }
    })
    .populate('parent', 'firstName lastName email childName childGender childAge')
    .sort({ date: -1 });
    res.json(autApprovedAppointments);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching approved appointments', error });
  }
});

//------------------------parents cancel appointment-------------------------------------------
autRouter.delete('/cancel/:id',autUpdateAppandAvail, protect, async (req, res) => {
  try {
    const autAppointmentRecord = await autAppointment.findById(req.params.id);
    if (!autAppointmentRecord) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Set the slot as available again
    await autAvailability.updateOne(
      { therapist: autAppointmentRecord.therapist, date: autAppointmentRecord.date, 'slots.startTime': autAppointmentRecord.time },
      { $set: { 'slots.$.isBooked': false } }
    );

    // Mark the appointment as cancelled and save
    autAppointmentRecord.status = 'cancelled';
    await autAppointmentRecord.save();

    res.status(200).json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error.message);
    res.status(500).json({ message: 'Failed to cancel appointment', error: error.message });
  }
});
//-----------------------user get their appointments list---------------------------------------
autRouter.get('/userAppointments', autUpdateAppandAvail, protect, async (req, res) => {
  try {
      const autUserId = req.user._id;
      const autAppointments = await autAppointment.find({ parent: autUserId })
          .populate('therapist', 'firstName lastName') 
          .sort({ date: -1 }); 
      res.json(autAppointments);
  } catch (error) {
      console.error('Error fetching user appointments:', error.message);
      res.status(500).json({ message: 'Failed to fetch user appointments', error: error.message });
  }
});

module.exports = autRouter;
