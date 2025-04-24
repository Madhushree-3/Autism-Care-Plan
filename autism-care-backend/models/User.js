const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  role: { type: String, required: true },
  title: { type: String},
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobileNumber: { type: String},
  yearsExperience: {
    type: Number,
    required: function() { return this.role === 'caretaker' || this.role === 'therapist'; }
},
specialization: {
  type: String,
  required: function() { return this.role === 'therapist'; } 
},
  childName: { type: String },
  childGender: { type: String },
  childAge: { type: Number },
  address: { type: String },
  moreInfo: { type: String },
  approved: { type: Boolean, default: false },
  caretaker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  childID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  autResetPasswordToken: { type: String },
  autResetPasswordExpires: { type: Date },
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10); 
  this.password = await bcrypt.hash(this.password, salt); 
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) { 
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', UserSchema); 

module.exports = User;