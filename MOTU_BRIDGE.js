// --- REQUIREMENTS --- ------------------------------------------------------------------

const { easymidi, midiIn, midiIn2, midiOut, midiOut2, } = require('./config/config-midi');
const { ws, cmProAddr, cm5Addr, } = require('./config/config-motu');
const { cm5map, checkMappings, } = require('./config/config-cuemix5');

const { handleMotuMessage, logger, getCmdId, getCmdVal, getCmdTrg, getCmdGrp, } = require('./lib/motu-monitor');
const { noiseGrp, COLORS, TYPE_COLORS, TYPE_MARGIN, } = require('./config/config-monitor');

const { scc, son, sof, spp, midiPanic, safeSend, getNoteId, getCCId, getPitchId, } = require('./lib/easymidi-extension');
	

// --- OPEN WEB SOCKETS INCL. MAPPING CONFIG CHECK --- ------------------------------------------------------------------

// midiPanic(); // WARNING - this tends to break things, don't use if you don't need to

ws.on('open', () => {
    logger('Bridge Active. Waiting for initial MOTU data burst to subside...');
		setTimeout(() => {
			checkMappings();
		}, 3000); //3s delay
});


// --- HANDLE MOTU MESSAGE --- ------------------------------------------------------------------
ws.on('message', handleMotuMessage);


// --- LAST SENT VALUE STORAGE --- ------------------------------------------------------------------
let lastSentValue = {};


// --- VALUE CONVERSIONS --- ------------------------------------------------------------------

		// 12800 + 3584 = 16384 = 128 * 128

	const MOTU_12 = 66791300;  // Fader at maximum (+12dB)  0x03FB2784
	const MOTU_0 = 16777216;  // Fader at unityu (0dB)  0x01000000
	const MOTU_L = 0;	// Pan hard left  0x00000000
	const MOTU_C = 8388608; // Pan center  0x00800000
	const MOTU_R = 16777216; // Pan hard right 0x01000000

	const flipCC = (val) => ccRange - val; // 0-127 reversal

	const trimRange = 100;
	const preampRange = 74;
	const ccRange = 127;
	const gainRange = 20;
	const faderRange = 16384;

	    // TRIM FLIPS

	const flipCCtoTrim = (val) => {
		const result = trimRange - (val * trimRange / ccRange);
		return Math.max(0, Math.min(trimRange, Math.round(result)));
	};

	const flipTrimToCC = (val) => {
		const result = ccRange - (val * ccRange / trimRange);
		return Math.max(0, Math.min(ccRange, Math.round(result)));
	};

	const flipPitchToTrim = (val) => {
		const result = trimRange - (val * trimRange / faderRange);
		return Math.max(0, Math.min(trimRange, Math.round(result)));
	};

	    // GAIN FLIPS

	const flipPitchToGain = (val) => {
		const result = (val * gainRange / faderRange);
		return Math.max(0, Math.min(gainRange, Math.round(result)));
	};

	const flipGainToPitch = (val) => {
		const result = (128 * (val/gainRange) );
		return Math.max(0, Math.min(128, Math.round(result)));
	};

/* 	const flipPitchToCC = (val) => {
		const result = ccRange - (val * ccRange / faderRange);
		return Math.max(0, Math.min(ccRange, Math.round(result)));
	}; */
	 
