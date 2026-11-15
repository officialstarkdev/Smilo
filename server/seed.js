import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { seedData } from './seed_helper.js';

dotenv.config();

// Wipes the database and loads seed data. Only meaningful with a real MongoDB:
// the in-memory fallback re-seeds itself on every server start anyway.
// In production this deletes every appointment, so it needs --yes.
async function run() {
  const production = process.env.NODE_ENV === 'production';
  if (production && !process.argv.includes('--yes')) {
    console.error('Refusing to wipe a production database. Re-run with: npm run seed -- --yes');
    process.exit(1);
  }
  const { mode } = await connectDB({ seedIfEmpty: false });
  if (mode === 'memory') {
    console.log('No MongoDB reachable; nothing persistent to seed. Start MongoDB (docker compose up -d) and retry.');
  } else {
    await seedData({ production });
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
