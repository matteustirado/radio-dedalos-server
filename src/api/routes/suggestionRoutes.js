const express = require('express');
const SuggestionController = require('../controllers/suggestionController');

const router = express.Router();

router.get('/', SuggestionController.getAllSuggestions);
router.put('/:id/status', SuggestionController.updateSuggestionStatus);
router.delete('/:id', SuggestionController.deleteSuggestion);

module.exports = router;