const express = require('express');
const BanController = require('../controllers/banController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

const creationRoles = ['admin', 'master', 'dj'];
const managementRoles = ['admin', 'master', 'playlist_creator'];


router.post('/', authMiddleware, roleMiddleware(creationRoles), BanController.createBan);
router.delete('/:id', authMiddleware, roleMiddleware(creationRoles), BanController.deactivateBan);


router.get('/active', authMiddleware, roleMiddleware(creationRoles), BanController.getActiveBans);


router.get('/', authMiddleware, roleMiddleware(managementRoles), BanController.getAllBansForManager);
router.put('/:id/status', authMiddleware, roleMiddleware(managementRoles), BanController.updateBanManagerStatus);

module.exports = router;