// --- SCALED MAPPING CONFIG --- ------------------------------------------------------------------

	const scaleCCtoFader = (val) => {
		let scaled;
		if (val < 100) {
			scaled = Math.floor(Math.pow(val / 100, 4) * MOTU_0);   // Apply a 4th power curve to make the lower range logarithmic (val/100)^4 * MOTU_0
		} else {
			scaled = MOTU_0 + Math.floor(((val - 100) / 27) * (MOTU_12 - MOTU_0));     // Keep the +12dB range linear
		}
		const buf = Buffer.alloc(4);
		buf.writeUInt32BE(scaled); 
		logger('invalues', `scaleCCtoFader: ${buf.readUInt32BE(0)}`);
		return buf;
	};

	const scalePitchToFader = (val) => {
		let scaled;
		if (val < 12800) {
			scaled = Math.floor(Math.pow(val / 12800, 4) * MOTU_0);   // Apply a 4th power curve to make the lower range logarithmic (val/100)^4 * MOTU_0
		} else {
			scaled = MOTU_0 + Math.floor(((val - 12800) / 3584) * (MOTU_12 - MOTU_0));     // Keep the +12dB range linear
		}
		const buf = Buffer.alloc(4);
		buf.writeUInt32BE(scaled);
		logger('invalues', `scalePitchToFader: ${buf.readUInt32BE(0)}`);
		return buf;
	};

	const scalePitchToTrim = (val) => {
		let scaled;
			scaled = flipPitchToTrim(val)
		logger('invalues', `pitchToTrim: ${scaled}`);
		return scaled;
	};

	const scalePitchToGain = (val) => {
		let scaled;
			scaled = flipPitchToGain(val)
		logger('invalues', `scalePitchToGain: ${scaled}`);
		return scaled;
	};

// --- MOTU TO MIDI (Feedback) ---  ------------------------------------------------------------------

ws.on('message', (data) => {
	
		const cmdId = getCmdId(data); 
	
	// HANDLE LOW-RES TRIMS
    if (cm5map.trims[cmdId] && data.length == 5) {
        const val = data[data.length - 1];
        const midiVal = flipTrimToCC(val);
        const cc = cm5map.trims[cmdId].cc;
        const chan = cm5map.trims[cmdId].chan;
		const pitch = cm5map.trims[cmdId].pitch;
		
			// Check against the MIDI value, not the MOTU value
        if (lastSentValue[`Ch.${chan}C.${cc}`] !== midiVal) {
			safeSend (midiOut, scc, chan, cc, midiVal);
			safeSend (midiOut2, spp, pitch, 128*midiVal);
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = 128*midiVal;
			logger('feedback',`PITCH: ${pitch} / CHAN: ${chan+1} CC: ${cc} / VAL: ${midiVal}`);
        }
    }

	// HANDLE LOW-RES GAINS
    if (cm5map.gains[cmdId] && data.length == 5) {
        const val = data[data.length - 1];
        const midiVal = flipGainToPitch(val);
        const cc = cm5map.gains[cmdId].cc;	
        const chan = cm5map.gains[cmdId].chan;
		const pitch = cm5map.gains[cmdId].pitch;
		
			// Check against the MIDI value, not the MOTU value
        if (lastSentValue[`Ch.${chan}C.${cc}`] !== midiVal) {
			safeSend (midiOut, scc, chan, cc, midiVal);
			safeSend (midiOut2, spp, pitch, 128*midiVal);
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = 128*midiVal;
			logger('feedback',`PITCH: ${pitch} / CHAN: ${chan+1} CC: ${cc} / VAL: ${midiVal}`);
        }
    }

	// HANDLE HI-RES FADERS 
			// Expects exactly 8 bytes: 4 byte ID + 4 byte float
    if (cm5map.faders[cmdId] && data.length == 8) {
            const motuVal = data.readUInt32BE(4); 
            let midiVal;

            if (motuVal <= MOTU_0) {
                midiVal = Math.floor(Math.pow(motuVal / 		MOTU_0, 0.25) * 100);		// Apply the 4th root to expand the lower dB range  (motuVal / MOTU_0)^(1/4) * 100
            } else {
                midiVal = 100 + Math.floor(((motuVal - MOTU_0) / (MOTU_12 - MOTU_0)) * 27);  // Linear scaling for the +12dB boost range
            }
            midiVal = Math.min(Math.max(midiVal, 0), ccRange	);
            const cc = cm5map.faders[cmdId].cc;
            const chan = cm5map.faders[cmdId].chan;
			const pitch = cm5map.faders[cmdId].pitch;

        if (lastSentValue[`Ch.${chan}P.${pitch}`] !== midiVal) {
				safeSend (midiOut, scc, chan, cc, midiVal);
				safeSend (midiOut2, spp, pitch, 128*midiVal);
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = 128*midiVal;
			logger('feedback',`PITCH: ${pitch} / CHAN: ${chan+1} CC: ${cc} / VAL: ${midiVal}`); 
        }
    }	

	// HANDLE BUTTONS
    if (cm5map.buttons[cmdId]) {
			// Mapping
	    const type = cm5map.buttons[cmdId].type;
	    const cc = cm5map.buttons[cmdId].cc;
		const chan = cm5map.buttons[cmdId].chan;
	    const note = cm5map.buttons[cmdId].note;
	    const note_chan = cm5map.buttons[cmdId].note_chan;
			// Conversion
        const val = data[data.length - 1];
		let midiVal;
		if (type === 0) {
                    midiVal = val === 1 ? 0 : 127;
                } else {
					midiVal = val === 1 ? 127 : 0;
                } 
			// Feedback
        midiOut.send('cc', { controller: cc, value: midiVal, channel: chan });
        midiOut2.send('noteon', { note: note, velocity: midiVal, channel: note_chan });
			// Last Value
			lastSentValue[`Ch.${chan}C.${cc}`] = val; 
			lastSentValue[`Ch.${note_chan}N.${note}`] = val;
		logger('fbvalues',`> Ch-${chan} CC-${cc} Val-${val}  //  Ch-${note_chan} Nt-${note} Val-${val}`); 
		logger('feedback',`> Ch-${chan} CC-${cc} Val-${midiVal}  //  Ch-${note_chan} Nt-${note} Vel-${midiVal}`); 
    }
});

