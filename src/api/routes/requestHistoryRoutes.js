const express = require('express');
const RequestHistoryController = require('../controllers/requestHistoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();


const viewingRoles = ['playlist_creator', 'admin', 'master'];



const creationRoles = ['dj', 'admin', 'playlist_creator', 'master'];

router.get('/', authMiddleware, roleMiddleware(viewingRoles), RequestHistoryController.getHistory);
router.post('/', authMiddleware, roleMiddleware(creationRoles), RequestHistoryController.createHistoryEntry);

module.exports = router;