const { z } = require('zod');

// Schema for device registration
const registerDeviceSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'deviceId is required'),
    gatewayId: z.string().min(1, 'gatewayId is required'),
    roomId: z.string().optional().nullable(),
    customName: z.string().optional().nullable(),
  }),
});

// Schema for sensor verification
const verifySensorSchema = z.object({
  body: z.object({
    macAddress: z.string().min(1, 'macAddress is required').regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format'),
  }),
});

/**
 * Middleware factory for validating request parameters against a Zod schema
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errorMessages = err.errors.map((issue) => `${issue.path.join('.')} is ${issue.message}`);
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errorMessages,
      });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = {
  validate,
  registerDeviceSchema,
  verifySensorSchema,
};
