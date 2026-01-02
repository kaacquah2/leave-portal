/**
 * Sync Data Compression
 * 
 * Compresses sync payloads to reduce bandwidth
 * Uses gzip compression for JSON payloads
 * 
 * Benefits:
 * - Reduced bandwidth usage
 * - Faster sync times
 * - Lower data costs
 */

const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Compression configuration
 */
const COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 1024, // Only compress if payload > 1KB
  level: 6, // Compression level (1-9, 6 is good balance)
};

/**
 * Compress data
 * 
 * @param {string|Buffer} data - Data to compress
 * @returns {Promise<Buffer>} Compressed data
 */
async function compress(data) {
  if (!COMPRESSION_CONFIG.enabled) {
    return typeof data === 'string' ? Buffer.from(data) : data;
  }

  // Convert to buffer if string
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

  // Only compress if above threshold
  if (buffer.length < COMPRESSION_CONFIG.threshold) {
    return buffer;
  }

  try {
    const compressed = await gzip(buffer, { level: COMPRESSION_CONFIG.level });
    
    // Only use compressed if it's actually smaller
    if (compressed.length < buffer.length) {
      return compressed;
    }
    
    return buffer;
  } catch (error) {
    console.error('[Compression] Error compressing data:', error);
    return buffer; // Return original on error
  }
}

/**
 * Decompress data
 * 
 * @param {Buffer} compressedData - Compressed data
 * @returns {Promise<Buffer>} Decompressed data
 */
async function decompress(compressedData) {
  if (!Buffer.isBuffer(compressedData)) {
    return compressedData;
  }

  // Check if data is compressed (gzip magic number: 1f 8b)
  if (compressedData[0] !== 0x1f || compressedData[1] !== 0x8b) {
    // Not compressed
    return compressedData;
  }

  try {
    return await gunzip(compressedData);
  } catch (error) {
    console.error('[Compression] Error decompressing data:', error);
    throw error;
  }
}

/**
 * Compress JSON payload
 * 
 * @param {Object} payload - JSON object
 * @returns {Promise<Buffer>} Compressed JSON
 */
async function compressJSON(payload) {
  const jsonString = JSON.stringify(payload);
  return compress(jsonString);
}

/**
 * Decompress JSON payload
 * 
 * @param {Buffer} compressedData - Compressed JSON
 * @returns {Promise<Object>} JSON object
 */
async function decompressJSON(compressedData) {
  const decompressed = await decompress(compressedData);
  const jsonString = decompressed.toString('utf8');
  return JSON.parse(jsonString);
}

/**
 * Get compression stats
 */
function getCompressionStats(originalSize, compressedSize) {
  if (originalSize === 0) return { ratio: 0, savings: 0 };

  const ratio = (compressedSize / originalSize) * 100;
  const savings = originalSize - compressedSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(2);

  return {
    originalSize,
    compressedSize,
    ratio: ratio.toFixed(2),
    savings,
    savingsPercent,
  };
}

/**
 * Update compression configuration
 */
function updateCompressionConfig(newConfig) {
  Object.assign(COMPRESSION_CONFIG, newConfig);
}

module.exports = {
  compress,
  decompress,
  compressJSON,
  decompressJSON,
  getCompressionStats,
  updateCompressionConfig,
  COMPRESSION_CONFIG,
};

