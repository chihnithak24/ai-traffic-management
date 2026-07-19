const router = require('express').Router();
const { predict, bulkPredict, history } = require('../controllers/predictController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.post('/', predict);
router.get('/bulk', bulkPredict);
router.get('/history', history);
module.exports = router;
