const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['info', 'warning', 'danger', 'success', 'emergency'], default: 'info' },
  area:     { type: String },
  isRead:   { type: Boolean, default: false },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
