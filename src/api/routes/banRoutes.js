const express = require('express');
const BanRequestController = require('../controllers/banController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const creationRoles = ['admin', 'master', 'playlist_creator','dj'];
const managementRoles = ['admin', 'master', 'playlist_creator', 'dj'];

router.post('/', authMiddleware, roleMiddleware(creationRoles), BanRequestController.createBanRequest);
router.get('/', authMiddleware, roleMiddleware(managementRoles), BanRequestController.getAllBanRequests);
router.put('/:id/status', authMiddleware, roleMiddleware(managementRoles), BanRequestController.updateBanRequestStatus);

module.exports = router;