const mineflayer = require('mineflayer');
const { wait, waitForSlotItemName } = require('../utils');
const tpsPlugin = require('mineflayer-tps');

async function createMiningBot({ host, port = 25565, username, password, warpname, version = '1.20.1' }) {
  const bot = mineflayer.createBot({ host, port, username, version });
  bot.loadPlugin(tpsPlugin);

  let is_mining = false;
  let percentageMode = false;
  const mining = { durabilityThreshold: 1550 };
  let state = 'IDLE';

  bot.state = state;
  bot.repair = 0;
  bot.noti = null;
  bot.slot = null; // Server-only variable to store pickaxe slot

  function setState(newState) {
    state = newState;
    bot.state = newState;
    getIO().emit('bot-state', { id: bot.id, state });
  }

  // Find the hotbar slot (0-8) that has a pickaxe
  function findPickaxeHotbarSlot() {
    for (let i = 0; i < 9; i++) {
      const slot = bot.inventory.slots[36 + i];
      if (slot && slot.name && slot.name.endsWith('_pickaxe')) {
        return i;
      }
    }
    return null;
  }

  function changeMining(mode) {
    is_mining = !!mode;
    if (is_mining) {
      // Set hotbar to pickaxe before mining
      const pickaxeSlot = findPickaxeHotbarSlot();
      if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
      setState('MINING');
      dig();
    } else {
      setState('IDLE');
    }
  }

  bot.changeMining = changeMining;

  // Continue mining: warp and start mining
  bot.continueMining = async function() {
    await wait(1000)
    bot.chat(`/is warp ${warpname}`);
    // After warping, set quickbar to pickaxe slot if found
    const pickaxeSlot = findPickaxeHotbarSlot();
    if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
    await wait(1000)
    if (typeof bot.stop === 'function') {
      bot.stop(); // Ensure bot is not mining before starting
    }
    changeMining(true);
  };

  function stop() {
    changeMining(false);
    setState('IDLE');
    bot.chat('/is go');
  }
  bot.stop = stop;

  bot.logList = [];
  function addLog(msg) {
    const log = { msg, time: new Date().toISOString() };
    bot.logList.push(log);
    if (bot.logList.length > 20) bot.logList.shift();
    getIO().emit('bot-log', { id: bot.id, log });
  }

  bot.once('spawn', async () => {
    try {
      setState('LOGGING');

      try {
        const BotModel = require('./models/Bot');
        if (bot.id) {
          await BotModel.updateOne({ id: bot.id }, { 
            uptime: Date.now(),
            joinServer: bot.joinServer
          });
        }
      } catch (e) {
      }

      bot.chat(`/login ${password}`);

      const item = await waitForSlotItemName(bot, 5, 'clock');
      bot.setQuickBarSlot(4);
      bot.activateItem();

      bot.once('windowOpen', async (window1) => {
        const item20 = window1.slots[20];
        bot.clickWindow(20, 0, false);

        bot.once('windowOpen', async (window2) => {
          const item12 = window2.slots[12];
          bot.clickWindow(12, 0, false);
          await wait(1000);
          bot.chat(`/is warp ${warpname}`);
          await wait(1000);
          changeMining(true);
        });
      });
    } catch (err) {
    }
  });

  async function dig() {
    if (!is_mining) return;
    const block = bot.blockAtCursor(4);
    if (!block) {
      bot.noti = "HÃY RENDER BLOCK!!";
      setTimeout(() => {
        if (is_mining) dig();
      }, 50);
    } else {
      try {
        bot.blockId = block.name;
        bot.noti = null;
        await bot.dig(block, 'ignore', 'raycast');
        bot.blocksMinedToday = (bot.blocksMinedToday || 0) + 1;
        bot.durability = null;
        if (bot.inventory?.slots[36]?.maxDurability) {
          const max = bot.inventory.slots[36].maxDurability;
          const damage = bot.inventory.slots[36].nbt?.value?.Damage?.value || 0;
          bot.durability = max - damage;
        }
        if (is_mining) dig();
      } catch (err) {
        setState('ERROR');
        setTimeout(() => {
          if (is_mining) dig();
        }, 100);
      }
    }
  }

  async function checkAndRepairTool() {
    try {
      setState('REPAIRING');
      // Set hotbar to pickaxe before repairing
      const pickaxeSlot = findPickaxeHotbarSlot();
      if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
      const tool = bot.inventory.slots[36];
      if (!tool || !tool.name.endsWith('_pickaxe')) {
        setState('ERROR');
        return;
      }

      bot.chat('/suachua');
      bot.once('windowOpen', async (repairWindow) => {
        try {
          await wait(2000);
          await bot.clickWindow(72+pickaxeSlot, 0, false);
          await wait(2000);
          const repairItem = repairWindow.slots[24];
          if (!repairItem) {
            setState('ERROR');
            return;
          }
          await wait(2000);
          await bot.clickWindow(24, 0, false);
          await wait(2000);
          bot.closeWindow(repairWindow);
          await wait(1000);
          bot.repair = (bot.repair || 0) + 1;
          setState('MINING');
          changeMining(true);
        } catch (err) {
          setState('ERROR');
        }
      });
    } catch (err) {
    }
  }

  bot.on('error', err => addLog('Bot error: ' + err.message));
  bot.on('kicked', reason => addLog('👢 Bot kicked: ' + reason));
  bot.on('end', () => addLog('🔌 Bot disconnected'));

  // Catch all chat messages from server
  bot.on('message', (message) => {
    // Convert message to string and add to log
    const chatMessage = message.toString();
    
    // Skip unwanted messages
    const skipPatterns = [
      'SECURITY',
      'Thời gian nhập mật khẩu',
      'Bạn đã mở bảng chọn máy chủ',
      'Đã mở menu',
      'đã ᴛʜᴀᴍ ɢɪᴀ ᴍáʏ ᴄʜủ',
      '»',
      'has made the advancement',
      'TÀI XỈU',
      'CHỢ ĐEN',
      'ʀờɪ ᴋʜỏɪ ᴍáʏ ᴄʜủ!',
      'ᴋʜôɴɢ ᴄòɴ ᴛʀᴇᴏ ᴍáʏ ɴữᴀ.'
    ];
    
    // Check if message contains any skip patterns
    const shouldSkip = skipPatterns.some(pattern => 
      chatMessage.includes(pattern)
    );
    
    // Only log if message should not be skipped
    if (!shouldSkip) {
      addLog(`💬Server: ${chatMessage}`);
    }
  });

  setInterval(() => {
    if (!is_mining) return;
    // Set hotbar to pickaxe before checking durability
    const pickaxeSlot = findPickaxeHotbarSlot();
    if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
    const tool = bot.inventory.slots[36];
    if (tool && tool.name.endsWith('_pickaxe')) {
      const max = tool.maxDurability || 1561;
      const damage = tool.nbt?.value?.Damage?.value || 0;
      const remaining = max - damage;

      let needRepair = false;
      if (percentageMode) {
        const percent = (remaining / max) * 100;
        if (percent < mining.durabilityThreshold) needRepair = true;
      } else {
        if (remaining < mining.durabilityThreshold) needRepair = true;
      }

      if (needRepair) {
        setState('REPAIRING');
        changeMining(false);
        checkAndRepairTool();
      }
    }
  }, 10000);

  return bot;
}

async function restart(bot, config) {
  if (bot && bot.end) {
    try { bot.end(); } catch (e) {}
  }
  await wait(1000);
  return createMiningBot(config);
}

module.exports = { createMiningBot, restart };
