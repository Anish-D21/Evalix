import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import {
  generateAndSaveRubric,
  createRubric,
  getRubric,
  updateRubric,
  deleteRubric,
  approveRubric,
} from '../controllers/rubrics.controller.js';

const router = Router();

router.use(requireDb);

router.post('/generate', generateAndSaveRubric);
router.post('/', createRubric);
router.get('/:id', getRubric);
router.put('/:id', updateRubric);
router.delete('/:id', deleteRubric);
router.post('/:id/approve', approveRubric);

export default router;
