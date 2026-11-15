import mongoose from 'mongoose';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    start: { type: String, default: '08:00', match: HHMM },
    end: { type: String, default: '17:00', match: HHMM },
    // Optional break (lunch). Both empty = no break.
    breakStart: { type: String, default: '' },
    breakEnd: { type: String, default: '' },
    off: { type: Boolean, default: false },
  },
  { _id: false }
);

const defaultWeek = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    start: '08:00',
    end: '17:00',
    breakStart: '12:30',
    breakEnd: '13:30',
    off: day === 0 || day === 6,
  }));

const dentistSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    title: { type: String, default: 'Dentist', trim: true, maxlength: 80 }, // e.g. "Endodontist"
    credentials: { type: String, default: '', trim: true, maxlength: 40 }, // e.g. "DDS, MS"
    bio: { type: String, default: '', trim: true, maxlength: 600 },
    // Empty string = use the illustrated placeholder on the frontend.
    photo: { type: String, default: '', trim: true },
    languages: [{ type: String, trim: true }],
    treatments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Treatment' }],
    schedule: { type: [daySchema], default: defaultWeek },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dentistSchema.methods.offers = function (treatmentId) {
  return (this.treatments || []).some((t) => String(t?._id || t) === String(treatmentId));
};

export default mongoose.model('Dentist', dentistSchema);
