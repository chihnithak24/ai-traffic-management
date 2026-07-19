const Traffic      = require('../models/Traffic');
const Notification = require('../models/Notification');

const getStats = async (req, res) => {
  try {
    const total      = await Traffic.countDocuments();
    const high       = await Traffic.countDocuments({ congestionLevel: 'High' });
    const medium     = await Traffic.countDocuments({ congestionLevel: 'Medium' });
    const low        = await Traffic.countDocuments({ congestionLevel: 'Low' });
    const accidents  = await Traffic.countDocuments({ congestionLevel: 'Accident' });
    const emergency  = await Traffic.countDocuments({ isEmergency: true });
    const active     = await Traffic.countDocuments({ signalStatus: { $ne: 'Offline' } });

    const agg = await Traffic.aggregate([{
      $group: { _id: null, totalVehicles: { $sum: '$vehicleCount' }, avgSpeed: { $avg: '$averageSpeed' }, avgDensity: { $avg: '$trafficDensity' } }
    }]);
    const { totalVehicles = 0, avgSpeed = 0, avgDensity = 0 } = agg[0] || {};

    const recentAlerts = await Notification.find().sort({ createdAt: -1 }).limit(5);
    const topCongested = await Traffic.find({ congestionLevel: 'High' }).sort({ vehicleCount: -1 }).limit(6);
    const recentLocations = await Traffic.find().sort({ lastUpdated: -1 }).limit(8);

    // Simulated daily / weekly / monthly trend
    const today = new Date();
    const daily = [], weekly = [], monthly = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      daily.push({ date: d.toLocaleDateString('en-IN', { weekday: 'short' }), vehicles: Math.round(totalVehicles * (.6 + Math.random() * .8)) });
    }
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i * 7);
      weekly.push({ week: `W${4-i}`, vehicles: Math.round(totalVehicles * (4 + Math.random() * 3)) });
    }
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today); d.setMonth(d.getMonth() - i);
      monthly.push({ month: d.toLocaleDateString('en-IN', { month: 'short' }), vehicles: Math.round(totalVehicles * (15 + Math.random() * 12)) });
    }

    res.json({ success: true, data: {
      overview: { total, high, medium, low, accidents, emergency, active, totalVehicles: Math.round(totalVehicles), avgSpeed: Math.round(avgSpeed), avgDensity: Math.round(avgDensity) },
      congestionBreakdown: { low, medium, high, accidents, roadClosed: await Traffic.countDocuments({ congestionLevel: 'Road Closed' }) },
      topCongested, recentLocations, recentAlerts,
      trends: { daily, weekly, monthly }
    }});
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getStats };
