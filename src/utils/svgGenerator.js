const emoji = require('node-emoji');

/**
 * Generates SVG overlay for text rendering
 * @param {object} textData - Processed text data
 * @param {object} layout - Layout calculations
 * @returns {string} - SVG markup
 */
const generateOverlaySVG = (textData, layout) => {
  const { lines, attribution, attributionY } = textData;
  const { 
    canvasWidth, 
    canvasHeight, 
    fontSize, 
    attrFontSize, 
    lineSpacing, 
    textCenterX, 
    mainTextTop, 
    headerHeight,
    style 
  } = layout;
  
  const isReference = style === 'reference';
  
  // Generate CSS styles based on style type
  const styles = generateStyles(fontSize, attrFontSize, isReference);
  
  // Generate background elements
  const background = generateBackground(canvasWidth, canvasHeight, headerHeight, isReference);
  
  // Generate main text elements
  const mainTextElements = generateMainText(lines, textCenterX, mainTextTop, lineSpacing);
  
  // Generate attribution text element
  const attributionElement = generateAttributionText(attribution, textCenterX, attributionY, isReference);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      <![CDATA[
        ${styles}
      ]]>
    </style>
  </defs>
  
  ${background}
  ${mainTextElements}
  ${attributionElement}
</svg>`;
};

/**
 * Generates CSS styles for text elements
 * @param {number} fontSize - Main text font size
 * @param {number} attrFontSize - Attribution font size
 * @param {boolean} isReference - Whether using reference style
 * @returns {string} - CSS styles
 */
const generateStyles = (fontSize, attrFontSize, isReference) => {
  if (isReference) {
    return `
      .main-text { 
        font-family: "Georgia", "Times New Roman", serif; 
        font-size: ${fontSize}px; 
        font-weight: normal; 
        fill: black; 
        text-anchor: middle; 
      }
      
      .attr-text { 
        font-family: "Georgia", "Times New Roman", serif; 
        font-size: ${attrFontSize}px; 
        font-weight: bold; 
        fill: #FF8F00; 
        text-anchor: middle; 
      }
    `;
  } else {
    return `
      .main-text { 
        font-family: "Roboto", "Noto Color Emoji", "Helvetica", sans-serif; 
        font-size: ${fontSize}px; 
        font-weight: bold; 
        fill: white; 
        text-anchor: middle; 
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8)); 
      }
      
      .attr-text { 
        font-family: "Roboto", "Noto Color Emoji", "Helvetica", sans-serif; 
        font-size: ${attrFontSize}px; 
        font-weight: bold; 
        fill: #FFA500; 
        text-anchor: middle; 
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.7)); 
      }
    `;
  }
};

/**
 * Generates background elements
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} headerHeight - Header height (for reference style)
 * @param {boolean} isReference - Whether using reference style
 * @returns {string} - Background SVG elements
 */
const generateBackground = (canvasWidth, canvasHeight, headerHeight, isReference) => {
  if (isReference) {
    // White header background for reference style
    return `<rect x="0" y="0" width="${canvasWidth}" height="${headerHeight}" fill="white"/>`;
  } else {
    // Semi-transparent dark background for dark style
    const padding = Math.round(canvasWidth * 0.05);
    const rectWidth = canvasWidth - (2 * padding);
    const rectHeight = Math.round(canvasHeight * 0.3);
    const rectX = padding;
    const rectY = Math.round((canvasHeight - rectHeight) / 2);
    
    return `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="rgba(0,0,0,0.4)" rx="10"/>`;
  }
};

/**
 * Generates main text elements with proper line spacing
 * @param {string[]} lines - Text lines to render
 * @param {number} textCenterX - Horizontal center position
 * @param {number} mainTextTop - Top position for first line
 * @param {number} lineSpacing - Spacing between lines
 * @returns {string} - Main text SVG elements
 */
const generateMainText = (lines, textCenterX, mainTextTop, lineSpacing) => {
  if (!lines || lines.length === 0) return '';
  
  const tspans = lines.map((line, index) => {
    const y = mainTextTop + (index * lineSpacing);
    return `    <tspan x="${textCenterX}" y="${y}">${line}</tspan>`;
  }).join('\n');
  
  return `  <text class="main-text">
