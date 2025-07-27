const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const nodemailer = require('nodemailer');
const User = require('../models/User');
require('dotenv').config();
const logger = require('./logger');
const { sendToQueue } = require('./mailQueue');


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
      logger.warn(`Rate limited on ${cryptoId}, retrying after ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
      return getCryptoPrice(cryptoId, retries - 1, delayMs * 2); 
    }
    throw err;
  }
}


cron.schedule('*/2 * * * *', async () => {
  logger.info(`[${new Date().toISOString()}] Checking user portfolios...`);

  try {
    const users = await User.find({});
    for (const user of users) {
      let portfolioChanged = false;

      if (!Array.isArray(user.portfolio)) {
        logger.warn(`User ${user.email} has invalid portfolio`);
        continue;
      }

      for (const item of user.portfolio) {
        if (!item || !item.coin) {
          logger.warn(`Skipping invalid portfolio item for user ${user.email}`);
          continue;
        }

        try {
          logger.info(`Checking coin: ${item.coin} for user: ${user.email}`);
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


            await sendToQueue(mailOptions);
            logger.info(`📬 Queued alert for ${user.email} - ${item.coin}`);


            item.lastPrice = currentPrice;
            portfolioChanged = true;
          }
        } catch (err) {
            logger.error(`❌ Error for ${item.coin} - ${user.email}`);
            logger.error(`→ Error name: ${err.name}`);
            logger.error(`→ Error message: ${err.message}`);
            logger.error(`→ Full error: ${err.stack}`);
}

      }

      if (portfolioChanged) {
        try {
          await user.save();
          logger.info(`Updated portfolio for user ${user.email}`);
        } catch (saveErr) {
          logger.error(`Error saving user ${user.email}:`, saveErr.message);
        }
      }
    }
  } catch (err) {
    logger.error('Error in cron job:', err.message);
  }
});
