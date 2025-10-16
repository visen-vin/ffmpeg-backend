const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  getSessionDir,
  getInputDir,
  getOutputDir,
} = require('../utils/sessionPaths');

function writeJob(sessionId, operation, params, outputFilename) {
  const jobId = `job-${uuidv4().slice(0, 8)}`;
  const sessionDir = getSessionDir(sessionId);
  const queueDir = path.join(sessionDir, 'queue');
  if (!fs.existsSync(queueDir)) fs.mkdirSync(queueDir, { recursive: true });
  const job = {
    jobId,
    sessionId,
    operation,
    params,
    outputFilename,
    status: 'queued',
    createdAt: new Date().toISOString(),
    cwd: sessionDir,
  };
  fs.writeFileSync(path.join(queueDir, `${jobId}.json`), JSON.stringify(job));
  return job;
}

function imageToVideo(req, res) {
  const { sessionId, images, duration, orientation, resolution } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId in body' });
  if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: 'images[] required' });
  const inputDir = getInputDir(sessionId);
  for (const f of images) {
    if (!fs.existsSync(path.join(inputDir, f))) return res.status(404).json({ error: `Missing input file ${f}` });
  }
  const outputFilename = `${uuidv4().slice(0, 8)}.mp4`;
  // Normalize orientation: default vertical; allow 'landscape'
  const normOrientation = orientation === 'landscape' ? 'landscape' : 'vertical';
  const params = { images, duration: Number(duration) || 10, orientation: normOrientation };
  if (typeof resolution === 'string' && resolution.match(/^\d+x\d+$/)) params.resolution = resolution;
  const job = writeJob(sessionId, 'image-to-video', params, outputFilename);
  return res.status(202).json({ jobId: job.jobId, status: job.status, outputFilename });
}

function addAudio(req, res) {
  const { sessionId, videoFile, audioFile, volume } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId in body' });
  const outDir = getOutputDir(sessionId);
  const inDir = getInputDir(sessionId);
  if (!videoFile || !fs.existsSync(path.join(outDir, videoFile))) return res.status(404).json({ error: 'videoFile not found' });
  if (!audioFile || !fs.existsSync(path.join(inDir, audioFile))) return res.status(404).json({ error: 'audioFile not found' });
  const outputFilename = `${uuidv4().slice(0, 8)}.mp4`;
  const job = writeJob(sessionId, 'add-audio', { videoFile, audioFile, volume: Number(volume) || 1 }, outputFilename);
  return res.status(202).json({ jobId: job.jobId, status: job.status, outputFilename });
}

function applyEffects(req, res) {
  const { sessionId, videoFile, effects } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId in body' });
  const outDir = getOutputDir(sessionId);
  if (!fs.existsSync(path.join(outDir, videoFile))) return res.status(404).json({ error: `Missing output file ${videoFile}` });
  if (!Array.isArray(effects) || effects.length === 0) return res.status(400).json({ error: 'effects[] required' });
  const outputFilename = `${uuidv4().slice(0, 8)}.mp4`;
  const params = { videoFile, effects };
  const job = writeJob(sessionId, 'apply-effects', params, outputFilename);
  return res.status(202).json({ jobId: job.jobId, status: job.status, outputFilename });
}

function addTextOverlay(req, res) {
  const { sessionId, videoFile, text, subtitle, position } = req.body || {};
  
  // Validate required fields
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId in body' });
  }
  
  if (!videoFile) {
    return res.status(400).json({ error: 'Missing videoFile in body' });
  }
  
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or invalid text in body' });
  }
  
  // Validate text length
  if (text.length > 500) {
    return res.status(400).json({ error: 'Text must be 500 characters or less' });
  }
  
  // Validate subtitle if provided
  if (subtitle && (typeof subtitle !== 'string' || subtitle.length > 100)) {
    return res.status(400).json({ error: 'Subtitle must be a string of 100 characters or less' });
  }
  
  // Validate position if provided
  const validPositions = ['top', 'center', 'bottom'];
  if (position && !validPositions.includes(position)) {
    return res.status(400).json({ error: 'Position must be one of: top, center, bottom' });
  }
  
  // Check if video file exists
  const outDir = getOutputDir(sessionId);
  const videoPath = path.join(outDir, videoFile);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: `Video file ${videoFile} not found` });
  }
  
  // Generate output filename
  const outputFilename = `${uuidv4().slice(0, 8)}.mp4`;
  
  // Create job parameters
  const params = {
    videoFile,
    text: text.trim(),
    subtitle: subtitle ? subtitle.trim() : '',
    position: position || 'top'
  };
  
  // Create and queue the job
  const job = writeJob(sessionId, 'add-text-overlay', params, outputFilename);
  
  return res.status(202).json({
    jobId: job.jobId,
    status: job.status,
    outputFilename,
    message: 'Text overlay job queued successfully'
  });
}

module.exports = { 
  imageToVideo, 
  addAudio, 
  applyEffects, 
  addTextOverlay 
};