import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema(
  {
    unitNumber: { type: Number, required: true },
    title: { type: String, required: true },
    topics: { type: [String], default: [] },
  },
  { _id: false }
);

const syllabusSchema = new mongoose.Schema(
  {
    // Nullable until Phase 8 introduces authentication — a syllabus can
    // exist without a resolved teacher identity yet.
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true },
    originalFileName: { type: String, required: true },
    extractedText: { type: String, default: '' },
    units: { type: [unitSchema], default: [] },
    status: { type: String, enum: ['processed', 'reviewed'], default: 'processed' },
  },
  { timestamps: true }
);

export default mongoose.models.Syllabus || mongoose.model('Syllabus', syllabusSchema);
