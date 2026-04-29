const tf = require('@tensorflow/tfjs');

// Mock tfjs-node in require cache
try {
    const mockPath = require.resolve('@tensorflow/tfjs-node');
    require.cache[mockPath] = {
        id: mockPath,
        filename: mockPath,
        loaded: true,
        exports: tf
    };
    console.log('Mocked tfjs-node at:', mockPath);
} catch (e) {
    // If not found, we can't easily mock it via cache, but we can try to intercept require
    console.log('tfjs-node not found, creating dummy path');
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function() {
        if (arguments[0] === '@tensorflow/tfjs-node') {
            return tf;
        }
        return originalRequire.apply(this, arguments);
    };
}

try {
    const faceapi = require('@vladmandic/face-api');
    console.log('Face-API Node Loaded');
} catch (e) {
    console.error('Face-API Node Load Error:', e.message);
}
