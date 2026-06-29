import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import cloudRoutes from './routes/cloud.js';
import { attachSignaling } from './services/signaling.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProduction ? true : (process.env.CLIENT_URL || 'http://localhost:5173'),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'Vertue Game Zone MERN Web Service' }));
app.use('/api/auth', authRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api', apiRoutes);

// Render single Web Service mode: serve React build from root /dist
const clientDistPath = path.join(__dirname, '..', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vertuegamezone';

await mongoose.connect(MONGO_URI);
const httpServer = http.createServer(app);
attachSignaling(httpServer);
httpServer.listen(PORT, () => console.log(`Vertue Game Zone running on port ${PORT}`));
