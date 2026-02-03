const { FREE_STORAGE_MB } = require("./pricing.config");

/**
 * Decide if payment is required
 * Require payment if:
 * 1. Already at or over 200MB, OR
 * 2. Adding new project would exceed 200MB
 */
exports.requiresPayment = ({ currentUsageMB, projectSizeMB }) => {
  // If already at/over limit, require payment for any new deployment
  if (currentUsageMB >= FREE_STORAGE_MB) {
    return true;
  }
  
  // If adding new project would exceed limit, require payment
  return currentUsageMB + projectSizeMB > FREE_STORAGE_MB;
};
