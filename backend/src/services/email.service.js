const nodemailer = require('nodemailer');

const isEmailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

const sendPasswordResetCode = async (email, code) => {
  if (!isEmailConfigured()) {
    throw new Error('Gmail SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '')
    }
  });

  await transporter.sendMail({
    from: `"Simple Posts" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Simple Posts password reset code',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `<p>Your Simple Posts password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`
  });
};

module.exports = { isEmailConfigured, sendPasswordResetCode };
