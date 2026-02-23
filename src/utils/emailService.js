// src/utils/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your Gmail App Password
    },
    connectionTimeout: 5000, // Fail fast if HF blocks SMTP
    greetingTimeout: 5000,
    socketTimeout: 5000
});

exports.sendEmailOTP = async (email, otp) => {
    // ALWAYS log the OTP to the server console as a fallback if emails are blocked!
    console.log(`\n========================================`);
    console.log(`🔑 2FA LOGIN OTP CODE: ${otp}`);
    console.log(`📧 Destination: ${email}`);
    console.log(`========================================\n`);
    const mailOptions = {
        from: `"VoteGuard Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Your VoteGuard Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">VoteGuard Security</h2>
                <p>You are attempting to sign in. Please use the following code to complete your verification.</p>
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e293b; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #64748b; font-size: 12px;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("⚠️ EMAIL CREDENTIALS MISSING. MOCKING EMAIL SEND.");
            console.log(`[MOCK EMAIL] To: ${email} | Code: ${otp}`);
            return true;
        }
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email}`);
        return true;
    } catch (error) {
        console.error("❌ Email Send Failed:", error);
        return false;
    }
};