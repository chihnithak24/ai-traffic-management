const router = require('express').Router();
const { getStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
router.get('/', protect, getStats);
module.exports = router;
