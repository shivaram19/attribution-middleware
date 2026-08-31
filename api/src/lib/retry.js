/**
 * Retry helper per tech spec section 12.1.
 * Exponential backoff with jitter-free fixed multiplier; only errors whose
 * `code` is in retryableErrors are retried, everything else throws at once.
 */
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2, // exponential
  retryableErrors: [
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "RATE_LIMIT",
    "SERVER_ERROR",
    "SERVICE_UNAVAILABLE"
  ]
};

async function retryWithBackoff(operation, context = "operation", config = RETRY_CONFIG) {
  let attempt = 0;

  while (attempt < config.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      if (!config.retryableErrors.includes(error.code)) {
        throw error; // non-retryable error
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      console.log(`[${context}] Retry ${attempt}/${config.maxRetries} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error(`[${context}] Max retries exceeded`);
}

module.exports = { retryWithBackoff, RETRY_CONFIG };
