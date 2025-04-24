
const nodemailer = require('nodemailer');

const autTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUT_EMAIL,  
        pass: process.env.AUT_EMAIL_PASS
    }
});

const autSendEmail = async (autOptions) => {
    const autMailOptions = {
        from: 'autemail@example.com',
        to: autOptions.to, 
        subject: autOptions.subject,
        text: autOptions.text,
        html: autOptions.html 
    };

    await autTransporter.sendMail(autMailOptions);
};

module.exports = autSendEmail;
