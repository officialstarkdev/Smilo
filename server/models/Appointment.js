import mongoose from 'mongoose';

export const APPOINTMENT_STATUSES = ['confirmed', 'cancelled', 'completed'];
export const CONCERNS = ['pain', 'anxiety', 'insurance'];

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    newPatient: { type: Boolean, default: true },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: patientSchema, required: true },

    treatment: { type: mongoose.Schema.Types.ObjectId, ref: 'Treatment', required: true },
    dentist: { type: mongoose.Schema.Types.ObjectId, ref: 'Dentist', required: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    // True when the patient chose "first available" and we picked the dentist.
    autoAssigned: { type: Boolean, default: false },

    // Snapshots so history stays correct if the catalogue changes later
    treatmentName: { type: String, required: true },
    duration: { type: Number, required: true },
    price: { type: Number, default: null },
    priceFrom: { type: Boolean, default: false },

    date: { type: String, required: true }, // "YYYY-MM-DD" (clinic local)
    start: { type: String, required: true }, // "HH:MM"
    end: { type: String, required: true },

    concerns: [{ type: String, enum: CONCERNS }],
    notes: { type: String, default: '', maxlength: 500 },
    urgent: { type: Boolean, default: false },

    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'confirmed' },
    // true while the appointment occupies its slot; flipped off on cancellation
    isActive: { type: Boolean, default: true },

    // manageToken goes in the emailed link; manageCode is short enough to read
    // over the phone and only works together with the patient's email.
    manageToken: { type: String, required: true, unique: true },
    manageCode: { type: String, required: true, unique: true },

    cancelledBy: { type: String, enum: ['patient', 'staff', null], default: null },
    cancelReason: { type: String, default: '', maxlength: 300 },
    cancelledAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Guards against two patients grabbing the exact same start in a race.
// Overlaps with a different start are rejected in route logic (under a lock).
appointmentSchema.index(
  { dentist: 1, date: 1, start: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
appointmentSchema.index(
  { room: 1, date: 1, start: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);
appointmentSchema.index({ date: 1, status: 1 });

export default mongoose.model('Appointment', appointmentSchema);
