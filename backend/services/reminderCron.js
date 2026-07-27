const prisma = require('../prisma');
const { createNotification, sendEmail } = require('./notificationService');

async function checkAndSendReminders() {
  try {
    const now = new Date();

    const in24hStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    const in24hEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

    const upcoming24hEvents = await prisma.event.findMany({
      where: {
        date: { gte: in24hStart, lte: in24hEnd },
        status: 'Aktif'
      },
      include: { reservations: true }
    });

    for (const event of upcoming24hEvents) {
      for (const res of event.reservations) {
        if (res.status === 'Onaylandı') {
          await sendEmail({
            to: res.email,
            subject: `Hatırlatma: ${event.name} etkinliğinize 24 saat kaldı!`,
            body: `Merhaba ${res.customer}, ${event.name} etkinliği yarın gerçekleşecektir.`
          });
        }
      }
    }

    const in2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const in2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    const upcoming2hEvents = await prisma.event.findMany({
      where: {
        date: { gte: in2hStart, lte: in2hEnd },
        status: 'Aktif'
      },
      include: { reservations: true }
    });

    for (const event of upcoming2hEvents) {
      for (const res of event.reservations) {
        if (res.status === 'Onaylandı') {
          await sendEmail({
            to: res.email,
            subject: `Son Hatırlatma: ${event.name} etkinliğinize 2 saat kaldı!`,
            body: `Merhaba ${res.customer}, ${event.name} etkinliği 2 saat sonra başlıyor!`
          });
        }
      }
    }
  } catch (error) {
    console.error('Reminder Cron Error:', error.message);
  }
}

module.exports = { checkAndSendReminders };
