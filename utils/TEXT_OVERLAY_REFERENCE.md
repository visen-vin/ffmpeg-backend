# Text Overlay Design Reference

This document provides a complete reference for implementing the text overlay system used in this video processing API. The design creates professional-looking text overlays with proper typography, spacing, and visual hierarchy.

## Overview

The text overlay system supports two main styles:
- **Reference Style**: Clean, professional overlay with white header background
- **Dark Style**: Traditional overlay with semi-transparent dark background and drop shadows

## Core Design Principles

### 1. Responsive Typography
- Font size scales based on canvas width: `fontSize = canvasWidth / 19` (reference) or `canvasWidth / 20` (dark)
- Attribution font is 80% of main text size
- Line spacing: `fontSize + 10px`

### 2. Aspect Ratio Preservation
- Supports both vertical (9:16) and horizontal (16:9) content
- 4K upscaling maintains original aspect ratio with padding
- Text layout adapts to target resolution

### 3. Consistent Spacing System
- Side margins: 8% of canvas width (reference) or 15% (dark)
- Top padding: 10% of canvas height (reference style)
- Bottom padding: 2.5% of canvas height (reference style)
- Header height capped at 32% of canvas height

## Implementation Details

### Text Processing Pipeline

```javascript
// 1. Text wrapping based on available width
const maxCharsPerLine = Math.floor(textAreaWidth / (fontSize * 0.6));
const wrappedText = wrapText(text, maxCharsPerLine);

// 2. Line limit enforcement (max 5 lines)
const MAX_LINES = 5;
let linesToRender = wrappedText.slice(0, MAX_LINES);
if (wrappedText.length > MAX_LINES) {
  const lastIdx = MAX_LINES - 1;
  linesToRender[lastIdx] = `${linesToRender[lastIdx]}…`;
}
```

### Layout Calculations

#### Reference Style (Professional)
```javascript
const topPaddingRatio = 0.10;
const bottomPaddingRatio = 0.025;
const mainTextTop = Math.round(canvasHeight * topPaddingRatio);

// Attribution positioning with compact gap
const lastLineY = mainTextTop + ((lineCount - 1) * lineSpacing) + fontSize;
const attrGap = Math.round(fontSize * 0.25);
const attributionY = lastLineY + attrGap;

// Header height calculation
const headerHeightPxRaw = attributionY + attrBottomMargin + bottomPaddingPx;
const maxHeaderPx = Math.round(canvasHeight * 0.32);
const headerHeight = Math.min(headerHeightPxRaw, maxHeaderPx);

// Ensure even height for YUV420 compatibility
if (headerHeight % 2 !== 0) headerHeight -= 1;
```

#### Dark Style (Traditional)
```javascript
const baseDarkTop = 1200; // Base position for 1920px height
const mainTextTop = Math.round((baseDarkTop * (canvasHeight / 1920)) - fontSize);
const rectY = mainTextTop - padding;
const rectHeight = (attributionY - mainTextTop) + padding * 1.5;
```

### SVG Generation

#### Typography Styles
```css
/* Reference Style */
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
  fill: #D64A27; 
  text-anchor: middle; 
}

/* Dark Style */
.main-text { 
  font-family: "Roboto", "Noto Color Emoji"; 
  font-size: ${fontSize}px; 
  font-weight: bold; 
  fill: white; 
  text-anchor: middle; 
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8)); 
}

.attr-text { 
  font-family: "Roboto", "Noto Color Emoji"; 
  font-size: ${Math.round(fontSize * 0.7)}px; 
  font-weight: bold; 
  fill: #FFA500; 
  text-anchor: middle; 
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.7)); 
}
```

#### Multi-line Text Structure
```xml
<text class="main-text">
  <tspan x="${textCenterX}" y="${mainTextTop}">${line1}</tspan>
  <tspan x="${textCenterX}" y="${mainTextTop + lineSpacing}">${line2}</tspan>
  <!-- ... additional lines -->
</text>

<text class="attr-text" x="${textCenterX}" y="${attributionY}">
  ${attribution}
</text>
```

### FFmpeg Video Compositing

#### 4K Reference Style Pipeline
```bash
# 1. Scale video maintaining aspect ratio
[0:v]scale=2160:3840:force_original_aspect_ratio=decrease:flags=lanczos[scaled]

# 2. Create black canvas and position video below header
[2:v][scaled]overlay=(main_w-overlay_w)/2:${headerHeight}[vplaced]

# 3. Draw white header background
[vplaced]drawbox=x=0:y=0:w=iw:h=${headerHeight}:color=white:t=fill[vidBase]

# 4. Overlay text PNG
[vidBase][1:v]overlay=0:0
```

