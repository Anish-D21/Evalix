import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
    topicId: { type: String, default: null },
    topicName: { type: String, required: true },
    text: { type: String, required: true },
    marks: { type: Number, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    bloomLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
      required: true,
    },
    questionType: { type: String, default: 'descriptive' },
    status: { type: String, enum: ['draft', 'approved'], default: 'draft' },
  },
  { timestamps: true }
);

export default mongoose.models.Question || mongoose.model('Question', questionSchema);
