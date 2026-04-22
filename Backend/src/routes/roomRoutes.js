const express = require('express');
const router = express.Router();
const { startMapping, stopMapping, getRooms } = require('../controllers/roomController');

router.post('/start-mapping', startMapping);
router.post('/stop-mapping', stopMapping);
router.get('/', getRooms);

module.exports = router;
