const { spawn } = require('child_process');

function runFFmpegCommand(args, options = {}) {
  return new Promise((resolve) => {
    const logs = [];
    const ffmpeg = spawn(options.bin || 'ffmpeg', args, {
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

module.exports = { runFFmpegCommand };