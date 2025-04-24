const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slots: [{
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBooked: { type: Boolean, default: false }  
  }],
  firstHalfCancelled: {
    type: Boolean,
    default: false, 
  },
  secondHalfCancelled: {
    type: Boolean,
    default: false, 
  },
});

availabilitySchema.index({ therapist: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
