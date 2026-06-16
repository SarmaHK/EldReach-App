const express = require('express');
const router = express.Router();
const { connectGateway, getGatewayStatus, getAllGateways, registerGatewayManual } = require('../controllers/gatewayController');

// POST /api/gateways/register — manually register a gateway by MAC address
router.post('/register', registerGatewayManual);

// POST /api/gateways/connect — get WebSocket connection info
router.post('/connect', connectGateway);

// GET /api/gateways/status — get current gateway status
router.get('/status', getGatewayStatus);

// GET /api/gateways — list all registered gateways
router.get('/', getAllGateways);

module.exports = router;
