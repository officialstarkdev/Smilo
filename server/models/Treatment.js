import mongoose from 'mongoose';

export const TREATMENT_CATEGORIES = ['preventive', 'cosmetic', 'restorative', 'orthodontic', 'urgent'];

const treatmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    // One plain-language line shown under the name, e.g. "Most check-ups take about 30 minutes".
    summary: { type: String, default: '', trim: true, maxlength: 160 },
    description: { type: String, default: '', trim: true, maxlength: 600 },
    category: { type: String, enum: TREATMENT_CATEGORIES, default: 'preventive' },
    duration: { type: Number, required: true, min: 15, max: 240 }, // minutes
    // null = "price on consultation". priceFrom = show as "from $X".
    price: { type: Number, default: null, min: 0 },
    priceFrom: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Treatment', treatmentSchema);
