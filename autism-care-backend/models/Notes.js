const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceProvided: {
    type: [String],
    required: true
  },
  notes: {
    type: String,
    required: true
  },
  therapistSignature: {
    type: String,
    required: true
  },
  dateOfService: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notes', noteSchema);
