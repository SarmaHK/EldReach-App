const express = require('express');
const router = express.Router();
const { handleIncomingTelemetry, getDevices, registerDevice, renameDevice, deleteDevice } = require('../controllers/deviceController');
const { verifySensor } = require('../controllers/verifyController');

router.post('/', handleIncomingTelemetry);
router.post('/register', registerDevice);
router.post('/verify', verifySensor);
router.get('/', getDevices);
router.patch('/:deviceId', renameDevice);
router.delete('/:deviceId', deleteDevice);

module.exports = router;
