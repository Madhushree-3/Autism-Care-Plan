const express = require('express');
const asyncHandler = require('express-async-handler');
const autShift = require('../models/Shift'); 
const autUser = require('../models/User');   
const autGetCoordinates = require('../utils/getCoordinates');
const { protect, admin } = require('../middleware/authMiddleware');
const autUpdateShiftStatus = require('../middleware/updateShifts');
const autRouter = express.Router();

// ---------------------fetch available caretakers----------------------------------------------------
autRouter.get('/users/getAvailableCaretakers', protect, admin, async (req, res) => {
  const { date } = req.query;
  const autSelectedDate = new Date(date);

  try {
    const autActiveShifts = await autShift.find({
      startDate: { $lte: autSelectedDate },
      endDate: { $gte: autSelectedDate },
      status: { $ne: 'cancelled' }
    }).distinct('caretakerId');

    const autAvailableCaretakers = await autUser.find({
      role: 'caretaker',
      approved: true,
      _id: { $nin: autActiveShifts }
    }).select('firstName lastName');

    const formattedCaretakers = autAvailableCaretakers.map(caretaker => ({
      _id: caretaker._id,
      firstName: caretaker.firstName,
      lastName: caretaker.lastName
    }));

    res.json(formattedCaretakers);
  } catch (err) {
    console.error('Error fetching available caretakers:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ------------------------fetch available children-------------------------------------------------
autRouter.get('/users/getAvailableChildren', protect, admin, async (req, res) => {
  const { date } = req.query;
  const autSelectedDate = new Date(date);

  try {
    const autActiveShifts = await autShift.find({
      startDate: { $lte: autSelectedDate },
      endDate: { $gte: autSelectedDate },
      status: { $ne: 'cancelled' }
    }).distinct('childId');

    const autParents = await autUser.find({
      role: 'parent',
      approved: true,
      _id: { $nin: autActiveShifts }
    }).select('childName address');

    const autAvailableChildren = autParents
      .filter(parent => parent.childName)
      .map(parent => ({
        _id: parent._id,
        childName: parent.childName,
        address: parent.address
      }));

    res.json(autAvailableChildren);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//--------------------------add shifts--------------------------------------------------------

autRouter.post('/addShifts', async (req, res) => {
  const { caretakerId, childId, selectedDates, workAddress } = req.body;
  if (!selectedDates || selectedDates.length === 0) {
    return res.status(400).json({ message: 'Selected dates are required' });
  }
  try {
    console.log('Fetching coordinates for address:', workAddress);
    const autCoordinates = await autGetCoordinates(workAddress);
    if (!autCoordinates) {    
      return res.status(400).json({ message: 'Failed to get coordinates for the address' });
    }
    const autShiftsToAdd = selectedDates.map(date => ({
      caretakerId,
      childId,
      startDate: new Date(date),  
      endDate: new Date(date),    
      workAddress,
      location: {
        type: 'Point',
        coordinates: [autCoordinates.lng, autCoordinates.lat]
      },
      status: 'accepted'
    }));

    const autNewShifts = await autShift.insertMany(autShiftsToAdd);
    res.status(201).json({ message: 'Shifts added successfully', shifts: autNewShifts });
  } catch (error) {
    console.error('Error adding shifts:', error);
    res.status(500).json({ message: 'Server error', error: error.toString() });
  }
});

//----------------------------fetch the assigned shifts----------------------------------------------
autRouter.get('/getShifts', autUpdateShiftStatus, protect, admin, async (req, res) => {
  try {
    const autShifts = await autShift.find({})
      .populate('caretakerId', 'firstName lastName')
      .populate('childId', 'childName')
      .sort({ startDate: -1 });
    res.json(autShifts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//-----------------cancel the assigned shift-------------------------------------------------
autRouter.put('/cancelShift/:id', protect, admin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cancelReason } = req.body;

  try {
    const shift = await autShift.findById(id);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }
    if (req.body.status === 'cancelled' && !cancelReason) {
      return res.status(400).json({ message: 'Cancel reason is required when cancelling the shift' });
    }
    shift.status = 'cancelled';
    shift.cancelReason = cancelReason;
    const updatedShift = await shift.save();
    res.json({ message: 'Shift cancelled successfully', shift: updatedShift });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}));
module.exports = autRouter;
