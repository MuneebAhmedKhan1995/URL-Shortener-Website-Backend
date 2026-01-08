import express from 'express';
const router = express.Router();
import { 
  registerUser, 
  loginUser, 
  getUserProfile 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

router.use(authLimiter);

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

export default router;  