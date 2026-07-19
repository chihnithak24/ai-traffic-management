const router = require('express').Router();
const { getAll, markRead, deleteAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.get('/', getAll);
router.put('/mark-read', markRead);
router.delete('/', deleteAll);
module.exports = router;
