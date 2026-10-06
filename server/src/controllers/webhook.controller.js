const webhookService = require('../services/webhook.service');
const logger = require('../utils/logger');

/**
 * GitHub webhook endpoint.
 * Note: The request body is raw (Buffer) because we need it for signature verification.
 * This is configured in app.js before the JSON parser.
 */
exports.handleGitHub = async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const deliveryId = req.headers['x-github-delivery'];
    const eventType = req.headers['x-github-event'];

    if (!deliveryId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required GitHub webhook headers',
        code: 'BAD_WEBHOOK',
      });
    }

    // Verify signature
    const rawBody = req.body;
    if (!webhookService.verifySignature(rawBody, signature)) {
      logger.warn(`Webhook signature verification failed for delivery ${deliveryId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    // Parse the raw body
    const payload = JSON.parse(rawBody.toString());

    logger.info(`Processing webhook: ${eventType} (${deliveryId})`);

    // Process asynchronously — respond to GitHub quickly
    const result = await webhookService.processWebhook(deliveryId, eventType, payload);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Webhook processing error:', error.message);
    // Always respond 200 to prevent GitHub from disabling the webhook
    res.status(200).json({
      success: false,
      message: 'Webhook processing error',
    });
  }
};
