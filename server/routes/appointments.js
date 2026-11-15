import { Router } from 'express';
import crypto from 'node:crypto';
import Appointment, { CONCERNS } from '../models/Appointment.js';
import Treatment from '../models/Treatment.js';
import Dentist from '../models/Dentist.js';
import { policy } from '../config/clinic.js';
import { withLock } from '../utils/lock.js';
import { toMinutes, toTime, todayStr, addDays } from '../utils/time.js';
import { checker, isId, str, TIME_RE, validatePatient } from '../utils/validate.js';
import {
  assignSlot,
  eligibleDentists,
  httpError,
  inBookingWindow,
  slotsForDate,
} from '../utils/availability.js';
import { mailCancelled, mailConfirmed, mailRescheduled } from '../utils/mailer.js';

const router = Router();

const TAKEN_MSG = 'Someone just booked that time. Here are the times that are still open.';
const windowMsg = () => `You can book up to ${policy.maxDaysAhead()} days ahead, starting today.`;

/* ------------------------------ helpers ------------------------------ */

async function loadTreatment(id) {
  if (!isId(id)) throw httpError(400, 'Choose a treatment first.', { errors: { treatmentId: 'Choose a treatment.' } });
  const t = await Treatment.findById(id);
  if (!t || !t.active) throw httpError(404, 'That treatment isn’t available to book online.');
  return t;
}

function checkDentistParam(dentistId) {
  if (dentistId && dentistId !== 'any' && !isId(dentistId)) throw httpError(400, 'Unknown dentist.');
}

// Unambiguous characters only (no 0/O, 1/I/L, 5/S, 8/B).
const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY234679';
const randomCode = () =>
  'SM-' + Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

async function uniqueCode() {
  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    if (!(await Appointment.findOne({ manageCode: code }))) return code;
  }
  throw httpError(500, 'Could not generate a booking code. Please try again.');
}

