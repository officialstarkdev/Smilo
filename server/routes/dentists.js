import { Router } from 'express';
import Dentist from '../models/Dentist.js';
import Treatment from '../models/Treatment.js';
import { protect, adminOnly, staffOnly } from '../middleware/auth.js';
import { checker, isId, str, TIME_RE } from '../utils/validate.js';
import { toMinutes } from '../utils/time.js';

const router = Router();
const ORDER = { sortOrder: 1, name: 1 };

function validSchedule(schedule) {
  if (!Array.isArray(schedule) || schedule.length !== 7) return 'Provide hours for all 7 days.';
  const days = new Set();
  for (const d of schedule) {
    if (!Number.isInteger(d.day) || d.day < 0 || d.day > 6 || days.has(d.day)) return 'Each weekday must appear once.';
    days.add(d.day);
    if (d.off) continue;
    if (!TIME_RE.test(d.start) || !TIME_RE.test(d.end) || toMinutes(d.start) >= toMinutes(d.end)) {
      return 'Start time must be before end time.';
    }
    const hasBreak = d.breakStart || d.breakEnd;
    if (hasBreak) {
      if (!TIME_RE.test(d.breakStart || '') || !TIME_RE.test(d.breakEnd || '')) return 'Breaks need a start and end.';
      const [bs, be] = [toMinutes(d.breakStart), toMinutes(d.breakEnd)];
      if (bs >= be || bs < toMinutes(d.start) || be > toMinutes(d.end)) return 'Breaks must sit inside working hours.';
    }
  }
  return null;
}

async function cleanDentist(body = {}, partial = false) {
  const out = {};
  const c = checker();
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    out.name = str(body.name);
    c.require('name', out.name, 'Name is required.').check('name', out.name.length <= 80, 'Max 80 characters.');
  }
  for (const [k, max] of [['title', 80], ['credentials', 40], ['bio', 600]]) {
    if (has(k)) {
      out[k] = str(body[k]);
      c.check(k, out[k].length <= max, `Max ${max} characters.`);
    }
  }
  if (has('photo')) {
    out.photo = str(body.photo);
    c.check('photo', !out.photo || /^https?:\/\/\S+$/.test(out.photo), 'Photo must be an http(s) URL or empty.');
  }
  if (has('languages')) {
    out.languages = Array.isArray(body.languages) ? body.languages.map(str).filter(Boolean).slice(0, 8) : [];
  }
  if (has('treatments')) {
    const ids = Array.isArray(body.treatments) ? [...new Set(body.treatments)] : null;
    c.check('treatments', ids && ids.every(isId), 'Unknown treatment.');
    if (ids && ids.every(isId)) {
      const found = await Treatment.find({ _id: { $in: ids } });
      c.check('treatments', found.length === ids.length, 'Unknown treatment.');
      out.treatments = ids;
    }
  }
  if (has('schedule')) {
    const problem = validSchedule(body.schedule);
    c.check('schedule', !problem, problem);
    if (!problem) {
      out.schedule = body.schedule.map((d) => ({
        day: d.day,
        start: d.start,
        end: d.end,
        breakStart: d.breakStart || '',
        breakEnd: d.breakEnd || '',
        off: d.off === true,
      }));
    }
  }
  if (has('sortOrder')) out.sortOrder = Number(body.sortOrder) || 0;
  if (has('active')) out.active = body.active === true;

  c.throwIfAny();
  return out;
}

// GET /api/dentists — public, active only
router.get('/', async (req, res, next) => {
  try {
    res.json({ dentists: await Dentist.find({ active: true }).sort(ORDER) });
  } catch (err) {
    next(err);
  }
});

router.get('/all', protect, staffOnly, async (req, res, next) => {
  try {
    res.json({ dentists: await Dentist.find({}).sort(ORDER) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const dentist = isId(req.params.id) ? await Dentist.findById(req.params.id) : null;
    if (!dentist || !dentist.active) return res.status(404).json({ message: 'Dentist not found.' });
    res.json({ dentist });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    res.status(201).json({ dentist: await Dentist.create(await cleanDentist(req.body)) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Dentist not found.' });
    const dentist = await Dentist.findByIdAndUpdate(req.params.id, await cleanDentist(req.body, true), {
      new: true,
      runValidators: true,
    });
    if (!dentist) return res.status(404).json({ message: 'Dentist not found.' });
    res.json({ dentist });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Dentist not found.' });
    const dentist = await Dentist.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!dentist) return res.status(404).json({ message: 'Dentist not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
