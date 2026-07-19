const express = require('express');
const router  = express.Router();
const { getAll, create, update, remove } = require('../controllers/incidentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',        protect, getAll);
router.post('/',       protect, create);
router.put('/:id',     protect, update);
router.delete('/:id',  protect, remove);

module.exports = router;
