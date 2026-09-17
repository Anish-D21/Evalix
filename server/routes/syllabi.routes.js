import { Router } from 'express';
import upload from '../middleware/upload.js';
import requireDb from '../middleware/requireDb.js';
import validateObjectId from '../middleware/validateObjectId.js';
import {
  createSyllabus,
  listSyllabi,
  getSyllabus,
  updateSyllabus,
  deleteSyllabus,
} from '../controllers/syllabi.controller.js';

const router = Router();

router.use(requireDb);

router.post('/', upload.single('file'), createSyllabus);
router.get('/', listSyllabi);
router.get('/:id', validateObjectId(), getSyllabus);
router.put('/:id', validateObjectId(), updateSyllabus);
router.delete('/:id', validateObjectId(), deleteSyllabus);

export default router;
