const express = require('express');
const autRouter = express.Router();
const autShift = require('../models/Shift');
const autMessage = require('../models/Message');
const autUser = require('../models/User');
const { protect, caretaker, parent } = require('../middleware/authMiddleware');

//----------------get current assigned child parent name and details------------------------------------------
autRouter.get('/getChild', protect, caretaker, async (req, res) => {
  try {
    const autCaretakerId = req.user._id;
    const autShifts = await autShift.find({
      caretakerId: autCaretakerId,
      status: { $in: ['accepted', 'completed'] },
    }).populate('childId', 'firstName lastName childName');

    if (!autShifts || autShifts.length === 0) {
      return res.status(404).json({ message: 'No children found for this caretaker' });
    }

    const autChildMap = new Map();
    const autToday = new Date();

    autShifts.forEach(shift => {
      if (!shift.childId) {


        console.warn(`Shift with ID ${shift._id} does not have an associated child`);

        return;

      }
      const autChildId = shift.childId._id.toString();
      const autCurrentShiftDate = shift.startDate;

      if (autCurrentShiftDate > autToday) {
        return;
      }

      if (!autChildMap.has(autChildId)) {
        autChildMap.set(autChildId, {
          childId: shift.childId._id,
          childName: shift.childId.childName,
          parent: `${shift.childId.firstName} ${shift.childId.lastName}`,
          shiftDate: autCurrentShiftDate
        });
      } else {
        const existingEntry = autChildMap.get(autChildId);
        if (autCurrentShiftDate > existingEntry.shiftDate) {
          existingEntry.shiftDate = autCurrentShiftDate;
        }
      }
    });

    const autChildren = Array.from(autChildMap.values());
    res.json({ children: autChildren });
  } catch (autError) {
    console.error('Error fetching children:', autError);
    res.status(500).json({ message: 'Server error', error: autError.message });
  }
});

//--------------------------send message-----------------------------------------
autRouter.post('/messages', protect, async (req, res) => {
  const { content, to } = req.body;
  if (!content || !to) {
    return res.status(400).json({ message: 'Content and recipient are required' });
  }

  try {
    const autMessageToSend = new autMessage({
      from: req.user._id,
      to,
      content
    });

    await autMessageToSend.save();
    res.status(201).json(autMessageToSend);
  } catch (autError) {
    console.error('Error sending message:', autError);
    res.status(500).json({ message: 'Server error', error: autError.message });
  }
});

//--------------------Fetch messages with a specific user-------------------------------
autRouter.get('/messages/:id', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const autMessages = await autMessage.find({
      $or: [{ from: req.user._id, to: id }, { from: id, to: req.user._id }]
    }).sort({ timestamp: 1 });

    res.json(autMessages);
  } catch (autError) {
    console.error('Failed to fetch messages:', autError);
    res.status(500).json({ message: 'Failed to fetch messages', error: autError.message });
  }
});

module.exports = autRouter;
