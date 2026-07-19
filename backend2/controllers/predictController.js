const Prediction = require('../models/Prediction');
const Traffic    = require('../models/Traffic');

const simulate = (vehicleCount, areaName) => {
  let congestion, signal, wait, route, peak;
  if (vehicleCount < 30) {
    congestion = 'Low'; signal = 20; wait = Math.round(vehicleCount * 0.5);
    route = `Main route through ${areaName} is clear — proceed normally`;
    peak  = 'No peak hour expected in next 2 hours';
  } else if (vehicleCount <= 70) {
    congestion = 'Medium'; signal = 40; wait = Math.round(vehicleCount * 0.8);
    route = `Consider parallel service road near ${areaName} to save 8–12 min`;
    peak  = 'Peak hour expected between 5–7 PM today';
  } else {
    congestion = 'High'; signal = 60; wait = Math.round(vehicleCount * 1.2);
    route = `Avoid ${areaName} — use bypass/ring road; alternate via NH bypass recommended`;
    peak  = 'Currently in peak hour — expect clearance after 45 min';
  }
  const confidence = Math.round(76 + Math.random() * 20);
  const variance = Math.floor(Math.random() * 4) - 2;
  return { estimatedCongestion: congestion, signalDuration: Math.max(10, signal + variance), waitingTime: Math.max(1, wait + variance), suggestedRoute: route, peakHour: peak, confidenceScore: confidence, analysisTimestamp: new Date().toISOString() };
};

const predict = async (req, res) => {
  try {
    const { vehicleCount, areaName, trafficId } = req.body;
    let vc = vehicleCount, area = areaName || 'Unknown';
    if (trafficId) {
      const t = await Traffic.findById(trafficId);
      if (!t) return res.status(404).json({ success: false, message: 'Location not found' });
      vc = t.vehicleCount; area = t.areaName;
    }
    if (vc === undefined) return res.status(400).json({ success: false, message: 'vehicleCount required' });
    const result = simulate(+vc, area);
    const saved  = await Prediction.create({ trafficId, areaName: area, vehicleCount: +vc, ...result, createdBy: req.user._id });
    res.json({ success: true, area, vehicleCount: +vc, prediction: result, id: saved._id });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const bulkPredict = async (req, res) => {
  try {
    const locations = await Traffic.find().sort({ vehicleCount: -1 }).limit(20);
    const results   = locations.map(t => ({ _id: t._id, areaName: t.areaName, city: t.city, vehicleCount: t.vehicleCount, congestionLevel: t.congestionLevel, prediction: simulate(t.vehicleCount, t.areaName) }));
    res.json({ success: true, count: results.length, data: results });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const history = async (req, res) => {
  try {
    const data = await Prediction.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(20).populate('trafficId', 'areaName city');
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { predict, bulkPredict, history };
