import { createVercelConfig } from './scripts/vercel-config.js';

// Vercel reads this before deploying routes. npm run build remains usable locally.
export const config = createVercelConfig(process.env.BACKEND_ORIGIN);
