import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGO_URI =
  process.env.MONGO_URI ||
  (isProduction ? '' : 'mongodb://localhost:27017/football-imposter');

if (isProduction && !process.env.MONGO_URI) {
  console.error('MONGO_URI is required when NODE_ENV=production');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

import { setupSocket } from './socket';
import leaderboardRoutes from './routes/leaderboard';

setupSocket(io);

app.use('/api', leaderboardRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
