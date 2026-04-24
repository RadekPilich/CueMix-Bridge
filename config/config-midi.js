// --- REQUIREMENTS ------------------------------------------------------------------
const easymidi = require('easymidi');

// --- MIDI CONFIG ------------------------------------------------------------------

		// currently handling  2 input and 2 output ports, but can be easily expanded if needed
		// additionally, there is a "loopback" input and output for internal routing of MIDI messages within the app for the purpose of macro controls

		// MIDI IN = from which remote MIDI control is received
		// MIDI OUT = to where MIDI feedback is sent (LEDs, motorized fader positions, etc.)

		// use this first set of ports for CC controllers
	let midiInName = "MIDIIN2 (PreSonus FP8)";
	let midiOutName = "MIDIOUT2 (PreSonus FP8)";

		// use this second set of ports for NOTE ON / PITCH controllers
	let midiIn2Name = "PreSonus FP8";
	let midiOut2Name = "PreSonus FP8";

	let midiInLoopbackName = "MIDI-1-LOOPBACK";
	let midiOutLoopbackName = "MIDI-1-LOOPBACK";

	// --- MIDI PORT TESTER ------------------------------------------------------------------

	console.log(`------------------------------- MIDI PORT TEST STARTING ------------------------------`);
	
			// PORT 1
	try {
		midiIn = new easymidi.Input(midiInName);
		console.log(`MIDI Input 1 connected: ${midiInName}`);
	} catch (error) {
		console.error('Failed to connect MIDI Input 1:', error.message);
		midiIn = null;
	}

	try {
		midiOut = new easymidi.Output(midiOutName);
		console.log(`MIDI Output 1 connected: ${midiOutName}`);
	} catch (error) {
		console.error('Failed to connect MIDI Output 1:', error.message);
		midiOut = null;
	}

			// PORT 2
	try {
		midiIn2 = new easymidi.Input(midiIn2Name);
		console.log(`MIDI Input 2 connected: ${midiIn2Name}`);
	} catch (error) {
		console.error('Failed to connect MIDI Input 2:', error.message);
		midiIn2 = null;
	}

	try {
		midiOut2 = new easymidi.Output(midiOut2Name);
		console.log(`MIDI Output 2 connected: ${midiOut2Name}`);
	} catch (error) {
		console.error('Failed to connect MIDI Output 2:', error.message);
		midiOut2 = null;
	}

			// PORT 3 (LOOPBACK)
	try {
		midiInLoopback = new easymidi.Input(midiInLoopbackName);
		console.log(`MIDI Loopback connected: ${midiInLoopbackName}`);
	} catch (error) {
		console.error('Failed to connect input from MIDI Loopback', error.message);
		midiInLoopback = null;
	}

	try {
		midiOutLoopback = new easymidi.Output(midiOutLoopbackName);
		console.log(`MIDI Loopback connected: ${midiOutLoopbackName}`);
	} catch (error) {
		console.error('Failed to connect output into MIDI Loopback:', error.message);
		midiOutLoopback = null;
	}

	console.log(`------------------------------- MIDI PORT TEST FINISHED ------------------------------`);

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
    easymidi,
	midiIn, midiIn2, midiOut, midiOut2, midiInLoopback, midiOutLoopback
};