const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');

const updateAppandAvail = async (req, res, next) => {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  try {

    const completedAppointments = await Appointment.updateMany(
      {
        date: { $lt: currentDate },
        status: 'approved'  
      },
      {
        $set: { status: 'completed' }
      }
    );
    console.log(`Appointments updated to 'completed': ${completedAppointments.nModified}`);

    const missedAppointments = await Appointment.updateMany(
      {
        date: { $lt: currentDate },
        status: 'pending'  
      },
      {
        $set: { status: 'missed' }
      }
    );
    console.log(`Appointments updated to 'missed': ${missedAppointments.nModified}`);

    // const availabilityResult = await Availability.deleteMany({
    //   date: { $lt: currentDate }
    // });
    // console.log(`Past availabilities removed: ${availabilityResult.deletedCount}`);

    next(); 
  } catch (error) {
    console.error('Error updating appointment statuses or removing past availabilities:', error);
    res.status(500).json({ message: 'Failed to update appointment statuses or remove past availabilities', error: error.message });
  }
};

module.exports = updateAppandAvail;
