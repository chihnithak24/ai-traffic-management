const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  trafficId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Traffic' },
  areaName:           { type: String },
  vehicleCount:       { type: Number },
  estimatedCongestion:{ type: String },
  signalDuration:     { type: Number },
  waitingTime:        { type: Number },
  suggestedRoute:     { type: String },
  peakHour:           { type: String },
  confidenceScore:    { type: Number },
  createdBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);
