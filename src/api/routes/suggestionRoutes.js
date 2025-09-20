const express = require('express');
const SuggestionController = require('../controllers/suggestionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const suggestionManagementRoles = ['admin', 'master', 'dj', 'musics'];

router.use(authMiddleware, roleMiddleware(suggestionManagementRoles));

router.get('/', SuggestionController.getAllSuggestions);
router.put('/:id/status', SuggestionController.updateSuggestionStatus);
router.delete('/:id', SuggestionController.deleteSuggestion);

module.exports = router;