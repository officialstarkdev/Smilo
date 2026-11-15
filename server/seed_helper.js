import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from './models/User.js';
import Treatment from './models/Treatment.js';
import Dentist from './models/Dentist.js';
import Room from './models/Room.js';
import Appointment from './models/Appointment.js';
import { assignSlot } from './utils/availability.js';
import { addDays, dayOfWeek, toMinutes, toTime, todayStr } from './utils/time.js';

/** Build a 7-day schedule from { dayNumber: [start, end, breakStart?, breakEnd?] }. */
const week = (spec) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const s = spec[day];
    return s
      ? { day, start: s[0], end: s[1], breakStart: s[2] || '', breakEnd: s[3] || '', off: false }
      : { day, start: '09:00', end: '17:00', breakStart: '', breakEnd: '', off: true };
  });

const TREATMENTS = [
  {
    key: 'checkup', name: 'Check-up & Exam', category: 'preventive', duration: 30, price: 95,
    summary: 'Most check-ups take about 30 minutes.',
    description: 'A full look at your teeth, gums and bite, with X-rays if you’re due. We’ll tell you what we see in plain words, and what can wait.',
  },
  {
    key: 'cleaning', name: 'Cleaning', category: 'preventive', duration: 45, price: 120,
    summary: 'A gentle scale and polish with a hygienist.',
    description: 'We clear the build-up brushing can’t reach, polish, and point out the two or three spots worth extra attention. Tell us if anything’s sensitive and we’ll slow down.',
  },
  {
    key: 'whitening', name: 'Whitening', category: 'cosmetic', duration: 60, price: 350, priceFrom: true,
    summary: 'One session in the chair, plus trays to take home.',
    description: 'We make sure your teeth are healthy first, then whiten in the chair. Most people go three to six shades lighter. A day or two of mild sensitivity is normal.',
  },
  {
    key: 'filling', name: 'Filling', category: 'restorative', duration: 45, price: 150, priceFrom: true,
    summary: 'Tooth-coloured, done in one visit.',
    description: 'We numb the area properly before we start and check in with you throughout. The price depends on the size of the filling and how many surfaces it covers.',
  },
  {
    key: 'rootcanal', name: 'Root Canal', category: 'restorative', duration: 90, price: 900, priceFrom: true,
    summary: 'Saves a tooth that would otherwise be lost.',
    description: 'With our endodontist. A modern root canal feels a lot like a long filling. We walk through every step before we begin, and you can raise a hand to pause at any point.',
  },
  {
    key: 'ortho', name: 'Braces / Aligner Consult', category: 'orthodontic', duration: 30, price: 0,
    summary: 'A free first conversation, with no pressure to commit.',
    description: 'Scans and photos, a look at your bite, and an honest view on whether braces or clear aligners would suit you. You leave with costs in writing.',
  },
  {
    key: 'emergency', name: 'Emergency Visit', category: 'urgent', duration: 30, price: 85,
    summary: 'Same-day times held back for pain and breakages.',
    description: 'For toothache, swelling, a cracked or knocked-out tooth, or a lost filling. We get you out of pain first, then plan any further treatment together.',
  },
];

const DENTISTS = [
  {
    name: 'Dr. Amara Okafor', title: 'General & family dentist', credentials: 'DDS',
    bio: 'Amara has looked after families in the Mission for eleven years. She’s known for explaining things twice, without being asked, and for never rushing a nervous patient.',
    languages: ['English', 'Igbo'],
    offers: ['checkup', 'cleaning', 'whitening', 'filling', 'emergency'],
    schedule: week({
      1: ['08:00', '17:00', '12:30', '13:30'], 2: ['08:00', '17:00', '12:30', '13:30'],
      3: ['10:00', '19:30', '14:00', '14:45'], 4: ['08:00', '17:00', '12:30', '13:30'],
      5: ['08:00', '16:00', '12:00', '12:30'], 6: ['09:00', '13:00'],
    }),
  },
  {
    name: 'Dr. Tomás Reyes', title: 'Endodontist (root canal specialist)', credentials: 'DMD, MS',
    bio: 'Tomás spends his days saving teeth other people would pull. He’ll show you the X-ray, talk you through the plan and tell you honestly how it will feel.',
    languages: ['English', 'Spanish'],
    offers: ['checkup', 'filling', 'rootcanal', 'emergency'],
    schedule: week({
      1: ['08:00', '16:00', '12:00', '12:45'], 2: ['08:00', '16:00', '12:00', '12:45'],
      3: ['11:00', '19:30', '15:00', '15:30'], 4: ['08:00', '16:00', '12:00', '12:45'],
      6: ['09:00', '13:00'],
    }),
  },
  {
    name: 'Dr. Hannah Lindqvist', title: 'Orthodontist', credentials: 'DDS, MS',
    bio: 'Hannah works with braces and clear aligners for teens and adults. Her first rule: you should understand your options well enough to explain them to a friend.',
    languages: ['English', 'Swedish'],
    offers: ['checkup', 'ortho'],
    schedule: week({
      2: ['09:00', '18:00', '13:00', '14:00'], 4: ['09:00', '18:00', '13:00', '14:00'],
      5: ['08:00', '16:00', '12:00', '12:30'],
    }),
  },
  {
    name: 'Mei Tanaka', title: 'Dental hygienist', credentials: 'RDH',
    bio: 'Mei does most of our cleanings and whitening. If you’ve been putting off a cleaning for a while, she’s the one to see. No lectures, just a fresh start.',
    languages: ['English', 'Japanese'],
    offers: ['cleaning', 'whitening'],
    schedule: week({
      1: ['08:00', '18:00', '12:00', '12:45'], 2: ['08:00', '18:00', '12:00', '12:45'],
      3: ['08:00', '18:00', '12:00', '12:45'], 4: ['08:00', '18:00', '12:00', '12:45'],
      5: ['08:00', '16:00', '12:00', '12:30'],
    }),
  },
];

