import { spawn } from 'node:child_process';
import { stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { showcases } from '../src/assets/showcase.js';
import { heroMedia } from '../src/assets/media.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
function localFile(url) {
  if (!url?.startsWith('/') || url.startsWith('//'))
    throw new Error(`Expected a local URL: ${url}`);
  const filename = path.resolve(publicDir, `.${url}`);
  const relative = path.relative(publicDir, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Path outside public/');
  return filename;
}
function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    child.on('error', () =>
      reject(new Error('Install FFmpeg and add it to PATH before npm run videos:prepare.')),
    );
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)),
    );
  });
}

try {
  for (const item of [heroMedia, ...showcases.filter((item) => item.sourceVideo)]) {
    const input = localFile(item.sourceVideo),
      output = localFile(item.video),
      poster = localFile(item.poster);
    if (input === output || output === poster)
      throw new Error('Original, video and poster paths must differ.');
    const original = await stat(input);
    const current = await stat(output).catch(() => null);
    await mkdir(path.dirname(output), { recursive: true });
    await mkdir(path.dirname(poster), { recursive: true });
    if (!current || current.mtimeMs < original.mtimeMs || process.argv.includes('--force')) {
      console.log(`H.264: ${item.sourceVideo} → ${item.video}`);
      const size = item === heroMedia ? '1280:720' : '720:1280';
      await ffmpeg([
        '-y',
        '-i',
        input,
        '-map',
        '0:v:0',
        '-an',
        '-vf',
        `scale=${size}:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30`,
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        item === heroMedia ? '28' : '25',
        '-maxrate',
        item === heroMedia ? '1200k' : '1600k',
        '-bufsize',
        item === heroMedia ? '2400k' : '3200k',
        '-profile:v',
        'main',
        '-level:v',
        '3.1',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-map_metadata',
        '-1',
        output,
      ]);
    }
    const posterFile = await stat(poster).catch(() => null);
    const videoFile = await stat(output);
    if (!posterFile || posterFile.mtimeMs < videoFile.mtimeMs || process.argv.includes('--force')) {
      await ffmpeg([
        '-y',
        '-ss',
        '0.5',
        '-i',
        output,
        '-frames:v',
        '1',
        '-c:v',
        'libwebp',
        '-quality',
        '80',
        poster,
      ]);
    }
  }
  console.log('Videos and image posters are ready. Original files were preserved.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
