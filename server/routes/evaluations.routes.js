import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import { evaluateStudentAnswer } from '../controllers/evaluations.controller.js';

const router = Router();

router.use(requireDb);

router.post('/evaluate', evaluateStudentAnswer);
router.post('/', evaluateStudentAnswer);

export default router;
