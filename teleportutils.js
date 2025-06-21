// teleportUtils.js

const { wait } = require("./utils");

/**
 * Đợi đến khi bot bị dịch chuyển (forcedMove) và load chunk xong
 * @param {Bot} bot - bot mineflayer
 * @param {number} timeout - thời gian tối đa chờ chunk (ms)
 */
async function waitForTeleportAndChunk(bot, timeout = 10000) {
    await new Promise(resolve => bot.once('forcedMove', resolve));
    bot.chat('📍 Đã bị dịch chuyển, đang tải chunk...');
  
    try {
      await waitForChunksSafe(bot, timeout);
      bot.chat('✅ Chunk đã load xong');
    } catch (err) {
      bot.chat('⚠️ Không thể load chunk đúng hạn!');
    }
  }
  
  /**
   * Đợi chunk load, nhưng có timeout để tránh bị treo
   * @param {Bot} bot - bot mineflayer
   * @param {number} timeout - ms
   */
  function waitForChunksSafe(bot, timeout = 8000) {
    return Promise.race([
      bot.waitForChunksToLoad(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('⏳ Timeout load chunk')), timeout)
      )
    ]);
  }
  
  /**
   * Kiểm tra chunk hiện tại có load hay chưa
   * @param {Bot} bot
   * @param {Vec3} pos - vị trí kiểm tra (mặc định là vị trí bot)
   * @returns {boolean}
   */
  function isChunkLoaded(bot, pos = bot.entity.position) {
    const chunkX = Math.floor(pos.x / 16);
    const chunkZ = Math.floor(pos.z / 16);
    return bot.world.isChunkLoaded(chunkX, chunkZ);
  }
  
  /**
   * Đợi đến khi bot nhìn thấy block bên dưới nó
   * @param {Bot} bot
   * @param {number} timeout
   */
  async function waitUntilSeeGround(bot, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const below = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (below && below.name !== 'air') return true;
      await bot.waitForTicks(5);
    }
    throw new Error('⏳ Không thấy block nào bên dưới');
  }
  async function safeReloadChunk(bot) {
    const pos = bot.entity.position.clone();
    const north = pos.offset(0, 0, -1); // dịch về phía Bắc 1 ô
  
    bot._client.write('position', {
      x: north.x,
      y: north.y,
      z: north.z,
      yaw: bot.entity.yaw,
      pitch: bot.entity.pitch,
      onGround: true,
    });
  
    await bot.waitForTicks(2);
  
    bot._client.write('position', {
      x: pos.x,
      y: pos.y,
      z: pos.z,
      yaw: bot.entity.yaw,
      pitch: bot.entity.pitch,
      onGround: true,
    });
  
    console.log('🔁 Đã dịch về North 1 ô để reload chunk');
  }
  async function stepNorth(bot, ticks = 10) {
    console.log(`di chuyeenr`)
    bot.setControlState('back', true);
    await wait(1000)
    bot.setControlState('back', false);
  }
  module.exports = {
    waitForTeleportAndChunk,
    waitForChunksSafe,
    isChunkLoaded,
    waitUntilSeeGround,
    safeReloadChunk,
    stepNorth
  };
  