import Question from '../models/Question.js';
import { generateQuestions } from '../services/nlpClient.js';
import { success, failure } from '../utils/apiResponse.js';

/**
 * POST /api/questions/generate
 * Forwards the batch request to the NLP service (template rendering +
 * duplicate/quality checks live entirely in nlp_service/app/engines/
 * question_generation/) and persists every generated question as its
 * own document, each starting in "draft" status per Section 18 — none
 * are auto-approved.
 */
export async function generateAndSaveQuestions(req, res, next) {
  try {
    const { requests, examId } = req.body;

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return failure(res, 'MISSING_REQUESTS', 'requests must be a non-empty array.', 400);
    }

    const nlpResult = await generateQuestions({ requests });

    const questions = await Question.insertMany(
      nlpResult.questions.map((q) => ({
        examId: examId || null,
        topicId: q.topicId,
        topicName: q.topicName,
        text: q.text,
        marks: q.marks,
        difficulty: q.difficulty,
        bloomLevel: q.bloomLevel,
        questionType: q.questionType,
        status: q.status,
      }))
    );

    return success(res, { questions, warnings: nlpResult.warnings, validation: nlpResult.questions.map((q) => q.validation) }, 201);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/questions */
export async function listQuestions(req, res, next) {
  try {
    const filter = {};
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.status) filter.status = req.query.status;

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    return success(res, questions);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/questions/:id */
export async function getQuestion(req, res, next) {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return failure(res, 'QUESTION_NOT_FOUND', 'Question not found.', 404);
    return success(res, question);
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/questions/:id — teacher edits generated question text/marks/etc. */
export async function updateQuestion(req, res, next) {
  try {
    const allowed = ['text', 'marks', 'difficulty', 'bloomLevel', 'questionType', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const question = await Question.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!question) return failure(res, 'QUESTION_NOT_FOUND', 'Question not found.', 404);
    return success(res, question);
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/questions/:id */
export async function deleteQuestion(req, res, next) {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return failure(res, 'QUESTION_NOT_FOUND', 'Question not found.', 404);
    return success(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/questions/:id/approve — Section 37: unapproved questions
 * must never enter a published exam. */
export async function approveQuestion(req, res, next) {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true, runValidators: true }
    );
    if (!question) return failure(res, 'QUESTION_NOT_FOUND', 'Question not found.', 404);
    return success(res, question);
  } catch (err) {
    return next(err);
  }
}
