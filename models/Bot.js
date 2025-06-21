const { mongoose } = require('../db');

const BotSchema = new mongoose.Schema({
  id: String,
  username: String,
  password: String,
  warpName: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bot', BotSchema);