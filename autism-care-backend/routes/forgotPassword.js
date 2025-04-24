const express = require('express');
const autRouter = express.Router();
const nodemailer = require('nodemailer');
const autCrypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const autTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUT_EMAIL,
        pass: process.env.AUT_EMAIL_PASS
    }
});

//-----------------------------Forget Password Route---------------------------------------------
autRouter.post('/autForgotPassword', async (req, res) => {
    const { email } = req.body;

    try {
        const autUser = await User.findOne({ email });

        if (!autUser) {
            return res.status(404).json({ message: "User with that email not found." });
        }

        autUser.autResetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes expiration time
        const autResetToken = autCrypto.randomBytes(20).toString('hex');
        const autHashedToken = autCrypto.createHash('sha256').update(autResetToken).digest('hex');
        
        autUser.autResetPasswordToken = autHashedToken;

        await autUser.save();

        console.log(`Token generated for user: ${autUser.email} with token: ${autResetToken}`);

        const autResetLink = `http://localhost:3000/autResetPassword/${autResetToken}`;

        const autMailOptions = {
            from: process.env.AUT_EMAIL,
            to: autUser.email,
            subject: 'Password Reset Request',
            text: `You (or someone else) have requested to reset the password for your account.\n\n` +
                  `Please click the link below or paste it into your browser to complete the process within 30 minutes:\n\n` +
                  `${autResetLink}\n\n` +
                  `If you did not request this, please disregard this email and no changes will be made.`
        };

        autTransporter.sendMail(autMailOptions, (err) => {
            if (err) {
                console.error('Error sending reset email:', err);
                return res.status(500).json({ message: "There was an error sending the email." });
            }
            res.json({ message: 'Password reset email sent. Please check your inbox.' });
        });

    } catch (autError) {
        console.error('Error processing password reset request:', autError);
        res.status(500).json({ message: 'An error occurred while processing your request.', error: autError.message });
    }
});

//-----------------------------Reset Password Route-----------------------------------------
autRouter.post('/autResetPassword/:autToken', async (req, res) => {
    const { autToken } = req.params;
    const { password } = req.body;

    try {
        const autHashedToken = autCrypto.createHash('sha256').update(autToken).digest('hex');

        const autSalt = await bcrypt.genSalt(10);
        const autHashedPassword = await bcrypt.hash(password, autSalt);

        const autUser = await User.findOneAndUpdate(
            {
                autResetPasswordToken: autHashedToken,
                autResetPasswordExpires: { $gt: Date.now() }
            },
            {
                password: autHashedPassword,
                autResetPasswordToken: undefined,
                autResetPasswordExpires: undefined
            },
            { new: true }
        );

        if (!autUser) {
            console.log('Token is invalid or has expired.');
            return res.status(400).json({ message: "Invalid or expired password reset token." });
        }

        console.log(`Password updated successfully for user: ${autUser.email}`);
        res.json({ message: 'Your password has been updated successfully.' });
    } catch (autError) {
        console.error('Error resetting password:', autError);
        res.status(500).json({ message: 'An error occurred while resetting your password.', error: autError.message });
    }
});

module.exports = autRouter;
