// Clinic facts and booking policy in one place. Served to the frontend via
// GET /api/clinic so hours, address and policy never drift between the two.

const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);

export const policy = {
  leadTimeMin: () => num(process.env.LEAD_TIME_MIN, 60), // earliest bookable = now + this
  cancelWindowMin: () => num(process.env.CANCEL_WINDOW_MIN, 120), // online cancel/reschedule cutoff
  maxDaysAhead: () => num(process.env.MAX_DAYS_AHEAD, 60),
  slotStepMin: () => num(process.env.SLOT_STEP_MIN, 15),
};

export const clinic = {
  name: 'Smilo',
  legalName: 'Smilo Dental Studio',
  phone: '(415) 555-0142',
  email: 'hello@smilo.clinic',
  address: { line1: '218 Alder Street, Suite 3', city: 'San Francisco', region: 'CA', postal: '94110' },
  directions:
    'Ground floor, step-free entrance on Alder. Two bike racks out front; the 14 and 49 buses stop at the corner.',
  // Public opening hours (dentist schedules sit inside these).
  hours: [
    { day: 1, label: 'Monday', open: '08:00', close: '18:00' },
    { day: 2, label: 'Tuesday', open: '08:00', close: '18:00' },
    { day: 3, label: 'Wednesday', open: '08:00', close: '19:30', note: 'Late clinic' },
    { day: 4, label: 'Thursday', open: '08:00', close: '18:00' },
    { day: 5, label: 'Friday', open: '08:00', close: '16:00' },
    { day: 6, label: 'Saturday', open: '09:00', close: '13:00', note: 'Urgent visits prioritised' },
    { day: 0, label: 'Sunday', open: null, close: null },
  ],
};

export const publicClinicInfo = () => ({
  ...clinic,
  policy: {
    leadTimeMin: policy.leadTimeMin(),
    cancelWindowMin: policy.cancelWindowMin(),
    maxDaysAhead: policy.maxDaysAhead(),
  },
});
