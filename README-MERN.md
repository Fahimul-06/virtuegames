# Vertue Game Zone — MERN Version

This version replaces Supabase with a MERN backend:

- MongoDB + Mongoose
- Express.js REST API
- React + TypeScript + Vite frontend
- JWT authentication
- Wallet, games, game plans, 5-minute trial session records, GPU rentals, support tickets, and admin data

## Run locally

### 1) Start MongoDB
Use local MongoDB or MongoDB Atlas.

### 2) Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

Backend runs at:

```text
http://localhost:5000
```

### 3) Frontend
Open another terminal:

```bash
cp .env.example .env
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Demo login

```text
Admin: admin@vertuegamezone.com / admin12345
User: demo@vertuegamezone.com / demo12345
```

## Important

This MERN build includes the marketplace, wallet, session tracking, GPU rental records, admin panel data, and support APIs. It does not include real WebRTC cloud game streaming yet. For real playable high-end games, add a GPU-node service with WebRTC video/audio streaming and input forwarding.
