import mongoose from 'mongoose';

// A treatment room. Appointments are auto-assigned to a free room, so the
// number of active rooms caps how many patients can be seen at once.
const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 40 },
    notes: { type: String, default: '', trim: true, maxlength: 200 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
