import Rubric from '../models/Rubric.js';
import { generateRubricCandidates } from '../services/nlpClient.js';
import { success, failure } from '../utils/apiResponse.js';

/**
 * POST /api/rubrics/generate
 * Forwards to the NLP service's candidate-generation pipeline (concept
 * extraction/normalization/overlap-warning logic lives entirely in
 * nlp_service/app/engines/rubric/) and persists the result as a draft,
 * unapproved rubric (Section 19: "the teacher must be able to modify
 * the rubric"; Section 38: publishing requires the rubric to validate
 * first — that check belongs to a later phase's rubric editor UI).
 */
export async function generateAndSaveRubric(req, res, next) {
  try {
    const { referenceAnswer, totalMarks, questionId } = req.body;

    if (!referenceAnswer || !referenceAnswer.trim()) {
      return failure(res, 'MISSING_REFERENCE_ANSWER', 'referenceAnswer must not be empty.', 400);
    }

    const nlpResult = await generateRubricCandidates({ referenceAnswer, totalMarks });

    const rubric = await Rubric.create({
      questionId: questionId || null,
      totalMarks: totalMarks || 0,
      concepts: nlpResult.concepts,
      overlapWarnings: nlpResult.overlapWarnings,
      approved: false,
    });

    return success(res, { rubric, warnings: nlpResult.warnings }, 201);
  } catch (err) {
    return next(err);
  }
}

/** POST /api/rubrics — create a rubric directly (e.g. hand-authored by a
 * teacher, bypassing generation entirely). */
export async function createRubric(req, res, next) {
  try {
    const { questionId, totalMarks, concepts, relationships } = req.body;

    if (totalMarks === undefined || totalMarks === null) {
      return failure(res, 'MISSING_TOTAL_MARKS', 'totalMarks is required.', 400);
    }
    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      return failure(res, 'MISSING_CONCEPTS', 'concepts must be a non-empty array.', 400);
    }

    const rubric = await Rubric.create({ questionId: questionId || null, totalMarks, concepts, relationships });
    return success(res, rubric, 201);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/rubrics/:id */
export async function getRubric(req, res, next) {
  try {
    const rubric = await Rubric.findById(req.params.id);
    if (!rubric) return failure(res, 'RUBRIC_NOT_FOUND', 'Rubric not found.', 404);
    return success(res, rubric);
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/rubrics/:id */
export async function updateRubric(req, res, next) {
  try {
    const allowed = ['totalMarks', 'concepts', 'relationships'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const rubric = await Rubric.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!rubric) return failure(res, 'RUBRIC_NOT_FOUND', 'Rubric not found.', 404);
    return success(res, rubric);
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/rubrics/:id */
export async function deleteRubric(req, res, next) {
  try {
    const rubric = await Rubric.findByIdAndDelete(req.params.id);
    if (!rubric) return failure(res, 'RUBRIC_NOT_FOUND', 'Rubric not found.', 404);
    return success(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/rubrics/:id/approve
 * Section 38: "Rubric Total = Question Marks" must hold before
 * publishing — validated here since it's a Node/DB business rule, not
 * an NLP computation.
 */
export async function approveRubric(req, res, next) {
  try {
    const rubric = await Rubric.findById(req.params.id);
    if (!rubric) return failure(res, 'RUBRIC_NOT_FOUND', 'Rubric not found.', 404);

    const conceptMarksSum = rubric.concepts.reduce((sum, c) => sum + (c.marks || 0), 0);
    if (Math.abs(conceptMarksSum - rubric.totalMarks) > 0.01) {
      return failure(
        res,
        'RUBRIC_MARKS_MISMATCH',
        `Rubric concept marks sum to ${conceptMarksSum}, which does not match totalMarks (${rubric.totalMarks}).`,
        422
      );
    }

    rubric.approved = true;
    await rubric.save();
    return success(res, rubric);
  } catch (err) {
    return next(err);
  }
}