#### Standard Resolution Pipeline
```bash
# Reference style with header
[2:v][0:v]overlay=(main_w-overlay_w)/2:${headerHeight}[vplaced];
[vplaced]drawbox=x=0:y=0:w=iw:h=${headerHeight}:color=white:t=fill[vidBase];
[vidBase][1:v]overlay=0:0

# Dark style with centered overlay
[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2
```

## Key Features

### 1. Emoji Support
- Uses `node-emoji` library for shortcode conversion
- Supports Unicode emojis in both text and attribution
- Font fallback ensures proper rendering

### 2. Text Sanitization
```javascript
const sanitizeForSvg = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
```

### 3. Seamless Header Join
- Uses FFmpeg `drawbox` for pixel-perfect header background
- Even header heights prevent YUV420 subsampling artifacts
- Composite pipeline eliminates visual seams

### 4. Quality Settings
```javascript
// FFmpeg encoding options
.videoCodec('libx264')
.outputOptions([
  '-c:a copy',           // Copy audio without re-encoding
  '-preset slow',        // High quality encoding
  '-crf 17',            // High quality constant rate factor
  '-pix_fmt yuv420p',   // Compatible pixel format
  '-movflags +faststart' // Web-optimized MP4
])
```

## Usage Examples

### Basic Implementation
```javascript
// 1. Calculate layout dimensions
const canvasWidth = 2160;  // 4K vertical
const canvasHeight = 3840;
const sideMargin = canvasWidth * 0.08;
const fontSize = Math.round((canvasWidth - 2 * sideMargin) / 19);

// 2. Process text
const wrappedText = wrapText(inputText, maxCharsPerLine);
const linesToRender = wrappedText.slice(0, 5); // Max 5 lines

// 3. Generate SVG
const textSvg = generateOverlaySVG(linesToRender, attribution, layout);

// 4. Composite with video
await compositeVideoWithOverlay(videoPath, textSvg, outputPath);
```

### Style Variations
```javascript
const styles = {
  reference: {
    fontFamily: 'Georgia, serif',
    textColor: 'black',
    attrColor: '#D64A27',
    background: 'white header',
    topPadding: '10%'
  },
  
  dark: {
    fontFamily: 'Roboto, sans-serif',
    textColor: 'white',
    attrColor: '#FFA500',
    background: 'semi-transparent dark',
    dropShadow: true
  }
};
```

## Dependencies

### Required Libraries
```json
{
  "sharp": "^0.33.5",           // SVG to PNG conversion
  "fluent-ffmpeg": "^2.1.3",   // Video processing
  "node-emoji": "^2.2.0"       // Emoji support
}
```

### System Requirements
- FFmpeg with libx264 codec
- Node.js 16+ for Sharp compatibility
- Sufficient disk space for temporary files

## Best Practices

### 1. Performance Optimization
- Clean up temporary PNG files after processing
- Use appropriate CRF values (17 for high quality, 23 for balanced)
- Enable faststart for web delivery

### 2. Quality Assurance
- Test with various text lengths and line counts
- Verify emoji rendering across different fonts
- Check header alignment at different resolutions

### 3. Error Handling
- Validate input text length and content
- Handle missing fonts gracefully
- Provide fallback layouts for edge cases

### 4. Accessibility
- Ensure sufficient contrast ratios
- Use readable font sizes across devices
- Provide alternative text descriptions

## Troubleshooting

### Common Issues

**Seam between header and video:**
- Ensure header height is even (divisible by 2)
- Use `drawbox` instead of SVG rectangles
- Verify composite order in FFmpeg filter chain

**Text overflow:**
- Implement proper text wrapping
- Enforce maximum line limits
- Add ellipsis for truncated content

**Poor video quality:**
- Use appropriate scaling filters (lanczos for upscaling)
- Set proper CRF values
- Enable slow preset for better compression

**Emoji rendering issues:**
- Include emoji-compatible fonts in font stack
- Test with various Unicode characters
- Provide fallback characters for unsupported emojis

## Advanced Customization

### Custom Font Integration
```css
@font-face {
  font-family: 'CustomFont';
  src: url('path/to/font.woff2') format('woff2');
}

.main-text { 
  font-family: 'CustomFont', 'Georgia', serif; 
}
```

### Dynamic Color Schemes
```javascript
const colorSchemes = {
  corporate: { text: '#2C3E50', attr: '#E74C3C', bg: '#ECF0F1' },
  vibrant: { text: '#FFFFFF', attr: '#FF6B6B', bg: '#4ECDC4' },
  minimal: { text: '#333333', attr: '#666666', bg: '#FFFFFF' }
};
```

### Animation Support
```javascript
// Add fade-in animation
const enableClause = ':enable=\'between(t,0.5,${duration})\'';
```

This reference provides a complete foundation for implementing the text overlay system in any video processing project. The modular design allows for easy customization while maintaining professional quality and performance.