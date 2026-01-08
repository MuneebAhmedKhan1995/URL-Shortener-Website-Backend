import express from 'express';
const router = express.Router();
import { createShortUrl, redirectToUrl, getUserUrls, deleteUrl, getUrlStats } from '../controllers/urlController.js';
import  { protect, checkUrlLimit } from '../middleware/authMiddleware.js';
import { createUrlLimiter } from '../middleware/rateLimiter.js';

router.get('/:shortCode', redirectToUrl);

router.use(protect);

router.post('/shorten', createUrlLimiter, checkUrlLimit, createShortUrl);
router.get('/myurls', getUserUrls);
router.get('/:id/stats', getUrlStats);
router.delete('/:id', deleteUrl);
export default router;