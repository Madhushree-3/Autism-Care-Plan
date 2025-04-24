const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  caretakerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: { type: [String], default: [] },
  message: {
    type: String,
    required: true
  },
  recipients: [{
    type: String,
    required: true
  }],
  date: {
    type: Date,
    default: Date.now
  }
});

const Alert = mongoose.model('Alert', AlertSchema);
module.exports = Alert;
