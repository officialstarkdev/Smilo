import { Router } from 'express';
import Treatment, { TREATMENT_CATEGORIES } from '../models/Treatment.js';
import { protect, adminOnly, staffOnly } from '../middleware/auth.js';
import { checker, isId, str } from '../utils/validate.js';

const router = Router();
const ORDER = { sortOrder: 1, name: 1 };

/** Whitelist + validate. `partial` allows updating a subset of fields. */
function cleanTreatment(body = {}, partial = false) {
  const out = {};
  const c = checker();
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    out.name = str(body.name);
    c.require('name', out.name, 'Name is required.').check('name', out.name.length <= 80, 'Max 80 characters.');
  }
  if (!partial || has('duration')) {
    out.duration = Number(body.duration);
    c.check(
      'duration',
      Number.isInteger(out.duration) && out.duration >= 15 && out.duration <= 240 && out.duration % 5 === 0,
      'Duration must be 15–240 minutes, in steps of 5.'
    );
  }
  if (has('price')) {
    out.price = body.price === null || body.price === '' ? null : Number(body.price);
    c.check('price', out.price === null || (Number.isFinite(out.price) && out.price >= 0), 'Price must be 0 or more, or empty.');
  }
  if (has('priceFrom')) out.priceFrom = body.priceFrom === true;
  if (has('category')) {
    out.category = body.category;
    c.check('category', TREATMENT_CATEGORIES.includes(out.category), 'Unknown category.');
  }
  for (const [k, max] of [['summary', 160], ['description', 600]]) {
    if (has(k)) {
      out[k] = str(body[k]);
      c.check(k, out[k].length <= max, `Max ${max} characters.`);
    }
  }
  if (has('sortOrder')) out.sortOrder = Number(body.sortOrder) || 0;
  if (has('active')) out.active = body.active === true;

  c.throwIfAny();
  return out;
}

// GET /api/treatments — public, active only
router.get('/', async (req, res, next) => {
  try {
    res.json({ treatments: await Treatment.find({ active: true }).sort(ORDER) });
  } catch (err) {
    next(err);
  }
});

// GET /api/treatments/all — staff, including hidden
router.get('/all', protect, staffOnly, async (req, res, next) => {
  try {
    res.json({ treatments: await Treatment.find({}).sort(ORDER) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const treatment = isId(req.params.id) ? await Treatment.findById(req.params.id) : null;
    if (!treatment || !treatment.active) return res.status(404).json({ message: 'Treatment not found.' });
    res.json({ treatment });
  } catch (err) {
    next(err);
  }
});

router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    res.status(201).json({ treatment: await Treatment.create(cleanTreatment(req.body)) });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Treatment not found.' });
    const treatment = await Treatment.findByIdAndUpdate(req.params.id, cleanTreatment(req.body, true), {
      new: true,
      runValidators: true,
    });
    if (!treatment) return res.status(404).json({ message: 'Treatment not found.' });
    res.json({ treatment });
  } catch (err) {
    next(err);
  }
});

// Soft delete keeps historical appointments intact
router.delete('/:id', protect, adminOnly, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Treatment not found.' });
    const treatment = await Treatment.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!treatment) return res.status(404).json({ message: 'Treatment not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
