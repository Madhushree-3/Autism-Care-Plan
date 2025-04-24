const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => { 
  let autToken; 

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      autToken = req.headers.authorization.split(' ')[1]; //splitting the token 
      const autDecoded = jwt.verify(autToken, process.env.AUT_AUTH_SEC_KEY);
      req.user = await User.findById(autDecoded.id).select('-password'); // exclude password
      next(); 
    } catch (autError) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

//---------------------admin-----------------------------------
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

//------------------------------------------Caretaker---------------------------------------------------------------- 
const caretaker = (req, res, next) => {
  if (req.user && req.user.role === 'caretaker') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a caretaker' });
  }
};

//-----------------------------------------------parent------------------------------------------------------------
const parent = (req, res, next) => {
  if (req.user && req.user.role === 'parent') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a parent' }); 
  }
};


//-------------------------------------------therapist---------------------------------------------
const therapist = (req, res, next) => {
  if (req.user && req.user.role === 'therapist') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a therapist' }); 
  }
};


const therapistOnly = (req, res, next) => {
  if (req.user && req.user.role === 'therapist') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Therapists only' });
  }
};
module.exports = { protect, admin, caretaker, parent, therapist, therapistOnly};