const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI ;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB');
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };