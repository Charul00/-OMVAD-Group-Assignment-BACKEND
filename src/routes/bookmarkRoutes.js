import express from 'express';
import { body } from 'express-validator';
import * as bookmarkController from '../controllers/bookmarkController.js';
import { authenticate } from '../utils/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a new bookmark
router.post(
  '/',
  [
    body('url').isURL().withMessage('Please enter a valid URL')
  ],
  bookmarkController.createBookmark
);

// Get all bookmarks
router.get('/', bookmarkController.getAllBookmarks);

// Delete a bookmark
router.delete('/:id', bookmarkController.deleteBookmark);

export default router;
