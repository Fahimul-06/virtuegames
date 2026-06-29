import bcrypt from 'bcryptjs';
import { models } from './models/index.js';

export async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Qwertyuiop09';
  const username = process.env.ADMIN_USERNAME || 'admin';

  let admin = await models.profiles.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);

  if (!admin) {
    admin = await models.profiles.create({
      username,
      email,
      password: passwordHash,
      wallet_balance: 500,
      is_admin: true,
    });
    console.log(`Admin user created: ${email}`);
    return admin;
  }

  let changed = false;
  if (!admin.is_admin) {
    admin.is_admin = true;
    changed = true;
  }

  // Optional reset: set ADMIN_RESET_PASSWORD=true when you want the deployment password reset from env.
  if (process.env.ADMIN_RESET_PASSWORD === 'true') {
    admin.password = passwordHash;
    changed = true;
  }

  if (changed) {
    await admin.save();
    console.log(`Admin user updated: ${email}`);
  }

  return admin;
}
