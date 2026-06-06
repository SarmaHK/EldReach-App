const express = require('express');
const router = express.Router();
const { connectGateway, getGatewayStatus, getAllGateways } = require('../controllers/gatewayController');

// POST /api/gateways/connect — get WebSocket connection info
router.post('/connect', connectGateway);

// GET /api/gateways/status — get current gateway status
router.get('/status', getGatewayStatus);

// GET /api/gateways — list all registered gateways
router.get('/', getAllGateways);

module.exports = router;
