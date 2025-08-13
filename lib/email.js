const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendVerificationEmail(to, token) {
  const baseUrl = process.env.BASE_URL;
  const url = `${baseUrl}/api/auth/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: 'Verify your email',
    html: `<p>Please verify your email by clicking <a href="${url}">this link</a>.</p>`,
  });
}

module.exports = { sendVerificationEmail };
