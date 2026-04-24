const express = require('express');
const router = express.Router();
const { scanGateway } = require('../controllers/gatewayController');

// POST /api/gateway/scan — trigger mDNS scan for gateway
router.post('/scan', scanGateway);

module.exports = router;
