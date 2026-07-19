/**
 * trafficController.js - Traffic Location CRUD Controller
 */
const Traffic = require('../models/Traffic');

/**
 * @route   GET /api/traffic
 * @desc    Get all traffic locations with optional filters
 * @access  Private
 */
const getAllTraffic = async (req, res) => {
  try {
    const { congestionLevel, search, page = 1, limit = 50 } = req.query;

    // Build query object
    const query = {};
    if (congestionLevel && congestionLevel !== 'All') {
      query.congestionLevel = congestionLevel;
    }
    if (search) {
      query.areaName = { $regex: search, $options: 'i' };
    }

    const total = await Traffic.countDocuments(query);
    const trafficData = await Traffic.find(query)
      .sort({ lastUpdated: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: trafficData.length,
      total,
      data: trafficData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/traffic/:id
 * @desc    Get a single traffic location by ID
 * @access  Private
 */
const getTrafficById = async (req, res) => {
  try {
    const traffic = await Traffic.findById(req.params.id);
    if (!traffic) {
      return res.status(404).json({ success: false, message: 'Traffic location not found' });
    }
    res.json({ success: true, data: traffic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/traffic
 * @desc    Create a new traffic location
 * @access  Private
 */
const createTraffic = async (req, res) => {
  try {
    const { areaName, latitude, longitude, vehicleCount, signalStatus } = req.body;

    if (!areaName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Area name, latitude, and longitude are required' });
    }

    const traffic = await Traffic.create({
      areaName,
      latitude,
      longitude,
      vehicleCount: vehicleCount || 0,
      signalStatus: signalStatus || 'Green',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Traffic location created', data: traffic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/traffic/:id
 * @desc    Update a traffic location
 * @access  Private
 */
const updateTraffic = async (req, res) => {
  try {
    let traffic = await Traffic.findById(req.params.id);
    if (!traffic) {
      return res.status(404).json({ success: false, message: 'Traffic location not found' });
    }

    // Update fields
    Object.assign(traffic, req.body);
    await traffic.save(); // Triggers pre-save hook for congestion recalculation

    res.json({ success: true, message: 'Traffic location updated', data: traffic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/traffic/:id
 * @desc    Delete a traffic location
 * @access  Private
 */
const deleteTraffic = async (req, res) => {
  try {
    const traffic = await Traffic.findById(req.params.id);
    if (!traffic) {
      return res.status(404).json({ success: false, message: 'Traffic location not found' });
    }
    await traffic.deleteOne();
    res.json({ success: true, message: 'Traffic location deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/traffic/:id/emergency
 * @desc    Toggle emergency status for a location
 * @access  Private
 */
const toggleEmergency = async (req, res) => {
  try {
    const traffic = await Traffic.findById(req.params.id);
    if (!traffic) {
      return res.status(404).json({ success: false, message: 'Traffic location not found' });
    }

    traffic.isEmergency = !traffic.isEmergency;
    traffic.signalStatus = traffic.isEmergency ? 'Emergency Green' : 'Green';
    await traffic.save();

    res.json({
      success: true,
      message: `Emergency ${traffic.isEmergency ? 'activated' : 'deactivated'}`,
      data: traffic
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/traffic/simulate
 * @desc    Bulk-set all traffic locations to a preset simulation level
 *          Presets: 'low' | 'medium' | 'high'
 * @access  Private
 */
const simulateTraffic = async (req, res) => {
  try {
    const { preset } = req.body;
    if (!['low', 'medium', 'high'].includes(preset)) {
      return res.status(400).json({ success: false, message: 'preset must be low | medium | high' });
    }

    // Representative vehicle counts per preset (well within each band)
    const presetMap = {
      low:    { vehicleCount: 20,  signalStatus: 'Green'  },   // vc<50  → Low
      medium: { vehicleCount: 100, signalStatus: 'Yellow' },   // vc 50-150 → Medium
      high:   { vehicleCount: 250, signalStatus: 'Red'    },   // vc>150 → High
    };

    const { vehicleCount, signalStatus } = presetMap[preset];

    // Get all locations, update each via save() so pre-save hook recalculates
    // Use updateMany for speed — pre-save hook not needed since we set all fields
    const totalDocs = await Traffic.countDocuments();
    if (totalDocs === 0) {
      return res.status(400).json({ success: false, message: 'No traffic locations found. Run the seed script first.' });
    }

    // Calculate derived fields inline (mirrors pre-save hook logic)
    let congestionLevel, trafficDensity, averageSpeed;
    if (preset === 'low') {
      congestionLevel = 'Low';
      trafficDensity  = Math.round(vehicleCount * 0.8);       // ~16%
      averageSpeed    = Math.max(40, Math.round(80 - (trafficDensity / 40) * 40));
    } else if (preset === 'medium') {
      congestionLevel = 'Medium';
      trafficDensity  = Math.round(40 + ((vehicleCount - 50) / 100) * 29);  // ~55%
      averageSpeed    = Math.max(20, Math.round(40 - ((trafficDensity - 40) / 30) * 20));
    } else {
      congestionLevel = 'High';
      trafficDensity  = Math.round(70 + ((vehicleCount - 150) / 150) * 20); // ~77%
      averageSpeed    = Math.max(5,  Math.round(20 - ((trafficDensity - 70) / 30) * 15));
    }

    await Traffic.updateMany({}, {
      $set: {
        vehicleCount,
        signalStatus,
        congestionLevel,
        trafficDensity,
        averageSpeed,
        isEmergency: false,
        lastUpdated: new Date(),
        'vehicleBreakdown.cars':      Math.round(vehicleCount * 0.44),
        'vehicleBreakdown.bikes':     Math.round(vehicleCount * 0.37),
        'vehicleBreakdown.buses':     Math.round(vehicleCount * 0.06),
        'vehicleBreakdown.trucks':    Math.round(vehicleCount * 0.07),
        'vehicleBreakdown.autos':     Math.round(vehicleCount * 0.04),
        'vehicleBreakdown.emergency': Math.round(vehicleCount * 0.02),
      }
    });

    res.json({
      success: true,
      message: `Simulation applied: all ${totalDocs} locations set to ${congestionLevel} traffic`,
      preset,
      applied: { vehicleCount, congestionLevel, trafficDensity, averageSpeed, signalStatus },
      count: totalDocs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllTraffic, getTrafficById, createTraffic, updateTraffic, deleteTraffic, toggleEmergency, simulateTraffic };
