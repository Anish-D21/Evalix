import Syllabus from '../models/Syllabus.js';
import { extractTopics } from '../services/nlpClient.js';
import { success, failure } from '../utils/apiResponse.js';

/**
 * POST /api/syllabi
 * Receives an uploaded file, forwards it to the NLP service for
 * extraction (Section 48's flow: Node receives file -> FastAPI extracts
 * text -> structured syllabus saved in MongoDB -> temporary file
 * discarded — the multer buffer is never written to disk and is
 * garbage-collected once this request completes).
 */
export async function createSyllabus(req, res, next) {
  try {
    if (!req.file) {
      return failure(res, 'MISSING_FILE', 'A syllabus file must be uploaded as multipart form field "file".', 400);
    }

    const nlpResult = await extractTopics(req.file.buffer, req.file.originalname, req.file.mimetype);

    const syllabus = await Syllabus.create({
      title: req.body.title || req.file.originalname,
      originalFileName: nlpResult.originalFileName,
      extractedText: nlpResult.extractedText,
      units: nlpResult.units,
    });

    return success(res, syllabus, 201);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/syllabi */
export async function listSyllabi(req, res, next) {
  try {
    const syllabi = await Syllabus.find().sort({ createdAt: -1 }).select('-extractedText');
    return success(res, syllabi);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/syllabi/:id */
export async function getSyllabus(req, res, next) {
  try {
    const syllabus = await Syllabus.findById(req.params.id);
    if (!syllabus) return failure(res, 'SYLLABUS_NOT_FOUND', 'Syllabus not found.', 404);
    return success(res, syllabus);
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/syllabi/:id
 * Teacher edits (Section 14: unit names, topic names, add/delete/
 * rename/reorder topics) land here — Node persists whatever the teacher
 * submits, it never re-runs extraction.
 */
export async function updateSyllabus(req, res, next) {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.units !== undefined) updates.units = req.body.units;
    if (req.body.status !== undefined) updates.status = req.body.status;

    const syllabus = await Syllabus.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!syllabus) return failure(res, 'SYLLABUS_NOT_FOUND', 'Syllabus not found.', 404);
    return success(res, syllabus);
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/syllabi/:id */
export async function deleteSyllabus(req, res, next) {
  try {
    const syllabus = await Syllabus.findByIdAndDelete(req.params.id);
    if (!syllabus) return failure(res, 'SYLLABUS_NOT_FOUND', 'Syllabus not found.', 404);
    return success(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
}
