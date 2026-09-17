import { Router } from 'express';
import requireDb from '../middleware/requireDb.js';
import validateObjectId from '../middleware/validateObjectId.js';
import { generateAndSaveBlueprint, getBlueprint, updateBlueprint } from '../controllers/blueprints.controller.js';

const router = Router();

router.use(requireDb);

router.post('/generate', generateAndSaveBlueprint);
router.get('/:id', validateObjectId(), getBlueprint);
router.put('/:id', validateObjectId(), updateBlueprint);

export default router;
