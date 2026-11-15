import { Router } from 'express';
import Room from '../models/Room.js';
import { protect, adminOnly, staffOnly } from '../middleware/auth.js';
import { checker, isId, str } from '../utils/validate.js';

const router = Router();
router.use(protect, staffOnly);

function cleanRoom(body = {}, partial = false) {
  const out = {};
  const c = checker();
  if (!partial || body.name !== undefined) {
    out.name = str(body.name);
    c.require('name', out.name, 'Name is required.').check('name', out.name.length <= 40, 'Max 40 characters.');
  }
  if (body.notes !== undefined) {
    out.notes = str(body.notes);
    c.check('notes', out.notes.length <= 200, 'Max 200 characters.');
  }
  if (body.active !== undefined) out.active = body.active === true;
  c.throwIfAny();
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ rooms: await Room.find({}).sort({ name: 1 }) });
  } catch (err) {
    next(err);
  }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    res.status(201).json({ room: await Room.create(cleanRoom(req.body)) });
  } catch (err) {
    next(err);
  }
});

// Deactivating a room only affects new bookings; existing ones keep their room.
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Room not found.' });
    const room = await Room.findByIdAndUpdate(req.params.id, cleanRoom(req.body, true), { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: 'Room not found.' });
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

export default router;
