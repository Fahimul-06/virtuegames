# Vertue Game Zone GPU Node Agent

Run this small Node.js agent on every GPU server. It reports:

- GPU model and VRAM
- CPU and RAM
- available streaming slots
- installed games from `games.config.json`
- heartbeat status for the admin dashboard

## 1. Backend `.env`

Set the same secret in your backend:

```env
AGENT_SHARED_SECRET=your-very-strong-secret
```

Restart the backend after changing `.env`.

## 2. GPU server setup

```bash
cd gpu-node-agent
cp games.config.example.json games.config.json
```

Edit `games.config.json` and add your real installed games and `.exe` paths.

## 3. Start the agent

Local backend:

```bash
AGENT_SHARED_SECRET=your-very-strong-secret npm start -- --api=http://localhost:5000/api/cloud --name=BD-GPU-01 --region=Dhaka --slots=1
```

Production backend:

```bash
AGENT_SHARED_SECRET=your-very-strong-secret npm start -- --api=https://YOUR-DOMAIN.com/api/cloud --name=BD-GPU-01 --region=Dhaka --slots=1 --public-url=https://gpu1.yourdomain.com
```

On Windows PowerShell:

```powershell
$env:AGENT_SHARED_SECRET="your-very-strong-secret"
npm start -- --api=https://YOUR-DOMAIN.com/api/cloud --name=BD-GPU-01 --region=Dhaka --slots=1
```

The server will appear in **Admin Dashboard > GPU Nodes**.