// --- MIDI TO MOTU (Control) - CC HANDLING --- ------------------------------------------------------------------

const handleControlChange = (msg) => {
	
    // CC TRIM CONTROL
		const trimMatches = Object.entries(cm5map.trims).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
    if (trimMatches.length > 0) {
        const flippedVal = flipCCtoTrim(msg.value);
        lastSentValue[getCCId(msg)] = msg.value;
        trimMatches.forEach(([idHex]) => {
            const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x01, flippedVal])]);
            ws.send(packet);
            logger('control', `> TRIM [${idHex}] > VAL: -${flippedVal}`);
        });
    }

    // CC FADERS CONTROL
		const faderMatches = Object.entries(cm5map.faders).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
    if (faderMatches.length > 0) {
        lastSentValue[getCCId(msg)] = msg.value; 
        faderMatches.forEach(([idHex]) => {
            const valBuf = scaleCCtoFader(msg.value); 
            const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x04]), Buffer.from(valBuf)]);
            ws.send(packet);
            logger('control', `> FADER [${idHex}] > VAL: ${msg.value}`); 
        }); 
    }

	// CC Buttons Control
		const buttonMatches = Object.entries(cm5map.buttons).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);

	if (buttonMatches.length > 0) {
		if (msg.value > 0)   // only act on "Press" (1-127), ignore "Release" (0)
		{ 
			const newValue = lastSentValue[getCCId(msg)] > 0 ? 0 : 127;
			lastSentValue[getCCId(msg)] = newValue;
		   
			buttonMatches.forEach(([idHex, cfg]) => {
				let outputVal;
				if (cfg.type === 0) {
					outputVal = newValue === 127 ? 0 : 127;
				} else {
					outputVal = newValue === 127 ? 127 : 0;
				}
				const stateHex = outputVal === 127 ? 0x01 : 0x00;
				const packet = Buffer.concat([Buffer.from(idHex, 'hex'),Buffer.from([0x00, 0x01, stateHex])]);
				ws.send(packet);
				
				midiOut2.send('cc', {  channel: msg.channel, controller: msg.controller,  value: outputVal });
				logger('invalues',`LAST SENT Val.${outputVal} Ch.${cfg.chan} CC.${cfg.cc}`);	
				logger('control', `> CC BUTTON [${idHex}] > STATE: ${newValue === 0 ? 'OFF' : 'ON'}`);
			});
		 return;
		}
	} else {
			logger('unassign', `> CC > 0CHAN: ${msg.channel} CC: ${msg.controller} VAL: ${msg.value}`);
		}
};

midiIn.on('cc', handleControlChange);
midiIn2.on('cc', handleControlChange);


