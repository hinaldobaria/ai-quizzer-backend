const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SENDGRID_USERNAME || 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

transporter.sendMail({
  from: `"Test" <${process.env.EMAIL_FROM}>`,
  to: 'hinaldobaria4@gmail.com',
  subject: "Test Email from SendGrid",
  text: "This is a test email from your AI Quizzer backend."
}, (err, info) => {
  if (err) {
    console.error('Test email failed:', err);
  } else {
    console.log('Test email sent:', info);
  }
});