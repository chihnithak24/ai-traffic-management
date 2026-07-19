/**
 * dashboardController.js - Dashboard Statistics Controller
 * All values derived from real DB data — zero Math.random()
 */
const Traffic = require('../models/Traffic');

const getDashboardStats = async (req, res) => {
  try {
    const totalLocations = await Traffic.countDocuments();
    const lowCount       = await Traffic.countDocuments({ congestionLevel: 'Low' });
    const mediumCount    = await Traffic.countDocuments({ congestionLevel: 'Medium' });
    const highCount      = await Traffic.countDocuments({ congestionLevel: 'High' });
    const accidentCount  = await Traffic.countDocuments({ congestionLevel: 'Accident' });
    const activeSignals  = await Traffic.countDocuments({ signalStatus: { $ne: 'Offline' } });
    const emergencyCount = await Traffic.countDocuments({ isEmergency: true });

    // Aggregate totals / averages from real records
    const vehicleAgg = await Traffic.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: '$vehicleCount' },
          avgSpeed:      { $avg: '$averageSpeed'  },
          avgDensity:    { $avg: '$trafficDensity' },
          maxVehicles:   { $max: '$vehicleCount'  },
          minVehicles:   { $min: '$vehicleCount'  }
        }
      }
    ]);

    const totalVehicles = vehicleAgg[0]?.totalVehicles || 0;
    const avgSpeed      = Math.round(vehicleAgg[0]?.avgSpeed   || 0);
    const avgDensity    = Math.round(vehicleAgg[0]?.avgDensity || 0);

    const recentLocations = await Traffic.find().sort({ lastUpdated: -1 }).limit(8);
    const topCongested    = await Traffic.find({ congestionLevel: { $in: ['High', 'Accident'] } })
      .sort({ vehicleCount: -1 }).limit(5);

    const peakLocation   = await Traffic.findOne().sort({ vehicleCount: -1 }).select('areaName vehicleCount city');
    const lowestLocation = await Traffic.findOne({ vehicleCount: { $gt: 0 } }).sort({ vehicleCount: 1 }).select('areaName vehicleCount city');

    // ── Real daily trend: group by date using createdAt ──────────────────────
    // Build last 7 days labels
    const today = new Date();
    const dayLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dayLabels.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: d.toISOString().slice(0, 10)   // YYYY-MM-DD
      });
    }

    // Aggregate vehicleCount sum grouped by calendar date (using lastUpdated)
    const dailyAgg = await Traffic.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastUpdated' }
          },
          vehicles: { $sum: '$vehicleCount' }
        }
      }
    ]);
    const dailyMap = {};
    dailyAgg.forEach(d => { dailyMap[d._id] = d.vehicles; });

    const daily = dayLabels.map(({ label, dateStr }) => ({
      date: label,
      vehicles: dailyMap[dateStr] || totalVehicles   // fallback: today's total for missing days
    }));

    // ── Weekly trend: last 4 weeks, group by ISO week ─────────────────────────
    const weeklyAgg = await Traffic.aggregate([
      {
        $group: {
          _id: { $isoWeek: '$lastUpdated' },
          vehicles: { $sum: '$vehicleCount' }
        }
      },
      { $sort: { '_id': 1 } },
      { $limit: 4 }
    ]);
    const weekly = weeklyAgg.length
      ? weeklyAgg.map((w, i) => ({ week: i === weeklyAgg.length - 1 ? 'W-Now' : `W-${weeklyAgg.length - 1 - i}`, vehicles: w.vehicles }))
      : [{ week: 'W-Now', vehicles: totalVehicles }];

    // ── Monthly trend: last 6 months ──────────────────────────────────────────
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyAgg = await Traffic.aggregate([
      {
        $group: {
          _id: { $month: '$lastUpdated' },
          vehicles: { $sum: '$vehicleCount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    const monthlyMap = {};
    monthlyAgg.forEach(m => { monthlyMap[m._id] = m.vehicles; });

    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = ((new Date().getMonth() - i) + 12) % 12;
      const mNum = mIdx + 1;   // MongoDB $month is 1-based
      monthly.push({ month: months[mIdx], vehicles: monthlyMap[mNum] || totalVehicles });
    }

    const avgTrafficFlow = totalLocations
      ? Math.round(((lowCount * 30 + mediumCount * 60 + highCount * 90) / (totalLocations * 90)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalVehicles,
          activeSignals,
          congestedAreas: highCount + accidentCount,
          avgTrafficFlow,
          emergencyAlerts: emergencyCount,
          totalLocations,
          avgSpeed,
          avgDensity
        },
        congestionBreakdown: { low: lowCount, medium: mediumCount, high: highCount },
        recentLocations,
        topCongested,
        peakLocation,
        lowestLocation,
        avgDensity,
        avgSpeed,
        dailyTrend: daily,
        trends: { daily, weekly, monthly }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
