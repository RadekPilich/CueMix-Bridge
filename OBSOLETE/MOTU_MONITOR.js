const WebSocket = require('ws');

const url = 'ws://127.0.0.1:1281/828E071FBQ';
const ws = new WebSocket(url);

// List of IDs that represent "Noise" (Meters/Clock)
// If you still see scrolling data, add the first 2 bytes of that data to this list.
const noiseIDs = ['1770'];  //'0801', '0802', '0b01', '4c01',

ws.on('open', function open() {
    console.log(`Connected to MOTU. Filtering out meters (${noiseIDs.join(', ')})...`);
    console.log('Wiggle a fader or press Mute in CueMix 5 now.');
});

ws.on('message', function incoming(data) {
    const hex = data.toString('hex');
    const cmdId = hex.substring(0, 4); // Get first 2 bytes (4 hex chars)

    // Check if this ID is in our noise list
    if (noiseIDs.includes(cmdId)) {
        return; // Ignore this packet xxxx
    }

    // If it's not noise, print it clearly!
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[ACTION] ${timestamp} | ID: ${cmdId} | Full Hex: ${hex}`);
});

ws.on('error', function error(err) {
    console.log(`[FAILED] - ${err.message}`);
});