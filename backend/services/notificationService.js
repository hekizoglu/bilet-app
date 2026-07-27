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
  console.log(`[MOCK EMAIL SENT] To: ${to} | Subject: ${subject} | Body: ${body}`);
  return true;
}

module.exports = {
  createNotification,
  sendEmail
};
