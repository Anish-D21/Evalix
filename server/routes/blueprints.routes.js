import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import { generateAndSaveBlueprint, getBlueprint, updateBlueprint } from '../controllers/blueprints.controller.js';

const router = Router();

router.use(requireDb);

router.post('/generate', generateAndSaveBlueprint);
router.get('/:id', getBlueprint);
router.put('/:id', updateBlueprint);

export default router;
