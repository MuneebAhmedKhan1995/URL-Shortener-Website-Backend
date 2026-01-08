import express from 'express';
const router = express.Router();
import { getUrlAnalytics, getDashboardSummary }  from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

router.use(protect);

router.get('/:shortCode', getUrlAnalytics);
router.get('/dashboard/summary', getDashboardSummary);

export default router;