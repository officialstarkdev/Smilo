import { Router } from 'express';
import Appointment, { APPOINTMENT_STATUSES } from '../models/Appointment.js';
import { protect, staffOnly } from '../middleware/auth.js';
import { addDays, todayStr } from '../utils/time.js';
import { checker, isId, isRealDate, str } from '../utils/validate.js';
import { mailCancelled } from '../utils/mailer.js';

const router = Router();
router.use(protect, staffOnly);

// GET /api/admin/appointments?date=&from=&to=&status=&dentist=&q=
router.get('/appointments', async (req, res, next) => {
  try {
    const { date, from, to, status, dentist } = req.query;
    const filter = {};
    if (date && isRealDate(date)) filter.date = date;
    else if ((from && isRealDate(from)) || (to && isRealDate(to))) {
      filter.date = {};
      if (isRealDate(from)) filter.date.$gte = from;
      if (isRealDate(to)) filter.date.$lte = to;
    }
    if (APPOINTMENT_STATUSES.includes(status)) filter.status = status;
    if (isId(dentist)) filter.dentist = dentist;

    let appointments = await Appointment.find(filter)
      .sort({ date: 1, start: 1 })
      .limit(500)
      .populate('dentist', 'name title')
      .populate('room', 'name')
      .lean();

    // Free-text search over patient name / email / phone / code
    const q = str(req.query.q).toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      appointments = appointments.filter(
        (a) =>
          a.patient.name.toLowerCase().includes(q) ||
          a.patient.email.includes(q) ||
          a.manageCode.toLowerCase().includes(q) ||
          (digits.length >= 3 && a.patient.phone.replace(/\D/g, '').includes(digits))
      );
    }
    // Staff never need the patient's private manage link.
    res.json({ appointments: appointments.map(({ manageToken, ...rest }) => rest) });
  } catch (err) {
    next(err);
  }
});

/*
 * PATCH /api/admin/appointments/:id/status { status, reason }
 * Allowed: confirmed -> completed | cancelled, completed -> confirmed (undo).
 * Cancelled is final: re-activating could collide with a slot rebooked since.
 */
const TRANSITIONS = { confirmed: ['completed', 'cancelled'], completed: ['confirmed'], cancelled: [] };

router.patch('/appointments/:id/status', async (req, res, next) => {
  try {
    const status = req.body?.status;
    const reason = str(req.body?.reason);
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Appointment not found.' });
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found.' });

    checker()
      .check('status', APPOINTMENT_STATUSES.includes(status), 'Unknown status.')
      .check(
        'status',
        !APPOINTMENT_STATUSES.includes(status) || TRANSITIONS[appt.status].includes(status),
        `A ${appt.status} appointment can’t be marked ${status}.`
      )
      .check('reason', status !== 'cancelled' || reason.length >= 3, 'Add a short reason. The patient will see it.')
      .check('reason', reason.length <= 300, 'Keep the reason under 300 characters.')
      .throwIfAny();

    appt.status = status;
    if (status === 'cancelled') {
      appt.isActive = false;
      appt.cancelledBy = 'staff';
      appt.cancelReason = reason;
      appt.cancelledAt = new Date();
    }
    await appt.save();
    if (status === 'cancelled') mailCancelled(appt).catch(console.error);

    const { manageToken, ...rest } = appt.toObject();
    res.json({ appointment: rest });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const today = todayStr();
    const weekEnd = addDays(today, 6);
    const weekAgo = addDays(today, -6);

    const [todayCount, weekCount, newPatients, urgentToday, cancelledWeek] = await Promise.all([
      Appointment.countDocuments({ date: today, status: { $in: ['confirmed', 'completed'] } }),
      Appointment.countDocuments({ date: { $gte: today, $lte: weekEnd }, status: 'confirmed' }),
      Appointment.countDocuments({ date: { $gte: today, $lte: weekEnd }, status: 'confirmed', 'patient.newPatient': true }),
      Appointment.countDocuments({ date: today, status: 'confirmed', urgent: true }),
      Appointment.countDocuments({ status: 'cancelled', date: { $gte: weekAgo, $lte: weekEnd } }),
    ]);
    res.json({ todayCount, weekCount, newPatients, urgentToday, cancelledWeek });
  } catch (err) {
    next(err);
  }
});

export default router;
