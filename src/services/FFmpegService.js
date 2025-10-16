const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const ffprobePath = require('ffprobe-static').path;
const sharp = require('sharp');
const { generateTopPanelOverlay } = require('../utils/svgGenerator');

ffmpeg.setFfprobePath(ffprobePath);

function getJobDuration(job) {
  return new Promise((resolve, reject) => {
    if (job.operation === 'image-to-video') {
      const { duration = 10 } = job.params || {};
      return resolve(duration);
    }
    const inputFile = job.params.videoFile;
    if (!inputFile) return resolve(0);
    const inputPath = path.join(job.cwd, 'output', inputFile);
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

function runFFmpegCommand(args, options = {}, onProgress) {
  return new Promise((resolve) => {
    const logs = [];
    const ffmpegProc = spawn(options.bin || 'ffmpeg', ['-y', ...args], {
      cwd: options.cwd || process.cwd(),
    });

    let duration = 0;
    if (options.job) {
      getJobDuration(options.job)
        .then((d) => (duration = d))
        .catch(() => {});
    }

    const onData = (data) => {
      const logLine = data.toString();
      logs.push(logLine);
      if (!onProgress || !duration) return;
      const timeMatch = logLine.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (!timeMatch) return;
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const s = parseInt(timeMatch[3], 10);
      const ms = parseInt(timeMatch[4], 10);
      const currentTime = h * 3600 + m * 60 + s + ms / 100;
      const progress = Math.min(100, Math.round((currentTime / duration) * 100));
      onProgress(progress);
    };

    ffmpegProc.stdout.on('data', onData);
    ffmpegProc.stderr.on('data', onData);

    ffmpegProc.on('error', (err) => {
      logs.push(`spawn error: ${err.message}`);
      resolve({ success: false, code: -1, logs });
    });

    ffmpegProc.on('close', (code) => {
      resolve({ success: code === 0, code, logs });
    });
  });
}

function imageToVideoArgs(_sessionId, params, outputFilename) {
  const { images = [], duration = 10, fps = 30 } = params || {};
  // Enforce vertical 4K (9:16) always
  const resolution = '2160x3840';
  const [w, h] = resolution.split('x');
  const per = Math.max(1, Math.floor(duration / Math.max(1, images.length)));
  const args = [];
  images.forEach((img) => {
    args.push('-loop', '1', '-t', String(per), '-i', path.join('input', img));
  });

  // Build scaling filter that preserves aspect ratio and pads to 9:16
  const scalePad = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p`;

  if (images.length <= 1) {
    args.push(
      '-vf', scalePad,
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      path.join('output', outputFilename)
    );
    return args;
  }

  const pre = images
    .map((_img, i) => `[${i}:v]${scalePad}[v${i}]`)
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

function jobCleanupArgs() {
  return [];
}

module.exports = {
  runFFmpegCommand,
  imageToVideoArgs,
  addAudioArgs,
  applyEffectsArgs,
  jobCleanupArgs,
  getJobDuration,
  addTextOverlayArgs,
  cleanupOverlayFiles,
  getVideoDimensions,
};

/**
 * Gets video dimensions using ffprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<{width: number, height: number}>} - Video dimensions
 */
function getVideoDimensions(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }
      
      resolve({
        width: videoStream.width,
        height: videoStream.height
      });
    });
  });
}

/**
 * Generates text overlay arguments for FFmpeg
 * @param {string} sessionId - Session ID
 * @param {object} params - Overlay parameters
 * @param {string} outputFilename - Output filename
 * @returns {Promise<string[]>} - FFmpeg arguments
 */
async function addTextOverlayArgs(sessionId, params, outputFilename) {
  const { videoFile, text, subtitle = '', position = 'top', overlayRatio } = params;
  
  if (!videoFile || !text) {
    throw new Error('videoFile and text are required');
  }
  
  const sessionPath = path.join(process.cwd(), 'storage', 'sessions', sessionId);
  const inputPath = path.join(sessionPath, 'output', videoFile);
  const outputPath = path.join(sessionPath, 'output', outputFilename);
  
  // Create temp directory for overlay files
  const tempDir = path.join(sessionPath, 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    // Get video dimensions
    const { width, height } = await getVideoDimensions(inputPath);

    // Generate top panel overlay using provided ratio (default 0.30)
    const ratio = (typeof overlayRatio === 'number' && overlayRatio > 0 && overlayRatio < 1) ? overlayRatio : 0.30;
    const svgContent = generateTopPanelOverlay(text, subtitle, width, height, ratio);
    
    // Create temporary SVG file
    const svgPath = path.join(tempDir, `overlay-${Date.now()}.svg`);
    await fs.writeFile(svgPath, svgContent);
    
    // Convert SVG to PNG using Sharp
    const pngPath = path.join(tempDir, `overlay-${Date.now()}.png`);
    await sharp(Buffer.from(svgContent))
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(pngPath);
    
    // Clean up SVG file
    await fs.unlink(svgPath);
    
    // Return FFmpeg arguments for overlay composition
    return [
      '-i', inputPath,           // Input video
      '-i', pngPath,             // Overlay PNG (top panel)
      '-filter_complex', '[0:v][1:v]overlay=0:0',  // Anchor overlay at top-left
      '-c:a', 'copy',            // Copy audio
      '-c:v', 'libx264',         // Video codec
      '-preset', 'medium',       // Encoding preset
      '-crf', '20',              // Quality setting
      '-pix_fmt', 'yuv420p',     // Pixel format
      '-movflags', '+faststart', // Optimize for web streaming
      outputPath
    ];
    
  } catch (error) {
    // Clean up temp directory on error
    try {
      const tempFiles = await fs.readdir(tempDir);
      await Promise.all(tempFiles.map(file => fs.unlink(path.join(tempDir, file))));
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError.message);
    }
    throw error;
  }
}

/**
 * Cleans up temporary overlay files after processing
 * @param {string} sessionId - Session ID
 */
async function cleanupOverlayFiles(sessionId) {
  const tempDir = path.join(process.cwd(), 'storage', 'sessions', sessionId, 'temp');
  
  try {
    const files = await fs.readdir(tempDir);
    const overlayFiles = files.filter(file => file.startsWith('overlay-') && file.endsWith('.png'));
    
    await Promise.all(overlayFiles.map(file => 
      fs.unlink(path.join(tempDir, file)).catch(() => {})
    ));
  } catch (error) {
    // Ignore cleanup errors
    console.warn('Failed to cleanup overlay files:', error.message);
  }
}