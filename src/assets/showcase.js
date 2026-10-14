// Compatibility for scripts/prepare-videos.mjs; the application reads GET /api/trends.
// This module contains no second catalog or backend configuration/secrets.
export { showcaseMedia as showcases } from '../../../backend/src/config/showcase-media.js';
