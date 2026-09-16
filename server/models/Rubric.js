import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    marks: { type: Number, default: null },
    importance: { type: String, default: 'medium' },
    acceptablePhrases: { type: [String], default: [] },
  },
  { _id: false }
);

const relationshipSchema = new mongoose.Schema(
  {
    sourceConcept: { type: String, required: true },
    relationship: { type: String, required: true },
    targetConcept: { type: String, required: true },
    importance: { type: String, default: 'medium' },
    marks: { type: Number, default: 0 },
  },
  { _id: false }
);

const rubricSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    totalMarks: { type: Number, required: true },
    concepts: { type: [conceptSchema], default: [] },
    relationships: { type: [relationshipSchema], default: [] },
    overlapWarnings: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Rubric || mongoose.model('Rubric', rubricSchema);
