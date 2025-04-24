const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const autSetupSocket = require('./socket'); 
const { protect, admin, caretaker, parent, therapistOnly } = require('./middleware/authMiddleware');


dotenv.config();

const app = express();
const server = http.createServer(app); 
autSetupSocket(server);

app.use(bodyParser.json());
app.use(cors());

mongoose.connect(process.env.AUT_DB, { useNewUrlParser: true, useUnifiedTopology: true });


const db = mongoose.connection;
db.on('error', (error) => console.error('Connection error:', error));
db.once('open', () => {
  console.log('Connected to MongoDB');
});



const users = require('./routes/users');
const adminRoutes = require('./routes/admin');
const shiftschedule = require('./routes/shiftschedule');
const caretakerShift = require('./routes/caretakerShift');
const goalRoutes = require('./routes/goal');
const alert = require('./routes/alert');
const searchRoutes = require('./routes/search');
const appointmentRoutes = require('./routes/appointment');
const availabilityRoutes = require('./routes/availability');
const password = require('./routes/forgotPassword');
const messageRoutes = require('./routes/messages');
const parentRoutes = require('./routes/parent');
const notesRoutes = require('./routes/notes');


app.use('/api/users', users);
app.use('/api/admin', protect, admin, adminRoutes);
app.use('/api/shiftschedule', protect, admin, shiftschedule);
app.use('/api/caretaker', protect, caretaker, caretakerShift); 
app.use('/api/goals', protect, caretaker, goalRoutes);
app.use('/api/search', protect, searchRoutes);
app.use('/api/alert', protect, caretaker, alert);
app.use('/api/appointment', protect, appointmentRoutes);
app.use('/api/availability', protect, availabilityRoutes);
app.use('/api/password', password);
app.use('/api/messages', messageRoutes);
app.use('/api/parent', protect, parent, parentRoutes);
app.use('/api/notes',protect, therapistOnly, notesRoutes);

//----------------------------Error handling middleware------------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Server Error', error: err.message });
});

const PORT = process.env.AUT_APP_PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);

});