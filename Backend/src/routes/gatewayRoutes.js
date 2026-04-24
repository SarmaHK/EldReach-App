const express = require('express');
const router = express.Router();
const { scanGateway, getGatewayStatus } = require('../controllers/gatewayController');

// POST /api/gateway/scan — trigger mDNS scan for gateway
router.post('/scan', scanGateway);

// GET /api/gateway/status — get current gateway status
router.get('/status', getGatewayStatus);

module.exports = router;
