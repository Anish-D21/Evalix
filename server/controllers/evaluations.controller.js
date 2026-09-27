import { evaluateAnswer } from '../services/nlpClient.js';
import Rubric from '../models/Rubric.js';
import Question from '../models/Question.js';
import { success, failure } from '../utils/apiResponse.js';

/**
 * POST /api/evaluations/evaluate
 * Evaluates a student answer against a rubric and reference answer.
 * Accepts either:
 * 1. An explicit rubric object: { question, referenceAnswer, rubric: { totalMarks, concepts, relationships }, studentAnswer }
 * 2. Or a rubricId: { rubricId, studentAnswer, question, referenceAnswer } where the rubric is loaded from MongoDB
 */
export async function evaluateStudentAnswer(req, res, next) {
  try {
    const { question, referenceAnswer, rubric, rubricId, studentAnswer } = req.body;

    if (studentAnswer === undefined || studentAnswer === null) {
      return failure(res, 'MISSING_STUDENT_ANSWER', 'studentAnswer must be provided.', 400);
    }

    let activeRubric = rubric;
    let activeQuestion = question;

    if (!activeRubric && rubricId) {
      const foundRubric = await Rubric.findById(rubricId);
      if (!foundRubric) {
        return failure(res, 'RUBRIC_NOT_FOUND', 'Specified rubric not found.', 404);
      }
      activeRubric = {
        totalMarks: foundRubric.totalMarks,
        concepts: foundRubric.concepts,
        relationships: foundRubric.relationships || [],
      };
      if (!activeQuestion && foundRubric.questionId) {
        const foundQuestion = await Question.findById(foundRubric.questionId);
        if (foundQuestion) {
          activeQuestion = foundQuestion.text;
        }
      }
    }

    if (!activeRubric) {
      return failure(res, 'MISSING_RUBRIC', 'Either rubric or rubricId is required for evaluation.', 400);
    }

    if (!activeRubric.concepts || !Array.isArray(activeRubric.concepts) || activeRubric.concepts.length === 0) {
      return failure(res, 'INVALID_RUBRIC', 'Rubric must contain at least one concept.', 400);
    }

    const payload = {
      question: activeQuestion || undefined,
      referenceAnswer: referenceAnswer || undefined,
      rubric: {
        totalMarks: Number(activeRubric.totalMarks) || activeRubric.concepts.reduce((s, c) => s + (Number(c.marks) || 0), 0),
        concepts: activeRubric.concepts.map((c, i) => ({
          id: c.id || `c_${i + 1}`,
          name: c.name,
          description: c.description || '',
          marks: Number(c.marks) || 0,
          importance: c.importance || 'medium',
          acceptablePhrases: Array.isArray(c.acceptablePhrases) ? c.acceptablePhrases : [],
        })),
        relationships: (activeRubric.relationships || []).map((r) => ({
          sourceConcept: r.sourceConcept,
          relationship: r.relationship,
          targetConcept: r.targetConcept,
          importance: r.importance || 'medium',
          marks: Number(r.marks) || 0,
        })),
      },
      studentAnswer: String(studentAnswer),
    };

    const result = await evaluateAnswer(payload);
    return success(res, result);
  } catch (err) {
    return next(err);
  }
}
