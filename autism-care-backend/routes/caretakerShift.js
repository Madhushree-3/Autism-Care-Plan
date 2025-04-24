const express = require('express');
const asyncHandler = require('express-async-handler');
const autRouter = express.Router();
const autShift = require('../models/Shift');
const autDailySummary = require('../models/DailySummary');
const autGoal = require('../models/Goal');
const autUser = require('../models/User');
const autNotes = require('../models/Notes');
const autUpdateShiftStatus = require('../middleware/updateShifts');
const { protect, caretaker } = require('../middleware/authMiddleware');

//-------------------- all shifts for a caretaker-------------------------------------------
autRouter.get('/Shifts', protect, autUpdateShiftStatus, async (req, res, next) => {
  try {
    const autCaretakerId = req.user._id;
    const autShifts = await autShift.find({ caretakerId: autCaretakerId })
      .populate('caretakerId', 'firstName lastName')
      .populate('childId', 'childName');
    res.json(autShifts);
  } catch (err) {
    next(err);
  }
});

//-----------------------------cancel shift-----------------------------------------------------
autRouter.put('/shifts/:id', protect, async (req, res) => {
  try {
    const autShiftToCancel = await autShift.findById(req.params.id);
    if (!autShiftToCancel) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    if (autShiftToCancel.caretakerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.body.status === 'cancelled' && !req.body.cancelReason) {
      return res.status(400).json({ message: 'Cancel reason is required when cancelling a shift' });
    }

    autShiftToCancel.status = req.body.status || autShiftToCancel.status;
    autShiftToCancel.cancelReason = req.body.cancelReason || autShiftToCancel.cancelReason;

    await autShiftToCancel.save();
    res.json({ message: 'Shift updated successfully', shift: autShiftToCancel });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//--------------------------- current child assigned to the caretaker--------------------------
autRouter.get('/getCurrentChild', protect, caretaker, async (req, res) => {
  try {
    const autCurrentDate = new Date();
    autCurrentDate.setHours(0, 0, 0, 0);

    const autStartOfToday = new Date(autCurrentDate).setHours(0, 0, 0, 0);
    const autEndOfToday = new Date(autCurrentDate).setHours(23, 59, 59, 999);

    const autShiftForToday = await autShift.findOne({
      caretakerId: req.user._id,
      status: 'accepted',
      startDate: { $lte: autEndOfToday },
      endDate: { $gte: autStartOfToday }
    }).populate('childId', 'childName');

    if (!autShiftForToday) {
      console.log(`No shift found for user ${req.user._id} on ${autCurrentDate.toISOString()}`);
      return res.status(404).json({ message: 'No child is assigned for today' });
    }

    res.json(autShiftForToday.childId);
  } catch (error) {
    console.error('Error fetching current child:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//------------------------------current shift---------------------------------------------------------
autRouter.get('/currentShift', protect, asyncHandler(async (req, res) => {
  const autCaretakerId = req.user._id;
  const autCurrentDate = new Date();

  try {
    const autCurrentShift = await autShift.findOne({
      caretakerId: autCaretakerId,
      startDate: { $lte: autCurrentDate },
      endDate: { $gte: autCurrentDate },
      status: { $ne: 'cancelled' }
    }).populate('childId', 'childName address');

    if (!autCurrentShift) {
      return res.status(404).json({ message: 'No shift assigned for today' });
    }

    res.json(autCurrentShift);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}));

//--------------------------------------Submit activity-----------------------------------------
autRouter.post('/submitActivityLogs', protect, caretaker, async (req, res) => {
  const { date, logs, childId } = req.body;

  try {
    const autSummary = new autDailySummary({
      caretakerId: req.user._id,
      childId,
      date,
      logs,
    });
    await autSummary.save();
    res.status(201).json({ message: 'Summary submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

autRouter.get('/getPastSummaries/:childId', protect, caretaker, async (req, res) => {
  try {
    const { childId } = req.params;
    const autThirtyDaysAgo = new Date();
    autThirtyDaysAgo.setDate(autThirtyDaysAgo.getDate() - 30);

    const autSummaries = await autDailySummary.find({
      caretakerId: req.user._id,
      childId,
      date: { $gte: autThirtyDaysAgo }
    }).sort({ date: -1 });

    res.json(autSummaries);
  } catch (error) {
    console.error('Error fetching past summaries:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

autRouter.get('/getSummaryByDate/:childId/:date', protect, caretaker, async (req, res) => {
  try {
    const { childId, date } = req.params;
    const autSummary = await autDailySummary.findOne({
      caretakerId: req.user._id,
      childId,
      date: new Date(date)
    });
    if (!autSummary) {
      return res.status(404).json({ message: 'Summary not found' });
    }
    res.json(autSummary.logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//-------------------------------------Delete log -----------------------------------------------
autRouter.delete('/deleteLog/:id', protect, caretaker, async (req, res) => {
  try {
    const autLogId = req.params.id;
    const autSummary = await autDailySummary.findOne({ 'logs._id': autLogId });

    if (!autSummary) {
      return res.status(404).json({ message: 'Log not found' });
    }

    autSummary.logs.id(autLogId).remove();
    await autSummary.save();

    res.json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
//---------------------------fetch completed goals-------------------------------------
autRouter.get('/completedGoals/:childId', protect, caretaker, async (req, res) => {
  try {
    const { childId } = req.params;
    const autCompletedGoals = await autGoal.find({ childId, completed: true }).select('title tasks feedback completed');

    if (!autCompletedGoals.length) {
      return res.status(404).json({ message: 'No completed goals found for this child' });
    }
    res.json(autCompletedGoals);
  } catch (error) {
    console.error('Error fetching completed goals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

//-----------------------------------feedback for completed goal---------------------------------------------

autRouter.put('/goals/:goalId/feedback', protect, caretaker, async (req, res) => {
  const { goalId } = req.params;
  const { feedback } = req.body;

  try {
    const autGoalToUpdate = await autGoal.findById(goalId);
    if (!autGoalToUpdate) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    if (autGoalToUpdate.feedback && autGoalToUpdate.feedback.trim() !== '') {
      return res.status(400).json({ message: 'Feedback has already been submitted and cannot be changed.' });
    }
    autGoalToUpdate.feedback = feedback;
    await autGoalToUpdate.save();

    res.status(200).json({ message: 'Feedback submitted successfully', goal: autGoalToUpdate });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


autRouter.get('/getCareChildren', protect, caretaker, async (req, res) => {
  try {
    const autChildren = await autUser.find({ role: 'parent', approved: true }).select('childName _id');
    res.json(autChildren.map(autChild => ({ label: autChild.childName, value: autChild._id })));
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

autRouter.get('/reports/:childId', protect, caretaker, async (req, res) => {
  try {
    const autReports = await autNotes.find({ child: req.params.childId }).populate('therapist', 'firstName lastName')
      .sort({ dateOfService: -1 });
    res.json(autReports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
});

module.exports = autRouter;
