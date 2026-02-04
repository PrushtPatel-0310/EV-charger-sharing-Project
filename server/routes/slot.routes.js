import express from 'express';
import { getSlotGrid } from '../controllers/slot.controller.js';

const router = express.Router({ mergeParams: true });

router.get('/grid', getSlotGrid);

export default router;
