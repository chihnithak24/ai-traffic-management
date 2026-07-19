const Traffic = require('../models/Traffic');
const Notification = require('../models/Notification');

const getAll = async (req, res) => {
  try {
    const { congestionLevel, city, search, page = 1, limit = 100 } = req.query;
    const q = {};
    if (congestionLevel && congestionLevel !== 'All') q.congestionLevel = congestionLevel;
    if (city && city !== 'All') q.city = city;
    if (search) q.areaName = { $regex: search, $options: 'i' };
    const total = await Traffic.countDocuments(q);
    const data  = await Traffic.find(q).sort({ lastUpdated: -1 }).skip((page-1)*limit).limit(+limit);
    res.json({ success: true, count: data.length, total, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getOne = async (req, res) => {
  try {
    const t = await Traffic.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: t });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const create = async (req, res) => {
  try {
    const t = await Traffic.create({ ...req.body, createdBy: req.user._id });
    const io = req.app.get('io');
    io?.to('dashboard').emit('new_location', t);
    // Create notification
    await Notification.create({ title: 'New Location Added', message: `${t.areaName}, ${t.city} added`, type: 'success', area: t.areaName });
    io?.to('dashboard').emit('new_notification', { title: 'New Location', message: `${t.areaName} added` });
    res.status(201).json({ success: true, data: t });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const update = async (req, res) => {
  try {
    let t = await Traffic.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    Object.assign(t, req.body);
    await t.save();
    const io = req.app.get('io');
    io?.to('dashboard').emit('location_updated', t);
    res.json({ success: true, data: t });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const remove = async (req, res) => {
  try {
    const t = await Traffic.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    await t.deleteOne();
    const io = req.app.get('io');
    io?.to('dashboard').emit('location_deleted', { id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const toggleEmergency = async (req, res) => {
  try {
    const t = await Traffic.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: 'Not found' });
    t.isEmergency  = !t.isEmergency;
    t.emergencyType = t.isEmergency ? (req.body.emergencyType || 'Ambulance') : 'None';
    t.signalStatus  = t.isEmergency ? 'Emergency Green' : 'Green';
    await t.save();
    const io = req.app.get('io');
    if (t.isEmergency) {
      await Notification.create({ title: '🚨 Emergency Activated', message: `${t.emergencyType} at ${t.areaName}`, type: 'emergency', area: t.areaName });
      io?.to('dashboard').emit('emergency_alert', { area: t.areaName, type: t.emergencyType });
    }
    res.json({ success: true, data: t });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAll, getOne, create, update, remove, toggleEmergency };
