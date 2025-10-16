const emoji = require('node-emoji');

/**
 * Sanitizes text for safe use in SVG
 * @param {string} str - Text to sanitize
 * @returns {string} - Sanitized text
 */
const sanitizeForSvg = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Processes emojis in text using node-emoji
 * @param {string} text - Text that may contain emoji shortcodes
 * @returns {string} - Text with emojis converted
 */
const processEmojis = (text) => {
  if (!text) return '';
  return emoji.emojify(text);
};

/**
 * Wraps text to fit within specified character limit per line
 * @param {string} text - Text to wrap
 * @param {number} maxCharsPerLine - Maximum characters per line
 * @returns {string[]} - Array of wrapped lines
 */
const wrapText = (text, maxCharsPerLine) => {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is longer than max chars, break it
        lines.push(word.substring(0, maxCharsPerLine));
        currentLine = word.substring(maxCharsPerLine);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Enforces maximum line limit with ellipsis
 * @param {string[]} lines - Array of text lines
 * @param {number} maxLines - Maximum number of lines (default: 5)
 * @returns {string[]} - Truncated lines with ellipsis if needed
 */
const enforceLineLimit = (lines, maxLines = 5) => {
  if (!lines || lines.length <= maxLines) return lines;
  
  const truncatedLines = lines.slice(0, maxLines);
  const lastIdx = maxLines - 1;
  truncatedLines[lastIdx] = `${truncatedLines[lastIdx]}…`;
  
  return truncatedLines;
};

/**
 * Calculates layout dimensions based on canvas size and style
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {string} style - Style type ('reference' or 'dark')
 * @returns {object} - Layout calculations
 */
const calculateLayout = (canvasWidth, canvasHeight, style = 'reference') => {
  const isReference = style === 'reference';
  
  // Side margins
  const sideMarginRatio = isReference ? 0.08 : 0.15;
  const sideMargin = Math.round(canvasWidth * sideMarginRatio);
  const textAreaWidth = canvasWidth - (2 * sideMargin);
  
  // Font sizes
  const fontSizeDivisor = isReference ? 19 : 20;
  const fontSize = Math.round(textAreaWidth / fontSizeDivisor);
  const attrFontSize = Math.round(fontSize * (isReference ? 0.8 : 0.7));
  
  // Line spacing
  const lineSpacing = fontSize + 10;
  
  // Text positioning
  const textCenterX = Math.round(canvasWidth / 2);
  
  let mainTextTop, attributionY, headerHeight = 0;
  
  if (isReference) {
    // Reference style positioning
    const topPaddingRatio = 0.10;
    const bottomPaddingRatio = 0.025;
    mainTextTop = Math.round(canvasHeight * topPaddingRatio);
    
    // Calculate attribution position (will be adjusted based on actual line count)
    const maxLines = 5;
    const lastLineY = mainTextTop + ((maxLines - 1) * lineSpacing) + fontSize;
    const attrGap = Math.round(fontSize * 0.25);
    attributionY = lastLineY + attrGap;
    
    // Header height calculation
    const bottomPaddingPx = Math.round(canvasHeight * bottomPaddingRatio);
    const headerHeightRaw = attributionY + attrFontSize + bottomPaddingPx;
    const maxHeaderPx = Math.round(canvasHeight * 0.32);
    headerHeight = Math.min(headerHeightRaw, maxHeaderPx);
    
    // Ensure even height for YUV420 compatibility
    if (headerHeight % 2 !== 0) headerHeight -= 1;
  } else {
    // Dark style positioning
    const baseDarkTop = 1200; // Base position for 1920px height
    mainTextTop = Math.round((baseDarkTop * (canvasHeight / 1920)) - fontSize);
    
    // Attribution positioned below main text
    const maxLines = 5;
    const lastLineY = mainTextTop + ((maxLines - 1) * lineSpacing) + fontSize;
    const attrGap = Math.round(fontSize * 0.25);
    attributionY = lastLineY + attrGap;
  }
  
  return {
    canvasWidth,
    canvasHeight,
    sideMargin,
    textAreaWidth,
    fontSize,
    attrFontSize,
    lineSpacing,
    textCenterX,
    mainTextTop,
    attributionY,
    headerHeight,
    style
  };
};

/**
 * Calculates maximum characters per line based on font size
 * @param {number} textAreaWidth - Available width for text
 * @param {number} fontSize - Font size in pixels
 * @returns {number} - Maximum characters per line
 */
const calculateMaxCharsPerLine = (textAreaWidth, fontSize) => {
  return Math.floor(textAreaWidth / (fontSize * 0.6));
};

/**
 * Processes text for overlay generation
 * @param {string} text - Main text content
 * @param {string} attribution - Attribution text
 * @param {object} layout - Layout calculations
 * @returns {object} - Processed text data
 */
const processTextForOverlay = (text, attribution, layout) => {
  // Process emojis
  const processedText = processEmojis(text || '');
  const processedAttribution = processEmojis(attribution || '');
  
  // Calculate text wrapping
  const maxCharsPerLine = calculateMaxCharsPerLine(layout.textAreaWidth, layout.fontSize);
  const wrappedLines = wrapText(processedText, maxCharsPerLine);
  const finalLines = enforceLineLimit(wrappedLines, 5);
  
  // Adjust attribution position based on actual line count
  const actualLineCount = finalLines.length;
  const lastLineY = layout.mainTextTop + ((actualLineCount - 1) * layout.lineSpacing) + layout.fontSize;
  const attrGap = Math.round(layout.fontSize * 0.25);
  const adjustedAttributionY = lastLineY + attrGap;
  
  return {
    lines: finalLines.map(line => sanitizeForSvg(line)),
    attribution: sanitizeForSvg(processedAttribution),
    lineCount: actualLineCount,
    attributionY: adjustedAttributionY
  };
};

module.exports = {
  sanitizeForSvg,
  processEmojis,
  wrapText,
  enforceLineLimit,
  calculateLayout,
  calculateMaxCharsPerLine,
  processTextForOverlay
};