const FF = require('./src/services/FFmpegService');

async function testOverlay() {
  try {
    const sessionId = '8cf785be-ef18-4856-a04f-dd0b0ee37305';
    const params = {
      videoFile: 'test_video.mp4',
      text: 'Testing workflow',
      subtitle: 'TraeAI',
      position: 'top'
    };
    const outputFilename = 'test_output.mp4';
    
    console.log('Testing text overlay args generation...');
    const args = await FF.addTextOverlayArgs(sessionId, params, outputFilename);
    console.log('Generated args:', args);
  } catch (error) {
    console.error('Error:', error);
  }
}

testOverlay();