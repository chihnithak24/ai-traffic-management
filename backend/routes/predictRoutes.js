/**
 * predictRoutes.js - AI Prediction Routes
 */
const express = require('express');
const router = express.Router();
const { getPrediction, getBulkPredictions, getLiveRoads } = require('../controllers/predictController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', getPrediction);
router.get('/bulk', getBulkPredictions);
router.get('/live-roads', getLiveRoads);

module.exports = router;
