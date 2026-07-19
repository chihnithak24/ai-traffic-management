const express = require('express');
const router = express.Router();
const { getAIReport } = require('../controllers/aiReportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getAIReport);

module.exports = router;
