/**
 * incidentController.js - Incident Report Controller
 */
const Incident = require('../models/Incident');

const getAll = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (type   && type   !== 'All') query.type = type;

    const incidents = await Incident.find(query)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const create = async (req, res) => {
  try {
    const { type, location, city, latitude, longitude, description, severity } = req.body;
    if (!type || !location) return res.status(400).json({ success: false, message: 'Type and location required' });
    const incident = await Incident.create({ type, location, city, latitude, longitude, description, severity, reportedBy: req.user._id });
    res.status(201).json({ success: true, data: incident });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const update = async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, data: incident });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

const remove = async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
    res.json({ success: true, message: 'Incident deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

module.exports = { getAll, create, update, remove };
