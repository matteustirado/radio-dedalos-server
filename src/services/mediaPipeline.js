const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args);
    let err = '';
    p.stderr.on('data', d => err += d.toString());
    p.on('close', code => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}:\n${err}`));
      }
    });
  });
}

async function convertToHls(inputPath, outputDir) {
  ensureDir(outputDir);

  const manifestPath = path.join(outputDir, 'playlist.m3u8');
  const segmentPath = path.join(outputDir, 'segment%03d.ts');

  const args = [
    '-hide_banner',
    '-y',
    '-i', inputPath,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',
    '-preset', 'veryfast',
    '-f', 'hls',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPath,
    manifestPath
  ];

  await runFfmpeg(args);
  return manifestPath;
}

module.exports = { convertToHls, ensureDir };