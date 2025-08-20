const express = require('express');
const SuggestionController = require('../controllers/suggestionController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['admin', 'master']));

router.get('/', SuggestionController.getAllSuggestions);
router.delete('/:id', SuggestionController.deleteSuggestion);

module.exports = router;