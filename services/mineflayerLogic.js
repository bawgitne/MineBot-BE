const mineflayer = require('mineflayer');
const tpsPlugin = require('mineflayer-tps');
const { wait, waitForSlotItemName } = require('../utils');
const { getIO } = require('./socketService');

// Tìm slot cầm cuốc trong hotbar
function findPickaxeHotbarSlot(bot) {
  for (let i = 0; i < 9; i++) {
    const slot = bot.inventory.slots[36 + i];
    if (slot && slot.name && slot.name.endsWith('_pickaxe')) return i;
  }
  return null;
}

// Tạo bot mining mới
async function createMiningBot(config) {
  const bot = mineflayer.createBot({ ...config });
  bot.loadPlugin(tpsPlugin);

  // Biến động
  let is_mining = false;
  let state = 'IDLE';
  bot.state = state;
  bot.repair = 0;
  bot.noti = null;
  bot.blocksMinedToday = 0;
  bot.logList = [];
  bot.durability = null;
  bot.blockId = null;

  // Thay đổi trạng thái
  function setState(newState) {
    state = newState;
    bot.state = newState;
  }

  // Thêm log, lọc log
  function addLog(msg) {
    const log = { msg, time: new Date().toISOString() };
    bot.logList.push(log);
    if (bot.logList.length > 20) bot.logList.shift();
    getIO().emit('bot-log', { id: bot.id, log });
  }

  // Đào block
  async function dig() {
    if (!is_mining) return;
    const block = bot.blockAtCursor(4);
    if (!block) {
      bot.noti = "HÃY RENDER BLOCK!!";
      setTimeout(() => { if (is_mining) dig(); }, 50);
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
        setTimeout(() => { if (is_mining) dig(); }, 100);
      }
    }
  }

  // Đổi trạng thái mining
  function changeMining(mode) {
    is_mining = !!mode;
    if (is_mining) {
      const pickaxeSlot = findPickaxeHotbarSlot(bot);
      if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
      setState('MINING');
      dig();
    } else {
      setState('IDLE');
    }
  }
  bot.changeMining = changeMining;

  // Stop mining
  bot.stop = function() {
    changeMining(false);
    setState('IDLE');
    bot.chat('/is go');
  };

  // Tiếp tục mining (warp về đảo, cầm cuốc, đào tiếp)
  bot.continueMining = async function() {
    await wait(1000);
    bot.chat(`/is warp ${config.warpname}`);
    const pickaxeSlot = findPickaxeHotbarSlot(bot);
    if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
    await wait(1000);
    if (typeof bot.stop === 'function') bot.stop();
    changeMining(true);
  };

  // Sửa tool
  async function checkAndRepairTool() {
    try {
      setState('REPAIRING');
      const pickaxeSlot = findPickaxeHotbarSlot(bot);
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
          await bot.clickWindow(72 + pickaxeSlot, 0, false);
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
    } catch (err) {}
  }

  // Event: spawn
  bot.once('spawn', async () => {
    try {
      setState('LOGGING');
      bot.chat(`/login ${config.password}`);
      await waitForSlotItemName(bot, 5, 'clock');
      bot.setQuickBarSlot(4);
      bot.activateItem();
      bot.once('windowOpen', async (window1) => {
        bot.clickWindow(20, 0, false);
        bot.once('windowOpen', async (window2) => {
          bot.clickWindow(12, 0, false);
          await wait(1000);
          bot.chat(`/is warp ${config.warpname}`);
          await wait(1000);
          changeMining(true);
        });
      });
    } catch (err) {}
  });

  // Event: error, kicked, end
  bot.on('error', err => addLog('Bot error: ' + err.message));
  bot.on('kicked', reason => addLog('👢 Bot kicked: ' + reason));
  bot.on('end', () => addLog('🔌 Bot disconnected'));

  // Event: chat/log
  bot.on('message', (message) => {
    const chatMessage = message.toString();
    const skipPatterns = [
      'SECURITY', 'Thời gian nhập mật khẩu', 'Bạn đã mở bảng chọn máy chủ',
      'Đã mở menu', 'đã ᴛʜᴀᴍ ɢɪᴀ ᴍáʏ ᴄʜủ', '»', 'has made the advancement',
      'TÀI XỈU', 'CHỢ ĐEN', 'ʀờɪ ᴋʜỏɪ ᴍáʏ ᴄʜủ!', 'ᴋʜôɴɢ ᴄòɴ ᴛʀᴇᴏ ᴍáʏ ɴữᴀ.'
    ];
    const shouldSkip = skipPatterns.some(pattern => chatMessage.includes(pattern));
    if (!shouldSkip) addLog(`💬Server: ${chatMessage}`);
  });

  // Tự động kiểm tra durability để sửa tool
  setInterval(() => {
    if (!is_mining) return;
    const pickaxeSlot = findPickaxeHotbarSlot(bot);
    if (pickaxeSlot !== null) bot.setQuickBarSlot(pickaxeSlot);
    const tool = bot.inventory.slots[36];
    if (tool && tool.name.endsWith('_pickaxe')) {
      const max = tool.maxDurability || 1561;
      const damage = tool.nbt?.value?.Damage?.value || 0;
      const remaining = max - damage;
      if (remaining < 100) { // Ngưỡng sửa tool, có thể config
        setState('REPAIRING');
        changeMining(false);
        checkAndRepairTool();
      }
    }
  }, 10000);

  return bot;
}

// Restart bot
async function restart(bot, config) {
  if (bot && bot.end) try { bot.end(); } catch (e) {}
  await wait(1000);
  return createMiningBot(config);
}

module.exports = { createMiningBot, restart, findPickaxeHotbarSlot };