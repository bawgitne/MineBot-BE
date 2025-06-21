const express = require('express');
const router = express.Router();
const botService = require('../services/botService');
const BotModel = require('../models/Bot');

// Lấy tất cả bots từ DB
router.get('/', async (req, res) => {
  const allBots = await BotModel.find();
  res.json(allBots);
});

// Tạo bot mới
router.post('/', botService.createBot);

// Thao tác bot: start, stop, restart, disconnect, continue
router.post('/:id/action', botService.handleBotAction);

module.exports = router;