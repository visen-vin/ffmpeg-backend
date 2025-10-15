const { spawn } = require('child_process');
const path = require('path');

function runFFmpegCommand(args, options = {}) {
  return new Promise((resolve) => {
    const logs = [];
    const ffmpeg = spawn(options.bin || 'ffmpeg', ['-y', ...args], {
      cwd: options.cwd || process.cwd(),
    });

    ffmpeg.stdout.on('data', (d) => logs.push(d.toString()));
    ffmpeg.stderr.on('data', (d) => logs.push(d.toString()));

    ffmpeg.on('error', (err) => {
      logs.push(`spawn error: ${err.message}`);
      resolve({ success: false, code: -1, logs });
    });

    ffmpeg.on('close', (code) => {
      resolve({ success: code === 0, code, logs });
    });
  });
}

function imageToVideoArgs(_sessionId, params, outputFilename) {
  const { images = [], duration = 10, fps = 30 } = params || {};
  // Orientation-aware resolution: default to 4K-ish sizes
  // vertical (9:16) → 2160x3840, landscape (16:9) → 3840x2160
  const orientation = (params && typeof params.orientation === 'string')
    ? params.orientation.toLowerCase()
    : 'vertical';
  const defaultRes = orientation === 'landscape' ? '3840x2160' : '2160x3840';
  const resolution = (params && typeof params.resolution === 'string' && params.resolution.match(/^\d+x\d+$/))
    ? params.resolution
    : defaultRes;
  const per = Math.max(1, Math.floor(duration / Math.max(1, images.length)));
  const args = [];
  images.forEach((img) => {
    args.push('-loop', '1', '-t', String(per), '-i', path.join('input', img));
  });
  if (images.length <= 1) {
    args.push('-r', String(fps), '-pix_fmt', 'yuv420p', '-s', resolution, path.join('output', outputFilename));
    return args;
  }
  const [w, h] = resolution.split('x');
  const pre = images
    .map((_img, i) => `[${i}:v]scale=${w}:${h},setsar=1,format=yuv420p[v${i}]`) 
    .join(';');
  const concat = images.map((_img, i) => `[v${i}]`).join('') + `concat=n=${images.length}:v=1:a=0,format=yuv420p[vout]`;
  const filter = `${pre};${concat}`;
  args.push('-filter_complex', filter, '-map', '[vout]', '-r', String(fps), path.join('output', outputFilename));
  return args;
}

function addAudioArgs(_sessionId, params, outputFilename) {
  const { videoFile, audioFile, volume = 1 } = params || {};
  return [
    '-i', path.join('output', videoFile),
    '-i', path.join('input', audioFile),
    '-filter:a', `volume=${volume}`,
    '-c:v', 'copy',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    path.join('output', outputFilename),
  ];
}

function applyEffectsArgs(_sessionId, params, outputFilename) {
  const { videoFile, effects = [] } = params || {};
  const orientation = (params && typeof params.orientation === 'string')
    ? params.orientation.toLowerCase()
    : 'vertical';
  const defaultRes = orientation === 'landscape' ? '3840x2160' : '2160x3840';
  const resolution = (params && typeof params.resolution === 'string' && params.resolution.match(/^\d+x\d+$/))
    ? params.resolution
    : defaultRes;
  const filters = [];
  effects.forEach((e) => {
    if (e.type === 'kenburns') {
      const dir = e.direction === 'zoom-out' ? '-0.001' : '0.001';
      filters.push(`zoompan=z='zoom+${dir}':d=125:s=${resolution}`);
    }
    if (e.type === 'brightness' && typeof e.value === 'number') filters.push(`eq=brightness=${e.value}`);
    if (e.type === 'contrast' && typeof e.value === 'number') filters.push(`eq=contrast=${e.value}`);
    if (e.type === 'blur' && typeof e.value === 'number') filters.push(`gblur=sigma=${e.value}`);
  });
  const vf = filters.join(',') || 'null';
  return ['-i', path.join('output', videoFile), '-vf', vf, path.join('output', outputFilename)];
}

function addOverlayArgs(_sessionId, params, outputFilename) {
  const { videoFile, text = '', subtitle = '' } = params || {};
  const esc = (s) => String(s).replace(/:/g, '\\:').replace(/'/g, "\\'");
  const main = `drawtext=text='${esc(text)}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`;
  const sub = subtitle
    ? `,drawtext=text='${esc(subtitle)}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h-text_h-20`
    : '';
  return ['-i', path.join('output', videoFile), '-vf', `${main}${sub}`, path.join('output', outputFilename)];
}

module.exports = {
  runFFmpegCommand,
  imageToVideoArgs,
  addAudioArgs,
  applyEffectsArgs,
  addOverlayArgs,
};