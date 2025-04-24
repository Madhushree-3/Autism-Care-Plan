const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  time: { type: String, required: true },
  activities: [String],
  therapies: [String],
  behavior: { type: String },
  trigger: { type: String },
  log: { type: String, required: true }
});

const dailySummarySchema = new mongoose.Schema({
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  logs: [logSchema]
}, {
  timestamps: true
});

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);

module.exports = DailySummary;
