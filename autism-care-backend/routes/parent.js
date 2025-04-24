const express = require('express');
const autRouter = express.Router();
const User = require('../models/User');
const Shift = require('../models/Shift');
const { protect, parent } = require('../middleware/authMiddleware');
const DailySummary = require('../models/DailySummary');
const PDFDocument = require('pdfkit');
const Goal = require('../models/Goal');
const Note = require('../models/Notes');

//-------------------------------------get past 30 days summaries------------------------------
autRouter.get('/pastSummaries/:childId', protect, parent, async (req, res) => {
    try {
        const { childId } = req.params;

        const autToday = new Date();
        const autLast30Days = new Date();
        autLast30Days.setDate(autToday.getDate() - 30);

        // Fetch past summaries
        const autSummaries = await DailySummary.find({
            childId,
            date: { $gte: autLast30Days, $lte: autToday }
        }).sort({ date: -1 });

        const completedGoals = await Goal.find({
            childId,
            status: 'completed'
        }).sort({ dateCompleted: -1 });

        if (!autSummaries.length && !completedGoals.length) {
            return res.status(404).json({ message: 'No summaries or completed goals found for the past 30 days' });
        }

        res.json({
            summaries: autSummaries,
            goals: completedGoals,
        });
    } catch (autError) {
        console.error('Error fetching summaries or goals for the past 30 days:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

// ----------------------download summaries-----------------------------------------------
autRouter.get('/downloadSummaries/:childId', protect, parent, async (req, res) => {
    try {
        const { childId } = req.params;

        const autToday = new Date();
        const autLast30Days = new Date();
        autLast30Days.setDate(autToday.getDate() - 30);

        const autSummaries = await DailySummary.find({
            childId,
            date: { $gte: autLast30Days, $lte: autToday }
        }).sort({ date: -1 });

        const completedGoals = await Goal.find({
            childId,
            status: 'completed'
        });

        const childDetails = await User.findById(childId).select('childName childAge childGender');

        if (!autSummaries.length && !completedGoals.length) {
            return res.status(404).json({ message: 'No summaries or completed goals found for the past 30 days' });
        }
        const autDoc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="summaries_and_goals_${childId}.pdf"`);
        
        autDoc.pipe(res);

        autDoc.fontSize(14).text(`Child Details:`, { align: 'left' });
        autDoc.fontSize(12).text(`Name: ${childDetails.childName}`);
        autDoc.fontSize(12).text(`Age: ${childDetails.childAge}`);
        autDoc.fontSize(12).text(`Gender: ${childDetails.childGender}`);
        autDoc.moveDown();

        autDoc.fontSize(14).text('Daily Summaries', { underline: true });
        autDoc.moveDown();

        autSummaries.forEach(autSummary => {
            autDoc.fontSize(16).text(`Date: ${new Date(autSummary.date).toLocaleDateString()}`);
            autSummary.logs.forEach(autLog => {
                autDoc.fontSize(12).text(`- Time: ${autLog.time}`);
                autDoc.fontSize(12).text(`  Activities: ${autLog.activities.join(', ')}`);
                autDoc.fontSize(12).text(`  Therapies: ${autLog.therapies.join(', ')}`);
                autDoc.fontSize(12).text(`  Behavior: ${autLog.behavior}`);
                autDoc.fontSize(12).text(`  Trigger: ${autLog.trigger || 'N/A'}`);
                autDoc.fontSize(12).text(`  Log: ${autLog.log}`);
                autDoc.moveDown();
            });
            autDoc.moveDown();
        });

        if (completedGoals.length) {
            autDoc.fontSize(16).text('Completed Goals:', { underline: true });
            autDoc.moveDown();

            let goalCounter = 1; 
            completedGoals.forEach(goal => {
                autDoc.fontSize(14).text(`${goalCounter}. Goal Title: ${goal.title}`, { indent: 20 });
                
                autDoc.fontSize(12).text(`Tasks:`, { indent: 40 });
                goal.tasks.forEach(task => {
                    autDoc.fontSize(12).text(`- ${task.title}`, { indent: 60 });
                });

                autDoc.fontSize(12).text(`Feedback: ${goal.feedback || 'No feedback'}`, { indent: 40 });
                autDoc.moveDown();

                goalCounter++;
            });
        }

        autDoc.end();
    } catch (autError) {
        console.error('Error generating PDF for summaries and goals:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});


// --------------------------------parent get their child details-------------------------------------
autRouter.get('/child', protect, parent, async (req, res) => {
    try {
        const autParentUser = await User.findById(req.user._id);
        
        if (!autParentUser || !autParentUser.childName || !autParentUser.childAge || !autParentUser.childGender) {
            return res.status(404).json({ message: 'No child associated with this parent' });
        }

        const autChildData = {
            childId: autParentUser._id,
            name: autParentUser.childName,
            gender: autParentUser.childGender,
            age: autParentUser.childAge
        };
        
        res.json(autChildData);
    } catch (autError) {
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

// -------------get their child notes-------------------------------------------
autRouter.get('/pastNotes/:childId', protect, parent, async (req, res) => {
    try {
        const { childId } = req.params;

        const autNotes = await Note.find({
            child: childId
        }).populate('therapist', 'firstName lastName').sort({ dateOfService: -1 });

        if (!autNotes.length) {
            return res.status(404).json({ message: 'No notes found for this child' });
        }

        res.json(autNotes);
    } catch (autError) {
        console.error('Error fetching notes for the child:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

// ----------------------------download their child notes-----------------------------------
autRouter.get('/downloadNotes/:childId', protect, parent, async (req, res) => {
    try {
        const { childId } = req.params;

        const autNotes = await Note.find({
            child: childId
        }).populate('therapist', 'firstName lastName').sort({ dateOfService: -1 });

        if (!autNotes.length) {
            return res.status(404).json({ message: 'No notes found for this child' });
        }

        const autDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="notes_${childId}.pdf"`);
        autDoc.pipe(res);

        autDoc.fontSize(20).text('Therapist Notes', { underline: true });
        autDoc.moveDown();

        autNotes.forEach(autNote => {
            autDoc.fontSize(14).text(`Date: ${new Date(autNote.dateOfService).toLocaleDateString()}`);
            autDoc.fontSize(12).text(`Therapist: ${autNote.therapist.firstName} ${autNote.therapist.lastName}`);
            autDoc.fontSize(12).text(`Service Provided: ${autNote.serviceProvided.join(', ')}`);
            autDoc.fontSize(12).text(`Notes: ${autNote.notes}`);
            autDoc.fontSize(12).text(`Therapist Signature: ${autNote.therapistSignature}`);
            autDoc.moveDown();
        });

        autDoc.end();
    } catch (autError) {
        console.error('Error generating PDF for notes:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

//--------------------------get all notes of that child--------------------------------
autRouter.get('/therapistNotes/:childId', protect, parent, async (req, res) => {
    const { childId } = req.params;
  
    try {
      const autNotes = await Note.find({ child: childId })
        .populate('therapist', 'firstName lastName')
        .sort({ dateOfService: -1 });
  
      if (!autNotes.length) {  
        return res.status(404).json({ message: 'No notes found for this child' });
      }
  
      res.json(autNotes);
    } catch (autError) {
      console.error('Error fetching therapist notes:', autError);
      res.status(500).json({ message: 'Server error', error: autError.message });
    }
  });

// ------------------------get current caretaker assigned----------------------------------------------
autRouter.get('/getCaretaker', protect, parent, async (req, res) => {
    try {
        const autParent = await User.findById(req.user._id);

        if (!autParent || !autParent.childName) {
            return res.status(404).json({ message: 'No child associated with this parent' });
        }

        const autShifts = await Shift.find({
            childId: autParent._id,
            status: { $in: ['accepted', 'completed'] },
        }).populate('caretakerId', 'firstName lastName');

        if (!autShifts || autShifts.length === 0) {
            return res.status(404).json({ message: 'No caretakers found for this child' });
        }

        const autCaretakerMap = new Map();
        const autToday = new Date();
        autShifts.forEach(autShift => {
            const autCaretakerId = autShift.caretakerId._id.toString();
            const autCurrentShiftDate = autShift.startDate;
            if (autCurrentShiftDate > autToday) {
                return;
            }

            if (!autCaretakerMap.has(autCaretakerId)) {
                autCaretakerMap.set(autCaretakerId, {
                    caretakerId: autShift.caretakerId._id,
                    firstName: autShift.caretakerId.firstName,
                    lastName: autShift.caretakerId.lastName,
                    shiftDate: autCurrentShiftDate
                });
            } else {
                const autExistingEntry = autCaretakerMap.get(autCaretakerId);
                if (autCurrentShiftDate > autExistingEntry.shiftDate) {
                    autExistingEntry.shiftDate = autCurrentShiftDate;
                }
            }
        });

        const autCaretakerList = Array.from(autCaretakerMap.values());

        res.json({ caretakers: autCaretakerList });
    } catch (autError) {
        console.error('Error fetching caretakers:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

module.exports = autRouter;
