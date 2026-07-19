const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema({
  areaName:       { type: String, required: true, trim: true },
  city:           { type: String, required: true, trim: true },
  state:          { type: String, required: true, trim: true },
  latitude:       { type: Number, required: true },
  longitude:      { type: Number, required: true },
  vehicleCount:   { type: Number, default: 0, min: 0 },
  averageSpeed:   { type: Number, default: 0, min: 0 },   // km/h
  trafficDensity: { type: Number, default: 0, min: 0, max: 100 },
  signalStatus:   { type: String, enum: ['Green', 'Red', 'Yellow', 'Emergency Green', 'Offline'], default: 'Green' },
  congestionLevel:{ type: String, enum: ['Low', 'Medium', 'High', 'Accident', 'Road Closed'], default: 'Low' },
  isEmergency:    { type: Boolean, default: false },
  emergencyType:  { type: String, enum: ['None', 'Ambulance', 'Police', 'Fire'], default: 'None' },
  lastUpdated:    { type: Date, default: Date.now },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Auto-derive congestion from vehicle count before saving
trafficSchema.pre('save', function (next) {
  if (this.congestionLevel !== 'Accident' && this.congestionLevel !== 'Road Closed') {
    if (this.vehicleCount < 30)       this.congestionLevel = 'Low';
    else if (this.vehicleCount <= 70) this.congestionLevel = 'Medium';
    else                               this.congestionLevel = 'High';
  }
  this.trafficDensity = this.vehicleCount < 30
    ? Math.min(this.vehicleCount * 2, 30)
    : this.vehicleCount <= 70
      ? 30 + ((this.vehicleCount - 30) / 40) * 40
      : Math.min(70 + ((this.vehicleCount - 70) / 50) * 30, 100);
  this.averageSpeed = Math.max(5, 80 - this.trafficDensity * 0.7);
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Traffic', trafficSchema);
