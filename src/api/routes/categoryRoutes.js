const express = require('express');
const CategoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', CategoryController.getAllCategories);
router.post('/', authMiddleware, roleMiddleware('master', 'admin'), CategoryController.createCategory);
router.put('/:id', authMiddleware, roleMiddleware('master','admin'), CategoryController.updateCategory);
router.delete('/:id', authMiddleware, roleMiddleware('master','admin'), CategoryController.deleteCategory);

module.exports = router;