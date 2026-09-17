import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import validateObjectId from '../middleware/validateObjectId.js';
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
router.get('/:id', validateObjectId(), getRubric);
router.put('/:id', validateObjectId(), updateRubric);
router.delete('/:id', validateObjectId(), deleteRubric);
router.post('/:id/approve', validateObjectId(), approveRubric);

export default router;
