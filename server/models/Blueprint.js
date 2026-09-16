import mongoose from 'mongoose';

const bandSchema = new mongoose.Schema(
  { label: String, percentage: Number, questionCount: Number, marks: Number },
  { _id: false }
);

const unitBandSchema = new mongoose.Schema(
  { unitNumber: Number, title: String, percentage: Number, questionCount: Number, marks: Number },
  { _id: false }
);

const blueprintSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    syllabusId: { type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus', default: null },
    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    units: { type: [unitBandSchema], default: [] },
    difficulty: { type: [bandSchema], default: [] },
    bloom: { type: [bandSchema], default: [] },
    warnings: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Blueprint || mongoose.model('Blueprint', blueprintSchema);
