const express = require('express');
const autUser = require('../models/User');
const bcrypt = require('bcryptjs');
const autRouter = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const autAlert = require('../models/Alert');
const autAppointment = require('../models/Appointment');

// ---------------- --Aprroved Users--------------------------------------------------
autRouter.get('/users/fetchUsers', protect, admin, async (req, res) => {
  try {
    const autApprovedUsers = await autUser.find({ approved: true });
    res.json(autApprovedUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//--------------- users waiting for approval---------------------------------------
autRouter.get('/users/pendingUsers', protect, admin, async (req, res) => {
  try {
    const autPendingUsers = await autUser.find({ approved: false });
    res.json(autPendingUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//---------------------Approve user-----------------------------------------------------
autRouter.put('/users/:id/approveUser', protect, admin, async (req, res) => {
  try {
    const autUserToApprove = await autUser.findById(req.params.id);
    if (!autUserToApprove) {
      return res.status(404).json({ message: 'User not found' });
    }
    autUserToApprove.approved = true;
    await autUserToApprove.save();
    res.json({ message: 'User approved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
// //------------------------------ caretakers profile-------------------------------
// router.get('/caretakersProfile', protect, admin, async (req, res) => {
//   try {
//     const caretakers = await User.find({ role: 'caretaker' }).select('-password');
//     res.json(caretakers);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching caretakers' });
//   }
// });

//---------------------Delete user----------------------------------------------------
autRouter.delete('/users/deleteUser/:id', protect, admin, async (req, res) => {
  try {
    const autUserToDelete = await autUser.findById(req.params.id);
    if (!autUserToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    await autUserToDelete.remove();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//-------------------------Add new admin--------------------------------------------------
autRouter.post('/users/addAdmin', protect, admin, async (req, res) => {
  const { email, password, firstName, lastName, mobileNumber } = req.body;

  if (!email || !password || !firstName || !lastName || !mobileNumber) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const autExistingAdmin = await autUser.findOne({ email });
    if (autExistingAdmin) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const autNewAdmin = new autUser({
      email,
      password,
      firstName,
      lastName,
      mobileNumber,
      role: 'admin',
      approved: true
    });

    await autNewAdmin.save();
    res.status(201).json({ message: 'New admin created successfully' });
  } catch (err) {
    console.error('Error creating admin:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

//-----------------------------------------child profile----------------------------------------------------------
autRouter.get('/getChildProfiles', protect, admin, async (req, res) => {
  try {
    const autChildren = await autUser.find({ childName: { $exists: true, $ne: "" }, approved: true })
                                     .select('childName childGender childAge address moreInfo firstName lastName');
    const autResult = autChildren.map(autChild => ({
      _id: autChild._id,
      childName: autChild.childName,
      childGender: autChild.childGender,
      childAge: autChild.childAge,
      address: autChild.address,
      moreInfo: autChild.moreInfo,
      parentName: `${autChild.firstName} ${autChild.lastName}`
    }));

    res.json(autResult);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//-----------------------------------Update child profile--------------------------------------------------
autRouter.put('/childProfiles/:id', protect, admin, async (req, res) => {
  const { childName, childGender, childAge, address, moreInfo } = req.body;
  try {
    const autUpdateChild = await autUser.findById(req.params.id);
    if (!autUpdateChild) {
      return res.status(404).json({ message: 'Child profile not found' });
    }

    autUpdateChild.childName = childName || autUpdateChild.childName;
    autUpdateChild.childGender = childGender || autUpdateChild.childGender;
    autUpdateChild.childAge = childAge || autUpdateChild.childAge;
    autUpdateChild.address = address || autUpdateChild.address;
    autUpdateChild.moreInfo = moreInfo || autUpdateChild.moreInfo;

    await autUpdateChild.save();
    res.json({ message: 'Child profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

//------------------------------ caretakers profile-------------------------------
autRouter.get('/caretakersProfile', protect, admin, async (req, res) => {
  try {
    const autCaretakers = await autUser.find({ role: 'caretaker' }).select('-password');
    res.json(autCaretakers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching caretakers' });
  }
});

//------------------------------- all parents----------------------------------
autRouter.get('/parentsProfile', protect, admin, async (req, res) => {
  try {
    const autParents = await autUser.find({ role: 'parent' }).select('-password');
    res.json(autParents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching parents' });
  }
});

//----------------------------- all therapists---------------------------------
autRouter.get('/therapistsProfile', protect, admin, async (req, res) => {
  try {
    const autTherapists = await autUser.find({ role: 'therapist' }).select('-password');
    res.json(autTherapists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching therapists' });
  }
});

//-------------------------- caretakers name for filter ----------------------------------
autRouter.get('/getCaretakers', protect, admin, async (req, res) => {
  try {
    const autCaretakersForFilter = await autUser.find({ role: 'caretaker', approved: true }).select('_id firstName lastName');
    res.json(autCaretakersForFilter);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//--------------------------- children name for filter-----------------------------------------
autRouter.get('/getChildren', protect, admin, async (req, res) => {
  try {
    const autChildrenForFilter = await autUser.find({ role: 'parent', approved: true }).select('_id childName');
    res.json(autChildrenForFilter);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//-------------------------list emergency alerts triggered------------------------
autRouter.get('/emergency-alerts', protect, admin, async (req, res) => {
  try {
    let autAlerts = await autAlert.find().populate('caretakerId', 'firstName lastName') 
    .populate('childId', 'childName'); 

    autAlerts = autAlerts.map(autAlertItem => {
      if (!Array.isArray(autAlertItem.type)) {
        autAlertItem.type = [autAlertItem.type]; 
      }
      return autAlertItem;
    });

    res.json(autAlerts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch alerts', error: error.message });
  }
});

//---------------------------list therapist appointments--------------------
autRouter.get('/therapist-appointments', protect, admin, async (req, res) => {
  try {
    const autTherapistAppointments = await autAppointment.find({ status: 'approved' })
      .populate('therapist', 'firstName lastName email')
      .populate('parent', 'firstName lastName email')
      .populate('patient', 'childName childGender childAge');

    res.status(200).json(autTherapistAppointments);
  } catch (error) {
    console.error('Error fetching therapist appointments:', error);
    res.status(500).json({ message: 'Failed to fetch therapist appointments', error: error.message });
  }
});

module.exports = autRouter;
