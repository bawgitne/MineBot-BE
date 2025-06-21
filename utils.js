// utils.js

function logState(state) {
  console.log(`[STATE] ${state}`);
}

function logMode(mode) {
  console.log(`[MODE] Đã chuyển sang kiểm tra độ bền theo ${mode ? 'phần trăm' : 'số tuyệt đối'}`);
}

function logError(msg) {
  console.log('❌', msg);
}

function logInfo(msg) {
  console.log('ℹ️', msg);
}

function logWarn(msg) {
  console.warn('⚠️', msg);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// promisifyEvent: chờ một event của bot, có thể truyền filter
function promisifyEvent(emitter, event, filter) {
  return new Promise(resolve => {
    function handler(...args) {
      if (!filter || filter(...args)) {
        emitter.removeListener(event, handler);
        resolve(...args);
      }
    }
    emitter.on(event, handler);
  });
}
function waitForSlotItemName(bot, slotIndex, targetName, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const absSlot = 36 + slotIndex-1; // slot hotbar 0–8 → slots[36–44]
  
      const check = () => {
        const item = bot.inventory.slots[absSlot];
        if (item?.name === targetName) {
          cleanup();
          resolve(item);
        }
      };
  
      const onUpdate = (slot) => {
        if (slot === absSlot) check();
      };
  
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`⏳ Hết thời gian chờ slot ${slotIndex} có item "${targetName}"`));
      }, timeout);
  
      const cleanup = () => {
        clearTimeout(timer);
        bot.inventory.removeListener('updateSlot', onUpdate);
      };
  
      // Nếu đã có sẵn
      check();
  
      bot.inventory.on('updateSlot', onUpdate);
    });
  }
  
module.exports = {
  logState,
  logMode,
  logError,
  logInfo,
  logWarn,
  wait,
  promisifyEvent,
  waitForSlotItemName
}; 