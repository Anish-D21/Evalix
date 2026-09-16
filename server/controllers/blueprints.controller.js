import Blueprint from '../models/Blueprint.js';
import { generateBlueprint } from '../services/nlpClient.js';
import { success, failure } from '../utils/apiResponse.js';

/**
 * POST /api/blueprints/generate
 * Node's only job here is to forward the request as-is to the NLP
 * service (which owns all allocation logic — see nlp_service/app/
 * engines/blueprint/) and persist the result. No allocation math is
 * duplicated here.
 */
export async function generateAndSaveBlueprint(req, res, next) {
  try {
    const { totalMarks, totalQuestions, units, difficultyDistribution, bloomDistribution, syllabusId } = req.body;

    if (!units || !Array.isArray(units) || units.length === 0) {
      return failure(res, 'MISSING_UNITS', 'units must be a non-empty array.', 400);
    }

    const nlpResult = await generateBlueprint({
      totalMarks,
      totalQuestions,
      units,
      difficultyDistribution,
      bloomDistribution,
    });

    const blueprint = await Blueprint.create({
      syllabusId: syllabusId || null,
      totalMarks: nlpResult.totalMarks,
      totalQuestions: nlpResult.totalQuestions,
      units: nlpResult.units,
      difficulty: nlpResult.difficulty,
      bloom: nlpResult.bloom,
      warnings: nlpResult.warnings,
    });

    return success(res, blueprint, 201);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/blueprints/:id */
export async function getBlueprint(req, res, next) {
  try {
    const blueprint = await Blueprint.findById(req.params.id);
    if (!blueprint) return failure(res, 'BLUEPRINT_NOT_FOUND', 'Blueprint not found.', 404);
    return success(res, blueprint);
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/blueprints/:id — teacher adjusts a saved blueprint manually. */
export async function updateBlueprint(req, res, next) {
  try {
    const allowed = ['totalMarks', 'totalQuestions', 'units', 'difficulty', 'bloom'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const blueprint = await Blueprint.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!blueprint) return failure(res, 'BLUEPRINT_NOT_FOUND', 'Blueprint not found.', 404);
    return success(res, blueprint);
  } catch (err) {
    return next(err);
  }
}
