const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  childName: String,
  childGender: String,
  childAge: Number,
  date: Date,
  time: String,
  status: { type: String, default: 'pending' } 
});

module.exports = mongoose.model('Appointment', appointmentSchema);
