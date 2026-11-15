import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { publicClinicInfo } from './config/clinic.js';
import authRoutes from './routes/auth.js';
import treatmentRoutes from './routes/treatments.js';
import dentistRoutes from './routes/dentists.js';
import roomRoutes from './routes/rooms.js';
import appointmentRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

const app = express();
// CORS_ORIGINS: comma-separated list of allowed origins. Unset = allow any (dev).
// Trailing slashes are stripped: browsers send "https://x.vercel.app", never ".../".
const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);
if (!origins.length && process.env.NODE_ENV === 'production') {
  console.warn('CORS_ORIGINS is empty: any website can call this API. Set it to your Vercel URL.');
}
app.use(cors(origins.length ? { origin: origins } : undefined));
app.use(express.json({ limit: '50kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Smilo API', db: app.locals.dbMode }));
app.get('/api/clinic', (req, res) => res.json({ clinic: publicClinicInfo() }));
app.use('/api/auth', authRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/dentists', dentistRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (err.name === 'ValidationError' && err.errors && !err.status) {
    // Mongoose validation error
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(400).json({ message: Object.values(errors)[0] || 'Invalid data.', errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id.' });

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
});

const PORT = process.env.PORT || 5001;
connectDB()
  .then(({ mode }) => {
    app.locals.dbMode = mode;
    app.listen(PORT, () =>
      console.log(`Smilo API on port ${PORT} (db: ${mode}, clinic time ${new Date().toLocaleString('en-US', { hour12: false })})`)
    );
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
