/**
 * Traffic.js - Mongoose Traffic Location Model
 */
const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema(
  {
    areaName: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
      maxlength: [100, 'Area name must not exceed 100 characters']
    },
    city:  { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    vehicleCount: {
      type: Number,
      required: [true, 'Vehicle count is required'],
      min: [0, 'Vehicle count cannot be negative'],
      default: 0
    },
    // Detailed vehicle breakdown
    vehicleBreakdown: {
      cars:       { type: Number, default: 0 },
      bikes:      { type: Number, default: 0 },
      buses:      { type: Number, default: 0 },
      trucks:     { type: Number, default: 0 },
      autos:      { type: Number, default: 0 },
      emergency:  { type: Number, default: 0 }
    },
    trafficDensity: {
      type: Number,   // Percentage 0-100
      min: 0,
      max: 100,
      default: 0
    },
    averageSpeed: {
      type: Number,
      default: 40,
      min: 0
    },
    signalStatus: {
      type: String,
      enum: ['Red', 'Green', 'Yellow', 'Emergency Green', 'Offline'],
      default: 'Green'
    },
    congestionLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Accident', 'Road Closed'],
      default: 'Low'
    },
    isEmergency:   { type: Boolean, default: false },
    emergencyType: { type: String, default: '' },
    lastUpdated:   { type: Date, default: Date.now },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Auto-set congestion level, density, speed, and vehicle breakdown
// Thresholds must match classifyTraffic() in predictController.js:
//   Low    : vc <  50  → density 0-40%,  speed 54-80 km/h
//   Medium : vc 50-150 → density 40-70%, speed 20-54 km/h
//   High   : vc > 150  → density 70-100%, speed 5-20 km/h
trafficSchema.pre('save', function (next) {
  const vc = this.vehicleCount;

  // Congestion & density
  if (!this.congestionLevel || !['Accident','Road Closed'].includes(this.congestionLevel)) {
    if (vc < 50) {
      this.congestionLevel = 'Low';
      this.trafficDensity  = Math.min(vc * 0.8, 39);          // 0–39%
    } else if (vc <= 150) {
      this.congestionLevel = 'Medium';
      this.trafficDensity  = 40 + ((vc - 50) / 100) * 29;     // 40–69%
    } else if (vc <= 300) {
      this.congestionLevel = 'High';
      this.trafficDensity  = 70 + ((vc - 150) / 150) * 20;    // 70–90%
    } else {
      this.congestionLevel = 'High';
      this.trafficDensity  = Math.min(90 + ((vc - 300) / 100) * 10, 100);
    }
  }

  // averageSpeed: Low→40-80, Medium→20-40, High→5-20 — all match classifyTraffic()
  if (this.congestionLevel === 'Low') {
    this.averageSpeed = Math.max(40, Math.round(80 - (this.trafficDensity / 40) * 40));
  } else if (this.congestionLevel === 'Medium') {
    this.averageSpeed = Math.max(20, Math.round(40 - ((this.trafficDensity - 40) / 30) * 20));
  } else {
    this.averageSpeed = Math.max(5,  Math.round(20 - ((this.trafficDensity - 70) / 30) * 15));
  }

  // Auto-distribute vehicle breakdown if not manually set
  if (vc > 0 && (this.vehicleBreakdown.cars === 0 && this.vehicleBreakdown.bikes === 0)) {
    this.vehicleBreakdown.cars      = Math.round(vc * 0.44);
    this.vehicleBreakdown.bikes     = Math.round(vc * 0.37);
    this.vehicleBreakdown.buses     = Math.round(vc * 0.06);
    this.vehicleBreakdown.trucks    = Math.round(vc * 0.07);
    this.vehicleBreakdown.autos     = Math.round(vc * 0.04);
    this.vehicleBreakdown.emergency = Math.round(vc * 0.02);
  }

  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Traffic', trafficSchema);
