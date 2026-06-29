import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { models } from './models/index.js';

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vertuegamezone');
await Promise.all(Object.values(models).map((m) => m.deleteMany({})));

const admin = await models.profiles.create({
  username: 'admin', email: 'admin@gmail.com', password: await bcrypt.hash('Qwertyuiop09', 10), wallet_balance: 500, is_admin: true
});
const user = await models.profiles.create({
  username: 'demo', email: 'demo@vertuegamezone.com', password: await bcrypt.hash('demo12345', 10), wallet_balance: 100, is_admin: false
});

const gameImages = [
  'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg',
  'https://images.pexels.com/photos/7915579/pexels-photo-7915579.jpeg',
  'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg'
];
const games = await models.games.insertMany([
  { title: 'Cyber Racer X', genre: 'Racing', developer: 'VGZ Studio', publisher: 'VGZ', description: 'High-speed futuristic racing streamed from cloud GPUs.', thumbnail_url: gameImages[0], banner_url: gameImages[0], trailer_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', rating: 4.8, release_year: 2026, is_featured: true, tags: ['Racing', 'Multiplayer', 'Cloud'] },
  { title: 'Shadow Battlefield', genre: 'Shooter', developer: 'VGZ Studio', publisher: 'VGZ', description: 'Competitive FPS experience for low-end PCs using cloud streaming.', thumbnail_url: gameImages[1], banner_url: gameImages[1], rating: 4.7, release_year: 2026, is_featured: true, tags: ['FPS', 'Action'] },
  { title: 'Kingdom Ultra', genre: 'RPG', developer: 'VGZ Studio', publisher: 'VGZ', description: 'Open world RPG with GPU-heavy graphics.', thumbnail_url: gameImages[2], banner_url: gameImages[2], rating: 4.6, release_year: 2025, is_featured: false, tags: ['RPG', 'Adventure'] }
]);

for (const game of games) {
  await models.game_plans.insertMany([
    { game_id: game._id.toString(), plan_type: 'hourly', price: 0.75, hours_included: 1 },
    { game_id: game._id.toString(), plan_type: 'monthly', price: 14.99, hours_included: 80 },
    { game_id: game._id.toString(), plan_type: 'yearly', price: 129.99, hours_included: 1000 }
  ]);
  await models.game_screenshots.insertMany([
    { game_id: game._id.toString(), url: game.thumbnail_url, caption: 'Gameplay preview', sort_order: 1 },
    { game_id: game._id.toString(), url: game.banner_url, caption: 'Cloud stream quality', sort_order: 2 }
  ]);
}

const gpus = await models.gpu_types.insertMany([
  { name: 'Starter Cloud GPU', model: 'RTX 3060', description: 'Good for 1080p gaming and light AI work.', vram_gb: 12, cuda_cores: 3584, tier: 'budget', use_cases: ['Gaming', 'Programming', 'Light AI'], stock_count: 4, thumbnail_url: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg' },
  { name: 'Pro Cloud GPU', model: 'RTX 4070', description: 'Balanced GPU for gaming, rendering, and ML experiments.', vram_gb: 12, cuda_cores: 5888, tier: 'standard', use_cases: ['Gaming', 'Rendering', 'AI'], stock_count: 3, thumbnail_url: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg' },
  { name: 'Ultra Cloud GPU', model: 'RTX 4090', description: 'Premium cloud PC for high-end games and heavy AI workloads.', vram_gb: 24, cuda_cores: 16384, tier: 'premium', use_cases: ['4K Gaming', 'AI Training', '3D Rendering'], stock_count: 2, thumbnail_url: 'https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg' }
]);
for (const gpu of gpus) {
  await models.gpu_plans.insertMany([
    { gpu_type_id: gpu._id.toString(), plan_type: 'hourly', price: gpu.tier === 'premium' ? 2.5 : gpu.tier === 'standard' ? 1.25 : 0.65 },
    { gpu_type_id: gpu._id.toString(), plan_type: 'monthly', price: gpu.tier === 'premium' ? 199 : gpu.tier === 'standard' ? 99 : 49 },
    { gpu_type_id: gpu._id.toString(), plan_type: 'yearly', price: gpu.tier === 'premium' ? 1999 : gpu.tier === 'standard' ? 999 : 499 }
  ]);
}

await models.wallet_transactions.create({ user_id: user._id.toString(), type: 'credit', amount: 100, description: 'Demo wallet credit', reference_type: 'seed', balance_after: 100 });
console.log('Seed complete');
console.log('Admin: admin@gmail.com / Qwertyuiop09');
console.log('Demo: demo@vertuegamezone.com / demo12345');
await mongoose.disconnect();
