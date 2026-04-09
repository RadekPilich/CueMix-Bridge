// --- MIDI PANIC --- ------------------------------------------------------------------

	const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	// WARNING - this tends to break things, don't use if you don't need to
const midiPanic = async () => {
    console.log("!!! MIDI PANIC: Resetting All Controllers !!!");
		// Loop through all channels and send default values
    for (let chan = 0; chan < 15; chan++) {     
        for (let note = 0; note < 127; note++) {
             midiOut.send('noteon', {note: note, velocity: 0, channel: chan});
            midiOut2.send('noteon', {note: note, velocity: 0, channel: chan});
		//	await sleep(1);
        }
        for (let cc = 0; cc < 127; cc++) {
             midiOut.send('cc', {controller: cc, value: 0, channel: chan});
            midiOut2.send('cc', {controller: cc, value: 0, channel: chan});
		//	await sleep(1);
        }	
	   	 midiOut.send('pitch', {channel: chan, value: 8192}); 	
		midiOut2.send('pitch', {channel: chan, value: 8192});
		//   await sleep(1);
        } 
    console.log("--- Reset Complete ---"); 
};

// --- MESSAGE ID CREATOR ---  ------------------------------------------------------------------

		//Using this for last sent / received controller value storage
	const getNoteId = (msg) => {
		return `Ch.${msg.channel}N.${msg.note}`;
	};

	const getCCId = (msg) => {
		return `Ch.${msg.channel}C.${msg.cc}`;
	};

	const getPitchId = (msg) => {
		return `Ch.${msg.channel}P.${msg.pitch}`;
	};

// --- SAFE SENDING ---  ------------------------------------------------------------------

	// MIDI Type Constants
			const scc = 'cc';
			const son = 'noteon';
			const sof = 'noteoff';
			const spp = 'pitch';


		/**
		 * Universal Safe MIDI Sender (Supports Object or Inline arguments)
		 * Usage 1 (Inline): safeSend(midiOut, cc, 0, 7, 130);
							 safeSend(midiOut, noteon, 0, 64, 127);
							 safeSend(midiOut2, pitch, 0, 8192);
		 * Usage 2 (Object): safeSend(midiOut, cc, { channel: 0, controller: 7, value: 130 });
							 safeSend(midiOut2, cc, msg);
		 */

const safeSend = (port, type, ...args) => {
	
    if (!port || typeof port.send !== 'function') return;

    let msg = {};
	
    // OBJECT/ INLINE HANDLER
    if (typeof args[0] === 'object') {
        msg = { ...args[0] };
    } else {
        const [a, b, c] = args;
        if (type === scc) msg = { channel: a, controller: b, value: c };
        else if (type === son || type === sof) msg = { channel: a, note: b, velocity: c };
        else if (type === spp) msg = { channel: a, value: b };
    }

    // BOUNDARY CLAMPERS
    const clamp = (val, max) => Math.max(0, Math.min(max, Math.round(val || 0)));

    msg.channel = clamp(msg.channel, 15);

    if (type === scc) {
        msg.value = clamp(msg.value, 127);
    } else if (type === son || type === sof) {
        msg.note = clamp(msg.note, 127);
        msg.velocity = clamp(msg.velocity, 127);
    } else if (type === spp) {
        msg.value = clamp(msg.value, 16383);
    }

    port.send(type, msg);
};

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	scc, son, sof, spp,
	midiPanic, safeSend,
	getNoteId, getCCId, getPitchId,
};