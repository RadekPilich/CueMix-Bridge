// --- REQUIREMENTS ------------------------------------------------------------------
const easymidi = require('easymidi');

// --- MIDI CONFIG ------------------------------------------------------------------

		// currently handling only 2x2 ports

	// MIDI IN = from which remote MIDI control is received
	const midiIn = new easymidi.Input("MIDIIN2 (PreSonus FP8)");
	const midiIn2 = new easymidi.Input("PreSonus FP8");

	// MIDI OUT = to where MIDI feedback is sent
	const midiOut = new easymidi.Output("MIDIOUT2 (PreSonus FP8)");
	const midiOut2 = new easymidi.Output("PreSonus FP8");

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
    easymidi,
	midiIn, midiIn2, midiOut, midiOut2,
};