const express = require('express');
const router = express.Router();
const { upsertDevice, getDevices, registerDevice } = require('../controllers/deviceController');

router.post('/', upsertDevice);
router.post('/register', registerDevice);
router.get('/', getDevices);

module.exports = router;
