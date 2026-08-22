const prisma = require('../prisma');

async function createNotification({ userId, title, message, type = 'INFO' }) {
  try {
    if (!userId) return null;
    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type
      }
    });
  } catch (err) {
    console.error('Notification Creation Error:', err.message);
    return null;
  }
}

async function sendEmail({ to, subject, body }) {
  // SMTP yapılandırması varsa gerçek e-posta gönder; yoksa geliştirme amaçlı logla.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[MOCK EMAIL SENT] To: ${to} | Subject: ${subject} | Body: ${body}`);
    return true;
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Bilet Sistemi" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: body
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

module.exports = {
  createNotification,
  sendEmail
};
