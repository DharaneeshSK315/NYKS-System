const util = require('util');
console.log('util.TextEncoder:', util.TextEncoder);
console.log('global.TextEncoder:', global.TextEncoder);

try {
    const faceapi = require('@vladmandic/face-api/dist/face-api.js');
    console.log('Face-API Loaded');
} catch (e) {
    console.error('Face-API Load Error:', e.message);
    console.error(e.stack);
}
