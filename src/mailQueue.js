// utils/mailQueue.js
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const amqp = require('amqplib');

const QUEUE_NAME = 'email_notifications';

let channel = null;

async function connectQueue() {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME);
}

async function sendToQueue(data) {
  if (!channel) {
    await connectQueue();
  }

  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
}

module.exports = { sendToQueue };