// --- MIDI TO MOTU (Control) - PITCH HANDLING --- ------------------------------------------------------------------

midiIn2.on('pitch', (msg) => {

	// PITCH TRIM CONTROL
	const pitchTrimMatches = Object.entries(cm5map.trims).filter(([id, cfg]) => cfg.pitch === msg.channel);
	if (pitchTrimMatches.length > 0) {
		logger('input',`> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
		const valBuf = scalePitchToTrim(msg.value);
		lastSentValue[getPitchId(msg)] = msg.value; 

		pitchTrimMatches.forEach(([idHex]) => {
			const packet = Buffer.from([...Buffer.from(idHex, 'hex'), 0x00, 0x01, valBuf]);
			ws.send(packet);
			logger('control', `> TRIM [${idHex}] > VAL: -${valBuf}`);
		});
	return;
	}

	// PITCH GAIN CONTROL
	const pitchGainMatches = Object.entries(cm5map.gains).filter(([id, cfg]) => cfg.pitch === msg.channel);
	if (pitchGainMatches.length > 0) {
		logger('input',`> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
		const valBuf = scalePitchToGain(msg.value);
		lastSentValue[getPitchId(msg)] = msg.value; 

		pitchGainMatches.forEach(([idHex]) => {
			const packet = Buffer.from([...Buffer.from(idHex, 'hex'), 0x00, 0x01, valBuf]);
			ws.send(packet);
			logger('control', `> GAIN [${idHex}] > VAL: ${valBuf}`);
		});
	return;
	}

	// PITCH FADERS CONTROL
    const pitchFaderMatches = Object.entries(cm5map.faders).filter(([id, cfg]) => cfg.pitch === msg.channel);
    if (pitchFaderMatches.length > 0) {
		logger('input',`> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
        lastSentValue[getPitchId(msg)] = msg.value; 
        const valBuf = scalePitchToFader(msg.value);

        pitchFaderMatches.forEach(([idHex, cfg]) => {
            const packet = Buffer.concat([
                Buffer.from(idHex, 'hex'),
                Buffer.from([0x00, 0x04]), 
                valBuf
            ]);
            ws.send(packet);
            logger('control', `> FADER [${idHex}] > HEX: ${valBuf.toString('hex')}`); 
        });
    return;
	}
	logger('unassign',`> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
    }
);

// --- MIDI TO MOTU (Control) - NOTE-ON HANDLING --- ------------------------------------------------------------------

midiIn2.on('noteon', (msg) => { 

	// NOTEON BUTTONS CONTROL
    if (msg.velocity > 65)      // only act on "Press" (note on velocity > 65), ignore "Release" (note on velocity < 65)
		{
        const buttonMatches = Object.entries(cm5map.buttons).filter(([id, cfg]) => 
            cfg.note === msg.note && cfg.note_chan === msg.channel
        );
        if (buttonMatches.length > 0) {
			logger('input',`> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note} VEL: ${msg.velocity}`);
            const newState = lastSentValue[getNoteId(msg)] > 0 ? 0 : 1;
            lastSentValue[getNoteId(msg)] = newState;
                
			const stateHex = newState === 1 ? 0x01 : 0x00;
				// Build and send the network packet for EACH match
            buttonMatches.forEach(([idHex, cfg]) => {
				let outputVelocity;
                if (cfg.type === 0) { // Type 0: Flipped (ON=0, OFF=127)  Type 1: Normal (ON=127, OFF=0)
                    outputVelocity = newState === 1 ? 0 : 127;
                } else {
                    outputVelocity = newState === 1 ? 127 : 0;
                }
                const packet = Buffer.concat([
                    Buffer.from(idHex, 'hex'), 
                    Buffer.from([0x00, 0x01, stateHex])
                ]);
                ws.send(packet); 
				midiOut2.send('noteon', { channel: msg.channel, note: msg.note, velocity: outputVelocity});            
				logger('control',`> BUTTON [${idHex}] > (Button is ${outputVelocity === 127 ? 'ON' : 'OFF'})`);
            }); 
            return;
        } 
        
        logger('unassign',`> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note}`);
    }
	return;
});
