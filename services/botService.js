const { createMiningBot, restart } = require('./mineflayerLogic');
const BotModel = require('../models/Bot');
const { getIO } = require('./socketService');

const bots = [];

// Broadcast allbot data every 1 second
async function broadcastAllBots() {
  const allBotData = await BotModel.find();
  const runningBotsMap = new Map();
  bots.forEach(bot => {
    if (bot && bot.player) {
      bot.ping = bot.player.ping || null;
    }
    runningBotsMap.set(bot.id, bot);
  });

  const allBotStats = allBotData.map(botData => {
    const runningBot = runningBotsMap.get(botData.id);
    return {
      id: botData.id,
      username: botData.username,
      password: botData.password,
      warpName: botData.warpName,
      createdAt: botData.createdAt,
      state: runningBot?.state || 'DISCONNECTED',
      durability: runningBot?.durability || null,
      blocksMinedToday: runningBot?.blocksMinedToday || 0,
      ping: runningBot?.ping || null,
      joinServer: runningBot?.joinServer || null,
      blockId: runningBot?.blockId || null,
      repair: runningBot?.repair || 0,
      noti: runningBot?.noti || null,
      logs: runningBot?.logList || []
    };
  });

  getIO().emit('allbot', allBotStats);
}

setInterval(() => {
  broadcastAllBots().catch(err => {
    console.error('Error broadcasting bots:', err);
  });
}, 1000);

exports.createBot = async (req, res) => {
  const config = req.body;
  const lastBot = await BotModel.findOne().sort({ id: -1 });
  let newId = 1;
  if (lastBot && !isNaN(Number(lastBot.id))) {
    newId = Number(lastBot.id) + 1;
  }

  await BotModel.create({
    id: newId.toString(),
    username: config.username,
    password: config.password,
    warpName: config.warpname,
  });

  res.json({ success: true, id: newId.toString() });
};

exports.handleBotAction = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  let bot = bots.find(b => b.id === id);
  const botData = await BotModel.findOne({ id });

  if (!botData) return res.status(404).json({ error: 'Bot not found in DB' });

  const config = {
    host: process.env.BOT_HOST,
    port: parseInt(process.env.BOT_PORT || '25565'),
    username: botData.username,
    password: botData.password,
    warpname: botData.warpName,
    version: process.env.BOT_VERSION || '1.20.1',
    id: botData.id
  };

  try {
    if (action === 'start') {
      if (bot && bot.end) {
        bot.end();
        bots.splice(bots.findIndex(b => b.id === id), 1);
      }
      const newBot = await createMiningBot(config);
      newBot.id = id;
      newBot.warpName = botData.warpName;
      bots.push(newBot);
    }

    if (action === 'stop' && bot && typeof bot.stop === 'function') {
      bot.stop();
    }

    if (action === 'restart' && bot) {
      const newBot = await restart(bot, config);
      newBot.id = id;
      newBot.warpName = botData.warpName;
      const idx = bots.findIndex(b => b.id === id);
      if (idx !== -1) bots[idx] = newBot;
      else bots.push(newBot);
    }

    if (action === 'disconnect' && bot && typeof bot.end === 'function') {
      bot.end();
      bots.splice(bots.findIndex(b => b.id === id), 1);
    }

    if (action === 'continue' && bot && typeof bot.continueMining === 'function') {
      bot.continueMining();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Bot action failed', detail: err.message });
  }
};

exports.bots = bots;