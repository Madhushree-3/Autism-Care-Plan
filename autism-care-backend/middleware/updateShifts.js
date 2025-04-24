const Shift = require('../models/Shift'); 

const updateShiftStatus = async (req, res, next) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);  

  try {
    const result = await Shift.updateMany(
      {
        endDate: { $lt: currentDate }, 
        status: 'accepted' 
      },
      {
        $set: { status: 'completed' } 
      }
    );

    console.log(`Shifts updated to 'completed': ${result.nModified}`);
    next(); 
  } catch (error) {
    console.error('Error updating shift statuses:', error);
    res.status(500).json({ message: 'Failed to update shift statuses', error: error.message });
  }
};

module.exports = updateShiftStatus;
