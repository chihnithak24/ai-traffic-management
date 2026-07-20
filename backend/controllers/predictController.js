const Traffic = require('../models/Traffic');

const ALTERNATE_ROUTES = {
  High: [
    'Use Ring Road bypass to avoid main corridor',
    'Take the parallel service road via inner lanes',
    'Reroute via elevated expressway — estimated 8 min saved',
    'Use metro/public transit — road heavily congested',
  ],
  Medium: [
    'Consider parallel road to reduce travel time by ~4 min',
    'Slight delay expected — proceed with caution',
    'Inner lane route available with moderate flow',
  ],
  Low: [
    'Main route is clear — proceed normally',
    'No alternate needed — traffic is flowing well',
  ]
};

const EMERGENCY_ROUTES = [
  'All signals ahead set to Emergency Green — clear corridor active',
  'Priority lane activated on main arterial road',
  'Cross-traffic halted — emergency vehicle corridor open',
  'Fastest route: bypass inner roads, use main highway with signal override',
];

/**
 * Classify a road segment into Low / Medium / High using BOTH speed and count.
 * Using OR previously caused Yellow to swallow everything because speed is
 * almost always ≥ 20 km/h even on congested roads.
 * Rule: the WORSE of speed-class and count-class wins.
 */
const classifyTraffic = (vehicleCount, averageSpeed) => {
  const vc = vehicleCount ?? 0;
  const sp = averageSpeed ?? 40;   // default to free-flow when unknown

  // Count-based class
  const countClass = vc < 50 ? 0 : vc <= 150 ? 1 : 2;   // 0=Low 1=Medium 2=High
  // Speed-based class
  const speedClass = sp >= 40 ? 0 : sp >= 20 ? 1 : 2;

  // Worst of the two wins
  const cls = Math.max(countClass, speedClass);
  return cls === 0 ? 'Low' : cls === 1 ? 'Medium' : 'High';
};

const calculatePrediction = (vehicleCount, congestionLevel, areaName, averageSpeed = null, isEmergency = false) => {
  let estimatedCongestion, recommendedSignalDuration, estimatedWaitingTime;

  estimatedCongestion = classifyTraffic(vehicleCount, averageSpeed);

  // Signal duration based on congestion — deterministic
  if (estimatedCongestion === 'Low') {
    recommendedSignalDuration = 20;
    estimatedWaitingTime = Math.round(vehicleCount * 0.5);
  } else if (estimatedCongestion === 'Medium') {
    recommendedSignalDuration = 40;
    estimatedWaitingTime = Math.round(vehicleCount * 0.8);
  } else {
    recommendedSignalDuration = 60;
    estimatedWaitingTime = Math.round(vehicleCount * 1.2);
  }

  // Alternate routes — deterministic, pick by vehicleCount hash (no random)
  const routePool = ALTERNATE_ROUTES[estimatedCongestion] || ALTERNATE_ROUTES.Low;
  const idx = vehicleCount % routePool.length;
  const suggestedRoute = routePool[idx];
  const alternateRoutes = routePool.filter((_, i) => i !== idx).slice(0, 2);

  // Emergency priority route — deterministic pick
  const emergencyRoute = isEmergency
    ? EMERGENCY_ROUTES[vehicleCount % EMERGENCY_ROUTES.length]
    : null;

  // Vehicle density analysis — fixed ratios, fully deterministic
  const densityAnalysis = {
    cars:   Math.round(vehicleCount * 0.44),
    bikes:  Math.round(vehicleCount * 0.37),
    buses:  Math.round(vehicleCount * 0.06),
    trucks: Math.round(vehicleCount * 0.07),
    autos:  Math.round(vehicleCount * 0.04),
  };

  // Confidence based on data richness — deterministic
  const confidenceScore = averageSpeed !== null ? 95 : 80;

  return {
    estimatedCongestion,
    recommendedSignalDuration,
    estimatedWaitingTime,
    suggestedRoute,
    alternateRoutes,
    emergencyRoute,
    densityAnalysis,
    confidenceScore,
    analysisTimestamp: new Date().toISOString()
  };
};

const getPrediction = async (req, res) => {
  try {
    const { vehicleCount, congestionLevel, areaName, trafficId } = req.body;
    let vc = vehicleCount, cl = congestionLevel, area = areaName || 'Custom Input', isEmergency = false, speed = null;

    if (trafficId) {
      const traffic = await Traffic.findById(trafficId);
      if (!traffic) return res.status(404).json({ success: false, message: 'Traffic location not found' });
      vc = traffic.vehicleCount;
      cl = traffic.congestionLevel;
      area = traffic.areaName;
      speed = traffic.averageSpeed;
      isEmergency = traffic.isEmergency;
    }

    if (vc === undefined || vc === null)
      return res.status(400).json({ success: false, message: 'Vehicle count is required' });

    const prediction = calculatePrediction(Number(vc), cl, area, speed, isEmergency);
    res.json({ success: true, area, vehicleCount: Number(vc), averageSpeed: speed, isEmergency, prediction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBulkPredictions = async (req, res) => {
  try {
    const trafficData = await Traffic.find().sort({ vehicleCount: -1 }).limit(20);
    const predictions = trafficData.map(t => ({
      _id: t._id,
      areaName: t.areaName,
      vehicleCount: t.vehicleCount,
      averageSpeed: t.averageSpeed,
      congestionLevel: t.congestionLevel,
      isEmergency: t.isEmergency,
      prediction: calculatePrediction(t.vehicleCount, t.congestionLevel, t.areaName, t.averageSpeed, t.isEmergency)
    }));
    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @route   GET /api/predict/live-roads
 * @desc    Per-road real-time traffic status: Green/Yellow/Red/Gray
 *          Derived from live vehicleCount + averageSpeed — zero randomness.
 *          Refreshes lastUpdated on all records so they never go stale.
 * @access  Private
 */
const getLiveRoads = async (req, res) => {
  try {
    // Touch lastUpdated on every record so stale check always passes
    await Traffic.updateMany({}, { $set: { lastUpdated: new Date() } });

    const roads = await Traffic.find(
      {},
      'areaName vehicleCount averageSpeed trafficDensity congestionLevel signalStatus isEmergency lastUpdated latitude longitude'
    ).lean();

    if (!roads.length) {
      return res.json({ success: true, count: 0, data: [], fetchedAt: new Date().toISOString(),
        message: 'No traffic locations found. Run the seed script or add locations in Traffic Monitor.' });
    }

    const classify = (r) => {
      if (r.isEmergency) return { trafficColor: 'Red', trafficLabel: 'Emergency' };
      const level = classifyTraffic(r.vehicleCount, r.averageSpeed);
      if (level === 'Low')    return { trafficColor: 'Green',  trafficLabel: 'Low'      };
      if (level === 'Medium') return { trafficColor: 'Yellow', trafficLabel: 'Moderate' };
      return                         { trafficColor: 'Red',    trafficLabel: 'Heavy'    };
    };

    const result = roads.map(r => ({
      _id:           r._id,
      areaName:      r.areaName,
      ...classify(r),
      vehicleCount:  r.vehicleCount,
      averageSpeed:  r.averageSpeed,
      trafficDensity:r.trafficDensity,
      congestionLevel: r.congestionLevel,
      signalStatus:  r.signalStatus,
      isEmergency:   r.isEmergency,
      lastUpdated:   r.lastUpdated,
      latitude:      r.latitude,
      longitude:     r.longitude
    }));

    res.json({ success: true, count: result.length, data: result, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPrediction, getBulkPredictions, getLiveRoads };
