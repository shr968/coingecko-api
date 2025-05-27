const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});



async function getCryptoPrice(cryptoId, retries = 3, delayMs = 1000) {
  if (!cryptoId) throw new Error('Invalid cryptoId');
  try {
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd`);
    if (!res.data || !res.data[cryptoId] || typeof res.data[cryptoId].usd !== 'number') {
      throw new Error(`No price data found for ${cryptoId}`);
    }
    return res.data[cryptoId].usd;
  } catch (err) {
    if (err.response && err.response.status === 429 && retries > 0) {
      console.warn(`Rate limited on ${cryptoId}, retrying after ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
      return getCryptoPrice(cryptoId, retries - 1, delayMs * 2); 
    }
    throw err;
  }
}


cron.schedule('*/2 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Checking user portfolios...`);

  try {
    const users = await User.find({});
    for (const user of users) {
      let portfolioChanged = false;

      if (!Array.isArray(user.portfolio)) {
        console.warn(`User ${user.email} has invalid portfolio`);
        continue;
      }

      for (const item of user.portfolio) {
        if (!item || !item.coin) {
          console.warn(`Skipping invalid portfolio item for user ${user.email}`);
          continue;
        }

        try {
          const currentPrice = await getCryptoPrice(item.coin.toLowerCase());

          if (!item.lastPrice) {
            item.lastPrice = currentPrice;
            portfolioChanged = true;
            continue;
          }

          const priceChange = Math.abs(((currentPrice - item.lastPrice) / item.lastPrice) * 100);
          if (priceChange >= (item.threshold || 0)) {
            const mailOptions = {
              from: 'shreyanayakb26@gmail.com',
              to: user.email,
              subject: `🚨 ${item.coin.toUpperCase()} Price Alert`,
              text: `Hi ${user.username || user.email},\n\nThe price of ${item.coin.toUpperCase()} has changed by ${priceChange.toFixed(2)}%.\n\nPrevious Price: $${item.lastPrice}\nCurrent Price: $${currentPrice}\n\n- Crypto Tracker`
            };

            await transporter.sendMail(mailOptions);
            console.log(`Alert sent to ${user.email} for ${item.coin}`);

            item.lastPrice = currentPrice;
            portfolioChanged = true;
          }
        } catch (err) {
          console.error(`Error checking ${item.coin} for ${user.email}:`, err.message);
        }
      }

      if (portfolioChanged) {
        try {
          await user.save();
          console.log(`Updated portfolio for user ${user.email}`);
        } catch (saveErr) {
          console.error(`Error saving user ${user.email}:`, saveErr.message);
        }
      }
    }
  } catch (err) {
    console.error('Error in cron job:', err.message);
  }
});
