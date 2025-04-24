const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const goalSchema = new mongoose.Schema({
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  title: { type: String, required: true },
  tasks: [taskSchema],
  color: { type: String, required: true },
  feedback: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
