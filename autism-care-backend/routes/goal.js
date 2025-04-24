const express = require('express');
const autGoal = require('../models/Goal');
const { protect, caretaker } = require('../middleware/authMiddleware');
const autRouter = express.Router();

//-----------------------------Get current child goals------------------------------------------------------------
autRouter.get('/childGoals/:childId', protect, caretaker, async (req, res) => {
    try {
        const { childId } = req.params;

        // Validate child ID format
        if (!childId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid child ID format' });
        }

        const autGoals = await autGoal.find({ childId });

        if (!autGoals.length) {
            return res.status(404).json({ message: 'No goals found for this child' });
        }

        res.json({ autGoals });
    } catch (autError) {
        console.error('Error fetching goals for child:', autError);
        res.status(500).json({ message: 'Server error', error: autError.message });
    }
});

//-------------------------------Add a new goal--------------------------------------------------------
autRouter.post('/goals', async (req, res) => {
    const { childId, title, tasks, color } = req.body;
    try {
        const autNewGoal = new autGoal({ childId, title, tasks, color });
        await autNewGoal.save();
        res.status(201).json(autNewGoal);
    } catch (autError) {
        console.error('Error adding goal:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

//----------------------------------------Add a task to goal-----------------------------------------------------
autRouter.post('/goals/:goalId/tasks', async (req, res) => {
    const { title } = req.body;
    try {
        const autGoalToUpdate = await autGoal.findById(req.params.goalId);
        autGoalToUpdate.tasks.push({ title, completed: false });
        await autGoalToUpdate.save();
        res.status(201).json(autGoalToUpdate);
    } catch (autError) {
        console.error('Error adding task:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

//------------------------------------Complete a task within a goal------------------------------------------------------------
autRouter.put('/goals/:goalId/tasks/:taskId/complete', async (req, res) => {
    try {
        const autGoalToUpdate = await autGoal.findById(req.params.goalId);
        const autTaskToUpdate = autGoalToUpdate.tasks.id(req.params.taskId);
        autTaskToUpdate.completed = !autTaskToUpdate.completed;
        await autGoalToUpdate.save();
        res.json(autGoalToUpdate);
    } catch (autError) {
        console.error('Error completing task:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

//---------------------------------Delete a task from a goal-------------------------------------------------------------
autRouter.delete('/goals/:goalId/tasks/:taskId', async (req, res) => {
    try {
        const autGoalToUpdate = await autGoal.findById(req.params.goalId);
        autGoalToUpdate.tasks.id(req.params.taskId).remove();
        await autGoalToUpdate.save();
        res.status(204).send();
    } catch (autError) {
        console.error('Error deleting task:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

//------------------------------------Edit a goal---------------------------------------------------------
autRouter.put('/goals/:goalId', async (req, res) => {
    try {
        const autUpdatedGoal = await autGoal.findByIdAndUpdate(req.params.goalId, req.body, { new: true });
        res.json(autUpdatedGoal);
    } catch (autError) {
        console.error('Error editing goal:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

//------------------------------------------Delete a goal---------------------------------------------------
autRouter.delete('/goals/:goalId', async (req, res) => {
    try {
        await autGoal.findByIdAndDelete(req.params.goalId);
        res.status(204).send();
    } catch (autError) {
        console.error('Error deleting goal:', autError);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = autRouter;
