const mongoose = require('mongoose');
const logger = require('./logger');

const mongoURI ='mongodb://localhost:27017/users';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
