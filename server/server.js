import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'Vertue Game Zone MERN API' }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vertuegamezone');
app.listen(PORT, () => console.log(`MERN API running on http://localhost:${PORT}`));
