// mailWorker.js
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
require('dotenv').config();

const QUEUE_NAME = 'email_notifications';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function startWorker() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME);

  console.log("📨 Mail Worker started. Waiting for messages...");

  channel.consume(QUEUE_NAME, async (msg) => {
    if (msg !== null) {
      const emailData = JSON.parse(msg.content.toString());
      try {
        await transporter.sendMail(emailData);
        console.log(`✅ Email sent to ${emailData.to}`);
        channel.ack(msg);
      } catch (err) {
        console.error(`❌ Failed to send email: ${err.message}`);
        // Optional: requeue or log somewhere
        channel.nack(msg, false, false); // discard this message
      }
    }
  });
}

startWorker().catch(err => console.error("Worker error:", err));
