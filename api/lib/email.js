// lib/email.js
const nodemailer = require('nodemailer');

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * Erwartete ENV:
 * - SMTP_HOST      (z.B. smtp.gmail.com)
 * - SMTP_PORT      (465 für SSL oder 587 für STARTTLS)
 * - SMTP_USER      (deine Absender-Adresse)
 * - SMTP_PASS      (App-Passwort, NICHT dein normales Gmail-Passwort)
 * - MAIL_FROM      (optional, "Name <absender@domain.tld>", sonst SMTP_USER)
 * - APP_BASE_URL   (z.B. https://ai-news-hub-eta.vercel.app)
 */
const transporter = nodemailer.createTransport({
  host: required('SMTP_HOST'),
  port: Number(required('SMTP_PORT')),
  secure: process.env.SMTP_PORT === '465', // true = SSL, false = STARTTLS
  auth: {
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
  },
});

function buildVerifyUrl(token) {
  const base = required('APP_BASE_URL').replace(/\/+$/, '');
  return `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(to, token) {
  const verifyUrl = buildVerifyUrl(token);
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const subject = 'Verify your email for AI News Hub';
  const text = `Hi,

Please verify your email by opening this link:
${verifyUrl}

If you did not sign up, you can ignore this email.`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
    <h2>Verify your email</h2>
    <p>Click the button below to confirm your email address.</p>
    <p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#0ea5e9;color:#fff;text-decoration:none">
        Verify email
      </a>
    </p>
    <p>Or open this link: <br><a href="${verifyUrl}">${verifyUrl}</a></p>
  </div>`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendVerificationEmail };
