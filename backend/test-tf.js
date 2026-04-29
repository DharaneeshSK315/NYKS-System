try {
    const tf = require('@tensorflow/tfjs-node');
    console.log('TFJS-Node Loaded');
} catch (e) {
    console.error('TFJS-Node Load Error:', e.message);
    try {
        const tf = require('@tensorflow/tfjs');
        console.log('TFJS Loaded');
    } catch (e2) {
        console.error('TFJS Load Error:', e2.message);
    }
}
