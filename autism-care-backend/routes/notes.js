
const express = require('express');
const autUser = require('../models/User');
const autNote = require('../models/Notes');
const autGoal = require('../models/Goal')
const autDailySummary = require('../models/DailySummary');
const { protect, therapistOnly } = require('../middleware/authMiddleware');

const autRouter = express.Router();

//-------------------------fetch specialization--------------------------------------
autRouter.get('/therapistDetails', protect, therapistOnly, async (req, res) => {
    try {
        const autTherapist = await autUser.findById(req.user._id).select('specialization');
        if (!autTherapist) {
            return res.status(404).json({ message: 'Therapist not found' });
        }
        res.status(200).json(autTherapist);
    } catch (autError) {
        res.status(500).json({ message: 'Failed to fetch therapist details', error: autError.message });
    }
});

//-------------------------get registered children--------------------------------------------------
autRouter.get('/getallChildren', protect, therapistOnly, async (req, res) => {
    try {
        const autChildren = await autUser.find({ role: 'parent', approved: true }).select('childName _id');
        res.json(autChildren);
    } catch (autError) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ------------------get selected child details------------------------------------------------
autRouter.get('/childDetails/:childId', protect, therapistOnly, async (req, res) => {
    const { childId } = req.params;
    try {
        const autChild = await autUser.findById(childId).select('childName childAge childGender');
        if (!autChild) {
            return res.status(404).json({ message: 'Child not found' });
        }
        res.status(200).json(autChild);
    } catch (autError) {
        res.status(500).json({ message: 'Failed to fetch child details', error: autError.message });
    }
});

// ------------------------------------submit notes----------------------------------------------
autRouter.post('/submitNotes', protect, therapistOnly, async (req, res) => {
    const { child, notes, therapistSignature, dateOfService, serviceProvided } = req.body;

    try {
        const autNoteSubmission = new autNote({
            therapist: req.user._id,
            child,
            notes,
            therapistSignature,
            dateOfService,
            serviceProvided,
        });

        await autNoteSubmission.save();

        res.status(201).json({ message: 'Notes submitted successfully', note: autNoteSubmission });
    } catch (autError) {
        res.status(500).json({ message: 'Failed to submit notes', error: autError.message });
    }
});

//-------------------get past notes of that particular child------------------------------------
autRouter.get('/pastNotes/:childId', protect, therapistOnly, async (req, res) => {
    const { childId } = req.params;
    try {
        const autPastNotes = await autNote.find({ child: childId })
            .populate('child', 'childName childAge childGender')
            .populate('therapist', 'firstName lastName')
            .sort({ dateOfService: -1 });

        res.status(200).json(autPastNotes);
    } catch (autError) {
        res.status(500).json({ message: 'Failed to fetch past notes', error: autError.message });
    }
});

//-------------------------------getT children----------------

autRouter.get('/getTChildren', protect, therapistOnly, async (req, res) => {
    try {
        const autChildren = await autUser.find({ role: 'parent', approved: true }).select('childName _id');
        res.json(autChildren.map(autChild => ({ label: autChild.childName, value: autChild._id })));
    } catch (autError) {
        console.error('Error fetching children:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

//-----------------------------fetch summaries------------------
autRouter.get('/pastSummaries/:childId', protect, therapistOnly, async (req, res) => {
    const { childId } = req.params;
    const autToday = new Date();
    const autLast30Days = new Date();
    autLast30Days.setDate(autToday.getDate() - 30);

    try {

        const childDetails = await autUser.findById(childId).select('childName childAge childGender');
        if (!childDetails) {
            return res.status(404).json({ message: 'Child not found' });
        }

        const autSummaries = await autDailySummary.find({
            childId,
            date: { $gte: autLast30Days, $lte: autToday }
        }).sort({ date: -1 });

        const completedGoals = await autGoal.find({
            childId,
            completed: true  
        }).select('title tasks feedback completed');

        if (!autSummaries.length && !completedGoals.length) {
            return res.status(404).json({ message: 'No summaries or completed goals found for the past 30 days' });
        }

        res.json({
            childDetails,
            summaries: autSummaries,
            completedGoals: completedGoals
        });

    } catch (autError) {
        console.error('Error fetching summaries or goals for the past 30 days:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

module.exports = autRouter;
