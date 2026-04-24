// --- REQUIREMENTS ------------------------------------------------------------------
const easymidi = require('easymidi');

// --- MIDI CONFIG ------------------------------------------------------------------

		// currently handling only 2 input and 2 output ports, but can be easily expanded if needed
		// additionally, there is a "loopback" input and output for internal routing of MIDI messages within the app for the purpose of macro controls

		// MIDI IN = from which remote MIDI control is received
		// MIDI OUT = to where MIDI feedback is sent

	let midiIn = "MIDIIN2 (PreSonus FP8)";
	let midiOut = "MIDIOUT2 (PreSonus FP8)";

	let midiIn2 = "PreSonus FP8";
	let midiOut2 = "PreSonus FP8";

	let midiInLoopback = "MIDI-1-LOOPBACK";
	let midiOutLoopback = "MIDI-1-LOOPBACK";

	// --- MIDI PORT TESTER ------------------------------------------------------------------

			// PORT 1
	try {
		midiIn = new easymidi.Input(midiIn);
		console.log(`MIDI Input 1 connected: ${midiIn}`);
	} catch (error) {
		console.error('Failed to connect MIDI Input 1:', error.message);
		midiIn = null;
	}

	try {
		midiIn2 = new easymidi.Input(midiIn2);
		console.log(`MIDI Input 2 connected: ${midiIn2}`);
	} catch (error) {
		console.error('Failed to connect MIDI Input 2:', error.message);
		midiIn2 = null;
	}

			// PORT 2
	try {
		midiOut = new easymidi.Output(midiOut);
		console.log(`MIDI Output 1 connected: ${midiOut}`);
	} catch (error) {
		console.error('Failed to connect MIDI Output 1:', error.message);
		midiOut = null;
	}

	try {
		midiOut2 = new easymidi.Output(midiOut2);
		console.log(`MIDI Output 2 connected: ${midiOut2}`);
	} catch (error) {
		console.error('Failed to connect MIDI Output 2:', error.message);
		midiOut2 = null;
	}

			// PORT 3 (LOOPBACK)
	try {
		midiInLoopback = new easymidi.Input(midiInLoopback);
		console.log(`MIDI Loopback connected: ${midiInLoopback}`);
	} catch (error) {
		console.error('Failed to connect MIDI Loopback', error.message);
		midiInLoopback = null;
	}

	try {
		midiOutLoopback = new easymidi.Output(midiOutLoopback);
		console.log(`MIDI Loopback connected: ${midiOutLoopback}`);
	} catch (error) {
		console.error('Failed to connect MIDI Loopback:', error.message);
		midiOutLoopback = null;
	}


// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
    easymidi,
	midiIn, midiIn2, midiOut, midiOut2, midiInLoopback, midiOutLoopback
};