${tspans}
  </text>`;
};

/**
 * Generates attribution text element
 * @param {string} attribution - Attribution text
 * @param {number} textCenterX - Horizontal center position
 * @param {number} attributionY - Vertical position
 * @param {boolean} isReference - Whether using reference style
 * @returns {string} - Attribution text SVG element
 */
const generateAttributionText = (attribution, textCenterX, attributionY, isReference) => {
  if (!attribution) return '';
  
  // Format attribution based on style
  const formattedAttribution = isReference ? attribution : `- ${attribution} -`;
  
  return `  <text class="attr-text" x="${textCenterX}" y="${attributionY}">${formattedAttribution}</text>`;
};

/**
 * Generates a complete overlay SVG with automatic layout calculation
 * @param {string} text - Main text content
 * @param {string} attribution - Attribution text
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {string} style - Style type ('reference' or 'dark')
 * @returns {string} - Complete SVG markup
 */
const generateCompleteOverlay = (text, attribution, canvasWidth, canvasHeight, style = 'reference') => {
  const { calculateLayout, processTextForOverlay } = require('./textProcessing');
  
  // Calculate layout
  const layout = calculateLayout(canvasWidth, canvasHeight, style);
  
  // Process text
  const textData = processTextForOverlay(text, attribution, layout);
  
  // Generate SVG
  return generateOverlaySVG(textData, layout);
}

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
 * Processes emojis in text
 * @param {string} text - Text that may contain emoji shortcodes
 * @returns {string} - Text with emojis converted
 */
const processEmojis = (text) => {
  if (!text) return '';
  return emoji.emojify(text);
};

/**
 * Calculates responsive font size based on video width
 * @param {number} videoWidth - Width of the video
 * @returns {number} - Calculated font size
 */
const calculateFontSize = (videoWidth) => {
  // Base font size calculation - responsive to video width
  const baseFontSize = Math.max(24, Math.min(72, videoWidth / 25));
  return Math.round(baseFontSize);
};

/**
 * Generates a simple, clean text overlay SVG matching the user's screenshot
 * @param {string} text - Main text to display
 * @param {string} subtitle - Optional subtitle text
 * @param {number} videoWidth - Width of the video
 * @param {number} videoHeight - Height of the video
 * @param {string} position - Position of overlay ('top', 'center', 'bottom')
 * @returns {string} - SVG markup
 */
const generateSimpleOverlay = (text, subtitle = '', videoWidth = 1920, videoHeight = 1080, position = 'top') => {
  // Process text
  const processedText = sanitizeForSvg(processEmojis(text));
  const processedSubtitle = sanitizeForSvg(processEmojis(subtitle));
  
  // Calculate dimensions
  const fontSize = calculateFontSize(videoWidth);
  const subtitleFontSize = Math.round(fontSize * 0.7);
  const padding = Math.round(fontSize * 0.8);
  
  // Calculate text positioning
  const centerX = videoWidth / 2;
  let overlayY;
  
  switch (position) {
    case 'center':
      overlayY = videoHeight / 2;
      break;
    case 'bottom':
      overlayY = videoHeight - (padding * 3);
      break;
    case 'top':
    default:
      overlayY = padding * 2;
      break;
  }
  
  // Calculate background bar dimensions
  const textWidth = Math.max(
    processedText.length * fontSize * 0.6,
    processedSubtitle.length * subtitleFontSize * 0.6
  );
  const barWidth = Math.min(videoWidth * 0.9, textWidth + padding * 2);
  const barHeight = subtitle ? fontSize + subtitleFontSize + padding * 1.5 : fontSize + padding;
  
  const barX = (videoWidth - barWidth) / 2;
  const barY = overlayY - padding * 0.5;
  
  // Text positions
  const mainTextY = overlayY + fontSize * 0.3;
  const subtitleY = subtitle ? mainTextY + fontSize * 0.8 : mainTextY;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${videoWidth}" height="${videoHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      <![CDATA[
        .overlay-bg {
          fill: rgba(0, 0, 0, 0.8);
          rx: 8;
        }
        .main-text {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: ${fontSize}px;
          font-weight: bold;
          fill: white;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .subtitle-text {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: ${subtitleFontSize}px;
          font-weight: normal;
          fill: #ff6b35;
          text-anchor: middle;
          dominant-baseline: middle;
        }
      ]]>
    </style>
  </defs>
  
  <!-- Background bar -->
  <rect class="overlay-bg" x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" />
  
  <!-- Main text -->
  <text class="main-text" x="${centerX}" y="${mainTextY}">${processedText}</text>
  
  ${subtitle ? `<!-- Subtitle text -->
  <text class="subtitle-text" x="${centerX}" y="${subtitleY}">${processedSubtitle}</text>` : ''}
</svg>`;
};

/**
 * Generates overlay for the specific use case shown in user's screenshot
 * @param {string} text - Main text (e.g., "Testing workflow")
 * @param {string} subtitle - Subtitle text (e.g., "TraeAI")
 * @param {number} videoWidth - Video width
 * @param {number} videoHeight - Video height
 * @returns {string} - SVG markup
 */
const generateWorkflowOverlay = (text, subtitle, videoWidth = 1920, videoHeight = 1080) => {
  return generateSimpleOverlay(text, subtitle, videoWidth, videoHeight, 'top');
};

module.exports = {
  generateSimpleOverlay,
  generateWorkflowOverlay,
  calculateFontSize,
  sanitizeForSvg,
  processEmojis
};

/**
 * Generates a fixed-height top panel overlay (white background, black text, saffron attribution)
 * covering a ratio of the video height from the top.
 * @param {string} text - Main text content
 * @param {string} attribution - Attribution text (e.g., author/source)
 * @param {number} canvasWidth - Video width
 * @param {number} canvasHeight - Video height
 * @param {number} ratio - Height ratio of the overlay panel (default 0.30)
 * @returns {string} - Complete SVG markup
 */
const generateTopPanelOverlay = (text, attribution, canvasWidth, canvasHeight, ratio = 0.30) => {
  const { calculateLayout, processTextForOverlay } = require('./textProcessing');

  // Use reference style for white panel and serif fonts
  const layout = calculateLayout(canvasWidth, canvasHeight, 'reference');

  // Override header height to fixed ratio
  layout.headerHeight = Math.round(canvasHeight * ratio);
  if (layout.headerHeight % 2 !== 0) layout.headerHeight -= 1; // ensure even height for yuv420

  // Process text based on layout
  const textData = processTextForOverlay(text, attribution, layout);

  // Ensure attribution stays inside the panel area with a small bottom padding
  const bottomPaddingPx = Math.round(canvasHeight * 0.02);
  const maxAttrY = layout.headerHeight - bottomPaddingPx;
  if (textData.attributionY > maxAttrY) {
    textData.attributionY = maxAttrY;
  }

  // Generate final SVG
  return generateOverlaySVG(textData, layout);
};

// Export new generator
module.exports.generateTopPanelOverlay = generateTopPanelOverlay;