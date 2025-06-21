require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initSocket } = require('./services/socketService');
const botController = require('./controllers/botController');
const { connectDB } = require('./db');

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cors());
app.use(bodyParser.json());

connectDB();

app.use('/api/bots', botController);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ API/Socket.IO server running at http://localhost:${PORT}`);
});
