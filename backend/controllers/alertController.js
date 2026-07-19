const Traffic = require('../models/Traffic');

const getAlerts = async (req, res) => {
  try {
    const locations = await Traffic.find().sort({ vehicleCount: -1 });
    const alerts = [];

    locations.forEach(l => {
      if (l.isEmergency) {
        alerts.push({
          id: l._id,
          type: 'emergency',
          severity: 'critical',
          areaName: l.areaName,
          message: `🚨 Emergency active at ${l.areaName}. Priority routing enabled.`,
          vehicleCount: l.vehicleCount,
          timestamp: l.lastUpdated
        });
      }
      if (l.congestionLevel === 'High') {
        alerts.push({
          id: l._id,
          type: 'congestion',
          severity: 'high',
          areaName: l.areaName,
          message: `🔴 High congestion at ${l.areaName} — ${l.vehicleCount} vehicles, ${Math.round(l.trafficDensity)}% density.`,
          vehicleCount: l.vehicleCount,
          timestamp: l.lastUpdated
        });
      } else if (l.congestionLevel === 'Medium' && l.vehicleCount > 60) {
        alerts.push({
          id: l._id,
          type: 'warning',
          severity: 'medium',
          areaName: l.areaName,
          message: `🟡 Rising traffic at ${l.areaName} — ${l.vehicleCount} vehicles detected.`,
          vehicleCount: l.vehicleCount,
          timestamp: l.lastUpdated
        });
      }
    });

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAlerts };
