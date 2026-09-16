import { Router } from 'express';
import upload from '../middleware/upload.js';
import requireDb from '../middleware/requireDb.js';
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
router.get('/:id', getSyllabus);
router.put('/:id', updateSyllabus);
router.delete('/:id', deleteSyllabus);

export default router;
