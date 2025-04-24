const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  childId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  workAddress: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  status: { type: String, enum: ['accepted', 'cancelled', 'completed'], default: 'accepted' }, 
  cancelReason: { type: String },
});



const Shift = mongoose.model('Shift', ShiftSchema);


module.exports = Shift;
