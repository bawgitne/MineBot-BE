function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function waitForSlotItemName(bot, slotIndex, targetName, timeout = 8000) {
    // ... như cũ ...
  }
  
  module.exports = { wait, waitForSlotItemName };