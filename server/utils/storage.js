const fs = require("fs");
const path = require("path");

/**
 * Recursively calculate folder size in bytes
 */
function getFolderSizeBytes(dir) {
  let total = 0;

  if (!fs.existsSync(dir)) return 0;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      total += getFolderSizeBytes(fullPath);
    } else {
      total += stats.size;
    }
  }

  return total;
}

/**
 * Convert bytes → MB (rounded to 2 decimals)
 */
function bytesToMB(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

exports.getFolderSizeMB = (dir) => {
  const bytes = getFolderSizeBytes(dir);
  return bytesToMB(bytes);
};
