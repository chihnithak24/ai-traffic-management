/**
 * Incident.js - Incident Report Model
 */
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Accident', 'Road Block', 'Construction', 'Heavy Traffic', 'Flood', 'Broken Signal', 'Vehicle Breakdown'],
      required: true
    },
    location: { type: String, required: true, trim: true },
    city:     { type: String, trim: true },
    latitude:  { type: Number },
    longitude: { type: Number },
    description: { type: String, trim: true, maxlength: 500 },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open'
    },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
