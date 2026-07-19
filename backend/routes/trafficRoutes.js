/**
 * trafficRoutes.js - Traffic Location Routes
 */
const express = require('express');
const router = express.Router();
const {
  getAllTraffic,
  getTrafficById,
  createTraffic,
  updateTraffic,
  deleteTraffic,
  toggleEmergency,
  simulateTraffic
} = require('../controllers/trafficController');
const { protect } = require('../middleware/authMiddleware');

// All traffic routes require authentication
router.use(protect);

router.get('/', getAllTraffic);
router.get('/:id', getTrafficById);
router.post('/', createTraffic);
router.post('/simulate', simulateTraffic);
router.put('/:id', updateTraffic);
router.delete('/:id', deleteTraffic);
router.put('/:id/emergency', toggleEmergency);

module.exports = router;
