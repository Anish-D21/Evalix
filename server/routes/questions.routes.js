import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import validateObjectId from '../middleware/validateObjectId.js';
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
router.get('/:id', validateObjectId(), getQuestion);
router.put('/:id', validateObjectId(), updateQuestion);
router.delete('/:id', validateObjectId(), deleteQuestion);
router.post('/:id/approve', validateObjectId(), approveQuestion);

export default router;
