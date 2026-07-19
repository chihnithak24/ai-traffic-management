const Traffic = require('../models/Traffic');

// Peak hour slots
const PEAK_HOURS = [
  { label: '7AM–9AM',  factor: 1.8 },
  { label: '9AM–11AM', factor: 1.2 },
  { label: '11AM–1PM', factor: 1.0 },
  { label: '1PM–3PM',  factor: 0.9 },
  { label: '3PM–5PM',  factor: 1.1 },
  { label: '5PM–8PM',  factor: 1.9 },
  { label: '8PM–10PM', factor: 1.3 },
  { label: '10PM–7AM', factor: 0.5 },
];

const generateInsights = (locations, totalVehicles, highCount, emergencyCount) => {
  const insights = [];
  const avgVehicles = locations.length ? Math.round(totalVehicles / locations.length) : 0;

  if (highCount > locations.length * 0.5)
    insights.push({ type: 'critical', icon: '🔴', text: `${highCount} out of ${locations.length} areas are highly congested. Immediate signal optimization recommended.` });
  else if (highCount > 0)
    insights.push({ type: 'warning', icon: '🟡', text: `${highCount} high-congestion areas detected. Consider deploying traffic personnel.` });
  else
    insights.push({ type: 'success', icon: '🟢', text: 'All monitored areas are within acceptable traffic limits.' });

  if (emergencyCount > 0)
    insights.push({ type: 'emergency', icon: '🚨', text: `${emergencyCount} active emergency alert(s). Priority routing is in effect.` });

  if (avgVehicles > 150)
    insights.push({ type: 'warning', icon: '📊', text: `Average vehicle count is ${avgVehicles} — above normal threshold. Peak-hour measures advised.` });
  else
    insights.push({ type: 'info', icon: '📊', text: `Average vehicle count is ${avgVehicles} — within normal range.` });

  const topArea = locations.sort((a, b) => b.vehicleCount - a.vehicleCount)[0];
  if (topArea)
    insights.push({ type: 'info', icon: '📍', text: `Highest congestion at ${topArea.areaName} with ${topArea.vehicleCount} vehicles. Alternate routes recommended.` });

  return insights;
};

const getAIReport = async (req, res) => {
  try {
    const locations = await Traffic.find().sort({ vehicleCount: -1 });
    if (!locations.length)
      return res.json({ success: true, data: { summary: {}, peakHourForecast: [], insights: [], vehicleTypeAnalysis: {}, hotspots: [] } });

    const totalVehicles  = locations.reduce((s, l) => s + l.vehicleCount, 0);
    const highCount      = locations.filter(l => l.congestionLevel === 'High').length;
    const mediumCount    = locations.filter(l => l.congestionLevel === 'Medium').length;
    const lowCount       = locations.filter(l => l.congestionLevel === 'Low').length;
    const emergencyCount = locations.filter(l => l.isEmergency).length;
    const avgSpeed       = Math.round(locations.reduce((s, l) => s + l.averageSpeed, 0) / locations.length);
    const avgDensity     = Math.round(locations.reduce((s, l) => s + l.trafficDensity, 0) / locations.length);

    // Peak hour forecast using current total as base
    const peakHourForecast = PEAK_HOURS.map(ph => ({
      label: ph.label,
      estimatedVehicles: Math.round(totalVehicles * ph.factor),
      congestionRisk: ph.factor >= 1.7 ? 'High' : ph.factor >= 1.1 ? 'Medium' : 'Low'
    }));

    // Vehicle type analysis (aggregate breakdown)
    const vehicleTypeAnalysis = locations.reduce((acc, l) => {
      acc.cars   += l.vehicleBreakdown?.cars   || 0;
      acc.bikes  += l.vehicleBreakdown?.bikes  || 0;
      acc.buses  += l.vehicleBreakdown?.buses  || 0;
      acc.trucks += l.vehicleBreakdown?.trucks || 0;
      acc.autos  += l.vehicleBreakdown?.autos  || 0;
      return acc;
    }, { cars: 0, bikes: 0, buses: 0, trucks: 0, autos: 0 });

    // Top 5 hotspots
    const hotspots = locations.slice(0, 5).map(l => ({
      areaName: l.areaName,
      vehicleCount: l.vehicleCount,
      congestionLevel: l.congestionLevel,
      trafficDensity: Math.round(l.trafficDensity),
      averageSpeed: l.averageSpeed,
      recommendation: l.vehicleCount > 150
        ? `Deploy traffic personnel at ${l.areaName} and activate alternate route signage`
        : l.vehicleCount > 70
        ? `Monitor ${l.areaName} closely and adjust signal timing`
        : `${l.areaName} is operating normally`
    }));

    const insights = generateInsights([...locations], totalVehicles, highCount, emergencyCount);

    res.json({
      success: true,
      data: {
        summary: { totalVehicles, totalLocations: locations.length, highCount, mediumCount, lowCount, emergencyCount, avgSpeed, avgDensity },
        peakHourForecast,
        vehicleTypeAnalysis,
        hotspots,
        insights,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAIReport };
