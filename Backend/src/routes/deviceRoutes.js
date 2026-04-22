const express = require('express');
const router = express.Router();
const { upsertDevice, getDevices } = require('../controllers/deviceController');

router.post('/', upsertDevice);
router.get('/', getDevices);

module.exports = router;
