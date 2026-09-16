import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import {
  generateAndSaveQuestions,
  listQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  approveQuestion,
} from '../controllers/questions.controller.js';

const router = Router();

router.use(requireDb);

router.post('/generate', generateAndSaveQuestions);
router.get('/', listQuestions);
router.get('/:id', getQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.post('/:id/approve', approveQuestion);

export default router;
