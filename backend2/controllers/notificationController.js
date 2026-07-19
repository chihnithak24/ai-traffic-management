const Notification = require('../models/Notification');

const getAll = async (req, res) => {
  try {
    const { unread } = req.query;
    const q = unread === 'true' ? { isRead: false } : {};
    const data = await Notification.find(q).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    res.json({ success: true, data, unreadCount });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const markRead = async (req, res) => {
  try {
    await Notification.updateMany({}, { isRead: true });
    res.json({ success: true, message: 'All marked as read' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteAll = async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ success: true, message: 'Cleared' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAll, markRead, deleteAll };
