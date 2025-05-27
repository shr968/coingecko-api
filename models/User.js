const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  portfolio: [
    {
      coin: String,
      threshold: Number,
      interval: Number,
      lastPrice: Number
    }
  ]
});

module.exports = mongoose.model('User', userSchema);