const normaliseCode = (raw) => {
  const c = str(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c ? `SM-${c.replace(/^SM/, '')}` : '';
};

const minutesUntil = (a) => (new Date(`${a.date}T${a.start}:00`) - new Date()) / 60000;

/** Can the patient still change this online? */
function changeability(a) {
  if (a.status !== 'confirmed') return { canChange: false, reason: `This appointment is ${a.status}.` };
  const mins = minutesUntil(a);
  if (mins < 0) return { canChange: false, reason: 'This appointment has already started.' };
  if (mins < policy.cancelWindowMin()) {
    const hrs = policy.cancelWindowMin() / 60;
    return {
      canChange: false,
      reason: `It’s less than ${hrs} hour${hrs === 1 ? '' : 's'} away, so please call us and we’ll sort it out.`,
    };
  }
  return { canChange: true, reason: '' };
}

/** What the patient (token holder) gets to see. No room, no internal ids beyond what the UI needs. */
async function publicView(a) {
  const dentist = await Dentist.findById(a.dentist);
  return {
    token: a.manageToken,
    code: a.manageCode,
    status: a.status,
    patient: a.patient,
    treatment: {
      _id: a.treatment,
      name: a.treatmentName,
      duration: a.duration,
      price: a.price,
      priceFrom: a.priceFrom,
    },
    dentist: dentist
      ? { _id: dentist._id, name: dentist.name, title: dentist.title, credentials: dentist.credentials, photo: dentist.photo }
      : null,
    autoAssigned: a.autoAssigned,
    date: a.date,
    start: a.start,
    end: a.end,
    concerns: a.concerns,
    notes: a.notes,
    urgent: a.urgent,
    cancelledBy: a.cancelledBy,
    cancelReason: a.cancelReason,
    rescheduleCount: a.rescheduleCount,
    ...changeability(a),
  };
}

async function findByToken(token) {
  const t = str(token);
  if (!/^[\w-]{20,64}$/.test(t)) throw httpError(404, 'That link doesn’t match an appointment.');
  const appt = await Appointment.findOne({ manageToken: t });
  if (!appt) throw httpError(404, 'That link doesn’t match an appointment. It may have been mistyped.');
  return appt;
}

/** Shared validation for anything that targets a date + start time. */
function validateWhen(c, date, start) {
  c.require('date', date, 'Pick a day.')
    .check('date', !date || inBookingWindow(date), windowMsg())
    .require('start', start, 'Pick a time.')
    .check('start', !start || TIME_RE.test(start), 'That time isn’t valid.');
}

/* ------------------------------ availability ------------------------------ */

// GET /api/appointments/availability?treatmentId=&date=&dentistId=(id|any)&exclude=(token)
router.get('/availability', async (req, res, next) => {
  try {
    const { treatmentId, date, dentistId, exclude } = req.query;
    if (!inBookingWindow(date)) throw httpError(400, windowMsg());
    checkDentistParam(dentistId);
    const treatment = await loadTreatment(treatmentId);
    const dentists = await eligibleDentists(treatment, dentistId);
    const excludeId = exclude ? (await findByToken(exclude))._id : null;
    const slots = await slotsForDate({ treatment, dentists, date, excludeId });
    res.json({ date, slots });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/calendar?treatmentId=&dentistId=&from=&days=14
// Open-slot counts per day so the date picker can show closed/full days up front.
router.get('/calendar', async (req, res, next) => {
  try {
    const { treatmentId, dentistId, exclude } = req.query;
    const from = req.query.from && inBookingWindow(req.query.from) ? req.query.from : todayStr();
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 31);
    checkDentistParam(dentistId);
    const treatment = await loadTreatment(treatmentId);
    const dentists = await eligibleDentists(treatment, dentistId);
    const excludeId = exclude ? (await findByToken(exclude))._id : null;

    const out = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      if (!inBookingWindow(date)) break;
      const slots = await slotsForDate({ treatment, dentists, date, excludeId });
      out.push({ date, open: slots.length, first: slots[0]?.time || null });
    }
    res.json({ days: out, maxDaysAhead: policy.maxDaysAhead() });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/earliest?treatmentId=&dentistId=&limit=6
// Urgent / same-day: the soonest open times across the team (or one dentist).
router.get('/earliest', async (req, res, next) => {
  try {
    const { treatmentId, dentistId } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 12);
    checkDentistParam(dentistId);
    const treatment = await loadTreatment(treatmentId);
    const dentists = await eligibleDentists(treatment, dentistId);
    const byId = new Map(dentists.map((d) => [String(d._id), d]));

    const results = [];
    const today = todayStr();
    for (let i = 0; i < 14 && results.length < limit; i++) {
      const date = addDays(today, i);
      const slots = await slotsForDate({ treatment, dentists, date });
      for (const s of slots) {
        if (results.length >= limit) break;
        const d = byId.get(s.dentists[0]);
        results.push({ date, time: s.time, dentist: { _id: d._id, name: d.name, title: d.title } });
      }
    }
    res.json({ slots: results, treatment: { _id: treatment._id, name: treatment.name, duration: treatment.duration } });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ create ------------------------------ */

// POST /api/appointments  (public — patients book as guests)
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const { c, patient } = validatePatient(body.patient);
    const date = str(body.date);
    const start = str(body.start);
    const dentistId = str(body.dentistId) || 'any';
    const concerns = Array.isArray(body.concerns) ? [...new Set(body.concerns)] : [];
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    c.require('treatmentId', body.treatmentId, 'Choose a treatment.')
      .check('treatmentId', !body.treatmentId || isId(body.treatmentId), 'Choose a treatment.')
      .check('dentistId', dentistId === 'any' || isId(dentistId), 'Choose a dentist or “First available”.')
      .check('concerns', concerns.every((x) => CONCERNS.includes(x)), 'Unknown option.')
      .check('notes', notes.length <= 500, 'Notes can be up to 500 characters.');
    validateWhen(c, date, start);
    c.throwIfAny();

    const treatment = await loadTreatment(body.treatmentId);
    const dentists = await eligibleDentists(treatment, dentistId);

    const appt = await withLock(`day:${date}`, async () => {
      const pick = await assignSlot({ treatment, dentists, date, start });
      if (!pick) throw httpError(409, TAKEN_MSG);
      try {
        return await Appointment.create({
          patient,
          treatment: treatment._id,
          dentist: pick.dentist._id,
          room: pick.room._id,
          autoAssigned: dentistId === 'any',
          treatmentName: treatment.name,
          duration: treatment.duration,
          price: treatment.price,
          priceFrom: treatment.priceFrom,
          date,
          start,
          end: toTime(toMinutes(start) + treatment.duration),
          concerns,
          notes,
          urgent: body.urgent === true || treatment.category === 'urgent',
          manageToken: crypto.randomBytes(24).toString('base64url'),
          manageCode: await uniqueCode(),
        });
      } catch (err) {
        if (err.code === 11000) throw httpError(409, TAKEN_MSG);
        throw err;
      }
    });

    const view = await publicView(appt);
    mailConfirmed(appt, view.dentist?.name || 'our team').catch(console.error);
    res.status(201).json({ appointment: view });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ manage ------------------------------ */

// POST /api/appointments/lookup { code, email } -> { token }
router.post('/lookup', async (req, res, next) => {
  try {
    const code = normaliseCode(req.body?.code);
    const email = str(req.body?.email).toLowerCase();
    checker()
      .require('code', code, 'Enter the code from your confirmation email.')
      .require('email', email, 'Enter the email you booked with.')
      .throwIfAny();

    const appt = await Appointment.findOne({ manageCode: code });
    // Same message for "no such code" and "wrong email" so codes can't be probed.
    if (!appt || appt.patient.email !== email) {
      throw httpError(404, 'We couldn’t find an appointment with that code and email. Check both and try again.');
    }
    res.json({ token: appt.manageToken });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/manage/:token
router.get('/manage/:token', async (req, res, next) => {
  try {
    const appt = await findByToken(req.params.token);
    res.json({ appointment: await publicView(appt) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/manage/:token/cancel { reason? }
router.patch('/manage/:token/cancel', async (req, res, next) => {
  try {
    const reason = str(req.body?.reason);
    checker().check('reason', reason.length <= 300, 'Keep the reason under 300 characters.').throwIfAny();

    const appt = await findByToken(req.params.token);
    const { canChange, reason: why } = changeability(appt);
    if (!canChange) throw httpError(400, why);

    appt.status = 'cancelled';
    appt.isActive = false;
    appt.cancelledBy = 'patient';
    appt.cancelReason = reason;
    appt.cancelledAt = new Date();
    await appt.save();

    mailCancelled(appt).catch(console.error);
    res.json({ appointment: await publicView(appt) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/manage/:token/reschedule { date, start, dentistId? }
router.patch('/manage/:token/reschedule', async (req, res, next) => {
  try {
    const date = str(req.body?.date);
    const start = str(req.body?.start);
    const c = checker();
    validateWhen(c, date, start);
    c.throwIfAny();

    const appt = await findByToken(req.params.token);
    const { canChange, reason: why } = changeability(appt);
    if (!canChange) throw httpError(400, why);

    // Default: keep the same dentist. "any" lets us reassign.
    const dentistId = str(req.body?.dentistId) || String(appt.dentist);
    checkDentistParam(dentistId);
    const treatment = await Treatment.findById(appt.treatment);
    if (!treatment) throw httpError(400, 'This treatment is no longer offered. Please call us to rebook.');
    // Rebook with the duration the patient originally booked.
    const booked = { _id: treatment._id, name: treatment.name, duration: appt.duration };
    const dentists = await eligibleDentists(treatment, dentistId);

    await withLock(`day:${date}`, async () => {
      const pick = await assignSlot({ treatment: booked, dentists, date, start, excludeId: appt._id });
      if (!pick) throw httpError(409, TAKEN_MSG);
      appt.date = date;
      appt.start = start;
      appt.end = toTime(toMinutes(start) + appt.duration);
      appt.dentist = pick.dentist._id;
      appt.room = pick.room._id;
      appt.autoAssigned = dentistId === 'any';
      appt.rescheduleCount += 1;
      try {
        await appt.save();
      } catch (err) {
        if (err.code === 11000) throw httpError(409, TAKEN_MSG);
        throw err;
      }
    });

    const view = await publicView(appt);
    mailRescheduled(appt, view.dentist?.name || 'our team').catch(console.error);
    res.json({ appointment: view });
  } catch (err) {
    next(err);
  }
});

export default router;