const ROOMS = [
  { name: 'Room 1', notes: 'Garden side. Ceiling screen.' },
  { name: 'Room 2', notes: 'Courtyard side. Endo microscope.' },
  { name: 'Room 3', notes: 'Hygiene room.' },
];

const PATIENTS = [
  ['Priya Raman', '415-555-0117', false], ['Jordan Ellis', '415-555-0123', true],
  ['Sam Whitfield', '628-555-0190', false], ['Lucía Moreno', '415-555-0168', true],
  ['Ken Adeyemi', '510-555-0134', false], ['Ruth Calloway', '415-555-0102', false],
  ['Theo Park', '628-555-0155', true], ['Nadia Haddad', '415-555-0181', false],
];

const token = () => crypto.randomBytes(24).toString('base64url');
const code = (i) => `SM-DEMO${String(i).padStart(2, '0')}`;

/**
 * Wipes and seeds the database.
 * production = true: catalogue + one admin from ADMIN_EMAIL / ADMIN_PASSWORD, no demo patients.
 * production = false: also a front-desk user and a week of demo appointments.
 */
export async function seedData({ production = false } = {}) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@smilo.clinic').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || (production ? '' : 'Admin@123');
  if (production && adminPassword.length < 10) {
    throw new Error('Set ADMIN_PASSWORD (10+ characters) before seeding a production database.');
  }

  await Promise.all([
    User.deleteMany({}),
    Treatment.deleteMany({}),
    Dentist.deleteMany({}),
    Room.deleteMany({}),
    Appointment.deleteMany({}),
  ]);

  // Pre-hash so passwords work in both real MongoDB and the in-memory fallback
  await User.create({ name: 'Clinic Admin', email: adminEmail, password: await bcrypt.hash(adminPassword, 10), role: 'admin' });
  if (!production) {
    await User.create({ name: 'Front Desk', email: 'desk@smilo.clinic', password: await bcrypt.hash('Desk@123', 10), role: 'staff' });
  }

  const treatments = {};
  for (const [i, { key, ...t }] of TREATMENTS.entries()) {
    treatments[key] = await Treatment.create({ ...t, sortOrder: i });
  }

  const dentists = [];
  for (const [i, { offers, ...d }] of DENTISTS.entries()) {
    dentists.push(await Dentist.create({ ...d, sortOrder: i, treatments: offers.map((k) => treatments[k]._id) }));
  }
  const rooms = await Room.insertMany(ROOMS);

  if (production) {
    console.log(`\nProduction seed complete. Admin: ${adminEmail} (password from ADMIN_PASSWORD).`);
    console.log(`  ${TREATMENTS.length} treatments, ${dentists.length} clinicians, ${rooms.length} rooms. Edit them in Staff view.\n`);
    return;
  }

  // A believable week of upcoming appointments, placed through the real
  // availability logic so they never overlap.
  const plan = [
    ['checkup', '09:00'], ['cleaning', '09:30'], ['filling', '10:30'], ['rootcanal', '13:00'],
    ['ortho', '14:30'], ['whitening', '15:00'], ['checkup', '11:00'], ['cleaning', '14:00'],
  ];
  let n = 0;
  const today = todayStr();
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset);
    if (dayOfWeek(date) === 0) continue;
    for (const [i, [key, start]] of plan.entries()) {
      if ((i + offset) % 3 === 0) continue; // leave gaps so days don't look identical
      const t = treatments[key];
      const able = dentists.filter((d) => d.offers(t._id));
      const pick = await assignSlot({ treatment: t, dentists: able, date, start });
      if (!pick) continue;
      const [name, phone, returning] = PATIENTS[n % PATIENTS.length];
      await Appointment.create({
        patient: { name, phone, email: `${name.split(' ')[0].toLowerCase()}@example.com`, newPatient: !returning },
        treatment: t._id, dentist: pick.dentist._id, room: pick.room._id,
        treatmentName: t.name, duration: t.duration, price: t.price, priceFrom: t.priceFrom,
        date, start, end: toTime(toMinutes(start) + t.duration),
        concerns: n % 4 === 1 ? ['anxiety'] : [],
        notes: n % 5 === 2 ? 'Upper left molar is sensitive to cold.' : '',
        manageToken: token(), manageCode: code(n++),
      });
    }
  }

  // One finished and one cancelled visit so the staff view has history
  const yesterday = addDays(today, -1);
  const base = { treatment: treatments.checkup._id, dentist: dentists[0]._id, room: rooms[0]._id, treatmentName: 'Check-up & Exam', duration: 30, price: 95, date: yesterday };
  await Appointment.create({ ...base, patient: { name: 'Ruth Calloway', phone: '415-555-0102', email: 'ruth@example.com', newPatient: false }, start: '09:00', end: '09:30', status: 'completed', manageToken: token(), manageCode: code(n++) });
  await Appointment.create({ ...base, patient: { name: 'Theo Park', phone: '628-555-0155', email: 'theo@example.com', newPatient: true }, start: '10:00', end: '10:30', status: 'cancelled', isActive: false, cancelledBy: 'patient', cancelReason: 'Work trip came up.', cancelledAt: new Date(), manageToken: token(), manageCode: code(n++) });

  console.log('\nSeed complete.');
  console.log(`  Admin:      ${adminEmail} / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD)' : 'Admin@123'}`);
  console.log('  Front desk: desk@smilo.clinic  / Desk@123');
  console.log(`  ${TREATMENTS.length} treatments, ${dentists.length} clinicians, ${rooms.length} rooms, ${n} appointments\n`);
}
