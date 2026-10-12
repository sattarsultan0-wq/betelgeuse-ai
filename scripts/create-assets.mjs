import fs from 'node:fs/promises';
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
await fs.mkdir('public/images', { recursive: true });
await fs.mkdir('public/videos', { recursive: true });
const stars = Array.from(
  { length: 140 },
  (_, i) =>
    `<circle cx="${(i * 197 + 31) % 1600}" cy="${(i * 137 + 67) % 1000}" r="${i % 7 === 0 ? 1.4 : 0.6}" fill="white" opacity="${0.12 + (i % 5) * 0.09}"/>`,
).join('');
const defs = `<defs><radialGradient id="halo"><stop stop-color="#eeeeee" stop-opacity=".5"/><stop offset=".45" stop-color="#999" stop-opacity=".16"/><stop offset="1" stop-color="#050505" stop-opacity="0"/></radialGradient><radialGradient id="planet" cx="30%" cy="20%"><stop stop-color="#272727"/><stop offset=".5" stop-color="#0c0c0c"/><stop offset="1" stop-color="#010101"/></radialGradient><linearGradient id="metal" x2="1" y2="1"><stop stop-color="#050505"/><stop offset=".3" stop-color="#dedede"/><stop offset=".45" stop-color="#222"/><stop offset=".6" stop-color="#888"/><stop offset="1" stop-color="#030303"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
const svg = (art) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">${defs}<rect width="1600" height="1000" fill="#050505"/>${stars}${art}</svg>`;
const eclipse = `<ellipse cx="1120" cy="480" rx="590" ry="470" fill="url(#halo)"/><circle cx="1120" cy="480" r="302" fill="none" stroke="#ddd" stroke-width="6" filter="url(#glow)"/><circle cx="1120" cy="480" r="299" fill="url(#planet)" stroke="#aaa" stroke-width="1.2"/><g transform="rotate(-27 1120 480)"><ellipse cx="1120" cy="480" rx="550" ry="91" fill="none" stroke="#888" stroke-width=".8"/><ellipse cx="1120" cy="480" rx="530" ry="82" fill="none" stroke="#eee" stroke-width="2"/><ellipse cx="1120" cy="480" rx="540" ry="86" fill="none" stroke="#aaa" stroke-width="12" opacity=".2" filter="url(#glow)"/></g><circle cx="1370" cy="318" r="4" fill="white"/><path d="M1370 280v76M1332 318h76" stroke="#ccc" stroke-width=".6"/>`;
await fs.writeFile('public/images/hero.svg', svg(eclipse));
await sharp(Buffer.from(svg(eclipse)))
  .resize(1600, 1000)
  .webp({ quality: 86 })
  .toFile('public/images/hero.webp');
const arts = [
  `<circle cx="800" cy="500" r="290" fill="url(#planet)" stroke="#ddd" stroke-width="3"/><ellipse cx="800" cy="500" rx="600" ry="100" transform="rotate(-23 800 500)" fill="none" stroke="#ccc" stroke-width="5"/>`,
  Array.from(
    { length: 17 },
    (_, i) =>
      `<ellipse cx="800" cy="500" rx="${90 + i * 27}" ry="${180 + i * 16}" transform="rotate(${i * 7} 800 500)" fill="none" stroke="${i % 3 ? '#888' : '#eee'}" stroke-width="${i % 3 ? 3 : 7}"/>`,
  ).join(''),
  `<path d="M0 760 250 470 390 570 760 130 970 560 1160 350 1600 730V1000H0Z" fill="url(#metal)"/><path d="m450 1000 320-590 95 590" fill="#030303"/><circle cx="1140" cy="220" r="80" fill="#bbb" opacity=".6"/>`,
  `<circle cx="800" cy="500" r="390" fill="url(#halo)"/>${Array.from({ length: 10 }, (_, i) => `<rect x="${470 + i * 21}" y="${170 + i * 27}" width="${660 - i * 42}" height="${660 - i * 54}" rx="${140 - i * 10}" fill="none" stroke="url(#metal)" stroke-width="24" transform="rotate(${i * 7} 800 500)"/>`).join('')}`,
  `<path d="M0 800Q300 450 650 750T1600 560V1000H0Z" fill="url(#metal)"/>${Array.from({ length: 11 }, (_, i) => `<path d="M0 ${710 + i * 24}Q380 ${500 + i * 13} 800 ${720 + i * 18}T1600 ${680 + i * 19}" fill="none" stroke="#888" stroke-width="2"/>`).join('')}<circle cx="850" cy="280" r="150" fill="url(#planet)" stroke="#ddd" stroke-width="2"/>`,
  `<ellipse cx="800" cy="500" rx="400" ry="420" fill="url(#halo)"/><path d="M780 80 1080 470 810 910 500 530Z" fill="url(#metal)"/><path d="m780 80 30 830M500 530l580-60M780 80l300 390" fill="none" stroke="#ddd" stroke-width="2"/>`,
];
for (let i = 0; i < arts.length; i++)
  await sharp(Buffer.from(svg(arts[i])))
    .resize(720, 450)
    .webp({ quality: 82 })
    .toFile(`public/images/scene-${i + 1}.webp`);
await fs.writeFile(
  'public/images/star.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#050505"/><path d="M32 6 37 27 58 32 37 37 32 58 27 37 6 32 27 27Z" fill="white"/></svg>',
);
// Original artwork + periodic exposure: a seamless six-second loop, no third-party footage.
const result = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-loop',
    '1',
    '-i',
    'public/images/hero.webp',
    '-t',
    '6',
    '-r',
    '24',
    '-vf',
    "scale=1280:800,eq=brightness='0.008*sin(2*PI*t/6)':eval=frame",
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '29',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    'public/videos/hero.mp4',
  ],
  { stdio: 'ignore' },
);
console.log(
  result.status === 0
    ? 'Original images and hero video created.'
    : 'Images created. ffmpeg unavailable: hero uses its poster.',
);
