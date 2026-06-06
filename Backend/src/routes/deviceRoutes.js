const express = require('express');
const router = express.Router();
const { getDevices, registerDevice, renameDevice, deleteDevice } = require('../controllers/deviceController');
const { verifySensor } = require('../controllers/verifyController');

const { strictLimiter } = require('../middleware/rateLimiter');
const { validate, registerDeviceSchema, verifySensorSchema } = require('../middleware/validate');

router.post('/register', strictLimiter, validate(registerDeviceSchema), registerDevice);
router.post('/verify', strictLimiter, validate(verifySensorSchema), verifySensor);
router.get('/', getDevices);
router.patch('/:deviceId', renameDevice);
router.delete('/:deviceId', deleteDevice);

module.exports = router;
