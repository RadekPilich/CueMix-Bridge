// --- REQUIREMENTS --- ------------------------------------------------------------------

const { easymidi, midiIn, midiIn2, midiOut, midiOut2, midiInLoopback, midiOutLoopback, } = require('./config/config-midi');
const { cmProAddr, cm5Addr, } = require('./config/config-motu');
const { cm5map, cm5macros } = require('./config/config-cuemix5');

const WebSocket = require('ws');
const { handleMotuMessage, logger, getCmdId, getCmdVal, getCmdTrg, getCmdGrp, } = require('./lib/motu-monitor');
const { noiseGrp, COLORS, TYPE_COLORS, TYPE_MARGIN, } = require('./config/config-monitor');

const { scc, son, sof, spp, midiPanic, safeSend, getNoteId, getCCId, getPitchId, } = require('./lib/easymidi-extension');
	
	
// --- OPEN WEB SOCKETS INCL. MAPPING CONFIG CHECK --- ------------------------------------------------------------------

// midiPanic(); // WARNING - this tends to break things, don't use if you don't need to

		// CONNECTION & ERROR HANDLING
const ws = new WebSocket(cm5Addr);	

		// Create WebSocket with timeout to prevent hanging
const connectionTimeout = setTimeout(() => {
	if (ws.readyState === WebSocket.CONNECTING) {
		console.log('WebSocket connection timeout - MOTU app may not be running');
	}
}, 10000);

ws.on('error', (error) => {
	logger('error', `WebSocket connection error ${error.message}`);	
});

ws.on('open', () => {
	clearTimeout(connectionTimeout);
    logger('WebSocket connected to MOTU device');
    logger('Bridge Active. Waiting for initial MOTU data burst to subside...');
		setTimeout(() => {
			checkMappings();
		}, 3000); //3s delay
		
		// Start MIDI port health check (30 second interval)
		setInterval(() => {
			const port1Ok = midiOut && typeof midiOut.send === 'function';
			const port2Ok = midiOut2 && typeof midiOut2.send === 'function';
			const port3Ok = midiOutLoopback && typeof midiOutLoopback.send === 'function';
						
			if (!port1Ok) logger('error', 'MIDI Out Port health check failed: Port not accessible');
			if (!port2Ok) logger('error', 'MIDI Out 2 Port health check failed: Port not accessible');
			if (!port3Ok) logger('error', 'MIDI Out Loopback Port health check failed: Port not accessible');
		}, 30000);
});

ws.on('close', () => {
	logger('system', 'WebSocket connection closed');	
});


// --- MIDI INPUT PORT ERROR HANDLING --- ------------------------------------------------------------------

// Listen for MIDI input port errors (output ports don't support event listeners)
midiIn.on('error', (error) => {
	logger('error', `MIDI In Port Error: ${error.message}`);
});

midiIn2.on('error', (error) => {
	logger('error', `MIDI In 2 Port Error: ${error.message}`);
});

midiInLoopback.on('error', (error) => {
	logger('error', `MIDI In Loopback Port Error: ${error.message}`);
});


// --- MAPPING CHECKER ------------------------------------------------------------------

const checkMappings = () => {
    console.log('\n--- 🔍 STARTUP MAPPING AUDIT ---');

    const report = (title, items) => {
        console.log(`\n[${title}]`);
        const grouped = {};

        // Group by MIDI Trigger
        Object.entries(items).forEach(([id, cfg]) => {
            const trigger = cfg.pitch !== undefined 
                ? `Pitch Ch.${cfg.pitch}` 
                : cfg.note !== undefined 
                    ? `Note ${cfg.note} (Ch.${cfg.note_chan})` 
                    : `CC ${cfg.cc} (Ch.${cfg.chan})`;
            
            if (!grouped[trigger]) grouped[trigger] = [];
            grouped[trigger].push(cfg.name);
        });

        // Print Grouped Results
        Object.entries(grouped).forEach(([trigger, names]) => {
            const count = names.length > 1 ? ` 🔥 [1:${names.length} MULTI]` : '';
            console.log(`${trigger.padEnd(20)} -> ${names.join(', ')}${count}`);
        });
    };

    report('TRIMS', cm5map.trims);
    report('GAINS', cm5map.gains);
    report('FADERS', cm5map.faders);
    report('BUTTONS', cm5map.buttons);
    
    console.log('\n--- AUDIT COMPLETE: Bridge is live ---\n'); 
    logger('system', '----------------------------------------------------------------------------------');
    logger('system', '------ ATTENTION: Make sure to view the MOTU BRIDGE monitor on full screen  ------');
	logger('system', '--- or zoom out apropriately to avoid the logs being interupted by line breaks ---');
    logger('system', '----------------------------------------------------------------------------------');

};

	
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
	const faderRange = 16383;

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
		// Map gain range (0-20) to pitch bend range (0-16383)
		const result = (val / gainRange) * 16383;
		return Math.max(0, Math.min(16383, Math.round(result)));
	};

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
			safeSend (midiOut2, spp, pitch, Math.floor((midiVal / ccRange) * 16383));
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = Math.floor((midiVal / ccRange) * 16383);
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
			safeSend (midiOut, scc, chan, cc, flipPitchToGain(midiVal));
			safeSend (midiOut2, spp, pitch, midiVal);
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = midiVal;
			logger('feedback',`GAIN: ${flipPitchToGain(midiVal)} / CHAN: ${chan+1} CC: ${cc} / PITCH: ${midiVal}`);

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
            midiVal = Math.min(Math.max(midiVal, 0), ccRange);
            const cc = cm5map.faders[cmdId].cc;
            const chan = cm5map.faders[cmdId].chan;
			const pitch = cm5map.faders[cmdId].pitch;

        if (lastSentValue[`Ch.${chan}P.${pitch}`] !== midiVal) {
				safeSend (midiOut, scc, chan, cc, midiVal);
				safeSend (midiOut2, spp, pitch, Math.floor((midiVal / ccRange) * 16383));
		    lastSentValue[`Ch.${chan}C.${cc}`] = midiVal;
		    lastSentValue[`Ch.${chan}P.${pitch}`] = Math.floor((midiVal / ccRange) * 16383);
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
        safeSend(midiOut, scc, chan, cc, midiVal);
        safeSend(midiOut2, son, note_chan, note, midiVal);
			// Last Value
			lastSentValue[`Ch.${chan}C.${cc}`] = val; 
			lastSentValue[`Ch.${note_chan}N.${note}`] = val;
		logger('fbvalues',`> Ch-${chan} CC-${cc} Val-${val}  //  Ch-${note_chan} Nt-${note} Val-${val}`); 
		logger('feedback',`> Ch-${chan} CC-${cc} Val-${midiVal}  //  Ch-${note_chan} Nt-${note} Vel-${midiVal}`); 
	}
});

// --- MIDI TO MOTU (Control) - CC HANDLING --- ------------------------------------------------------------------

const handleControlChange = (msg) => {
	let matched = false;
	
    // CC TRIM CONTROL
		const trimMatches = Object.entries(cm5map.trims).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
    if (trimMatches.length > 0) {
		matched = true;
        const flippedVal = flipCCtoTrim(msg.value);
        lastSentValue[getCCId(msg)] = msg.value;
        trimMatches.forEach(([idHex, cfg]) => {
            const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x01, flippedVal])]);
            ws.send(packet);
            logger('control', `> TRIM [${cfg.name} // ${idHex}] > VAL: -${flippedVal}`);
        });
    }

    // CC GAIN CONTROL
		const gainMatches = Object.entries(cm5map.gains).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
    if (gainMatches.length > 0) {
		matched = true;
        const gainVal = flipPitchToGain(Math.floor((msg.value / ccRange) * 16383));
        lastSentValue[getCCId(msg)] = msg.value;
        gainMatches.forEach(([idHex, cfg]) => {
            const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x01, gainVal])]);
            ws.send(packet);
            logger('control', `> GAIN [${cfg.name} // ${idHex}] > VAL: ${gainVal}`);
        });
    }

    // CC FADERS CONTROL
		const faderMatches = Object.entries(cm5map.faders).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
	if (faderMatches.length > 0) {
		matched = true;
        lastSentValue[getCCId(msg)] = msg.value; 
        faderMatches.forEach(([idHex, cfg]) => {
            const valBuf = scaleCCtoFader(msg.value); 
            const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x04]), Buffer.from(valBuf)]);
            ws.send(packet);
            logger('control', `> FADER [${cfg.name} // ${idHex}]  > VAL: ${msg.value}`); 
        }); 
    }

	// CC BUTTONS CONTROL
		const buttonMatches = Object.entries(cm5map.buttons).filter(([id, cfg]) => cfg.cc === msg.controller && cfg.chan === msg.channel);
	if (buttonMatches.length > 0) {
		matched = true;
		if (msg.value > 0)   // only act on "Press" (1-127), ignore "Release" (0), flipping of the target bassed on the last sent value for that button
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
				
				safeSend(midiOut2, 'cc', msg.channel, msg.controller, outputVal);
				logger('invalues',`LAST SENT Val.${outputVal} Ch.${cfg.chan} CC.${cfg.cc}`);	
				logger('control', `> CC BUTTON [${cfg.name} // ${idHex}]  > STATE: ${newValue === 0 ? 'OFF' : 'ON'}`);
			});
		 return;
		}
	}

	if (!matched) {
		logger('unassign', `> CC > 0CHAN: ${msg.channel} CC: ${msg.controller} VAL: ${msg.value}`);
	}
};

midiIn.on('cc', handleControlChange);
midiIn2.on('cc', handleControlChange);
midiInLoopback.on('cc', handleControlChange);

// --- MIDI TO MOTU (Control) - PITCH HANDLING --- ------------------------------------------------------------------

const handlePitch = (msg) => {
	let matched = false;
	
	// PITCH TRIM CONTROL
	const pitchTrimMatches = Object.entries(cm5map.trims).filter(([id, cfg]) => cfg.pitch === msg.channel);
	if (pitchTrimMatches.length > 0) {
		matched = true;
		const valBuf = scalePitchToTrim(msg.value);
		lastSentValue[getPitchId(msg)] = msg.value; 

		pitchTrimMatches.forEach(([idHex, cfg]) => {
			const packet = Buffer.from([...Buffer.from(idHex, 'hex'), 0x00, 0x01, valBuf]);
			ws.send(packet);
			logger('control', `> TRIM [${cfg.name} // ${idHex}]  > VAL: -${valBuf}`);
		});
	}

	// PITCH GAIN CONTROL
	const pitchGainMatches = Object.entries(cm5map.gains).filter(([id, cfg]) => cfg.pitch === msg.channel);
	if (pitchGainMatches.length > 0) {
		matched = true;
		const valBuf = scalePitchToGain(msg.value);
		lastSentValue[getPitchId(msg)] = msg.value; 

		pitchGainMatches.forEach(([idHex, cfg]) => {
			const packet = Buffer.from([...Buffer.from(idHex, 'hex'), 0x00, 0x01, valBuf]);
			ws.send(packet);
			logger('control', `> GAIN [${cfg.name} // ${idHex}] > VAL: ${valBuf}`);
		});
	}

	// PITCH FADERS CONTROL
	const pitchFaderMatches = Object.entries(cm5map.faders).filter(([id, cfg]) => cfg.pitch === msg.channel);
	if (pitchFaderMatches.length > 0) {
		matched = true;
		lastSentValue[getPitchId(msg)] = msg.value; 
		const valBuf = scalePitchToFader(msg.value);

		pitchFaderMatches.forEach(([idHex, cfg]) => {
			const packet = Buffer.concat([
				Buffer.from(idHex, 'hex'),
				Buffer.from([0x00, 0x04]), 
				valBuf
			]);
			ws.send(packet);
			logger('control', `> FADER [${cfg.name} // ${idHex}] > HEX: ${valBuf.toString('hex')}`); 
		});
	}

	if (matched) {
		logger('input', `> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
	} else {
		logger('unassign', `> PITCH > 0CHAN: ${msg.channel} VAL: ${msg.value}`);
	}
};

midiIn.on('pitch', handlePitch);
midiIn2.on('pitch', handlePitch);


// --- MIDI TO MOTU (Control) - NOTE-ON HANDLING --- ------------------------------------------------------------------

const handleNoteOn = (msg) => {
	let matched = false;

	if (msg.velocity > 65) { // Only act on "Press"
		// 1. BUTTONS HANDLING
		const buttonMatches = Object.entries(cm5map.buttons).filter(([id, cfg]) => cfg.note === msg.note && cfg.note_chan === msg.channel);
		if (buttonMatches.length > 0) {
			matched = true;
			logger('input', `> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note} VEL: ${msg.velocity}`);
			const newState = lastSentValue[getNoteId(msg)] > 0 ? 0 : 1;
			lastSentValue[getNoteId(msg)] = newState;

			buttonMatches.forEach(([idHex, cfg]) => {
				const outputVelocity = cfg.type === 0 ? (newState === 1 ? 0 : 127) : (newState === 1 ? 127 : 0);
				const stateHex = newState === 1 ? 0x01 : 0x00;
				const packet = Buffer.concat([Buffer.from(idHex, 'hex'), Buffer.from([0x00, 0x01, stateHex])]);
				ws.send(packet);
				safeSend(midiOut2, 'noteon', msg.channel, msg.note, outputVelocity);
				logger('control', `> BUTTON [${cfg.name} // ${idHex}] > (Button is ${outputVelocity === 127 ? 'ON' : 'OFF'})`);
			});
		}

		// 2. MACROS HANDLING (Iterate all macros)
		cm5macros.macros.forEach(macro => {
			if (macro.note === msg.note && macro.chan === msg.channel) {
				matched = true;
				logger('input', `> MACRO: ${macro.name} (Note: ${msg.note}, Chan: ${msg.channel})`);
				const newState = lastSentValue[getNoteId(msg)] > 0 ? 0 : 1;
				lastSentValue[getNoteId(msg)] = newState;
				const outputVelocity = newState === 1 ? 127 : 0;
				safeSend(midiOut2, 'noteon', msg.channel, msg.note, outputVelocity);

				// Process actions (using 'trims' as generic list of steps)
				const actions = macro.trims || [];
				const processedTriggers = new Set(); // Track 'chan:cc:val' to prevent redundant loopback messages

				actions.forEach(action => {
					// Find exactly ONE matching config across all categories to prevent loopback spam
					let cfg = null;
					let type = '';
					for (const cat of ['trims', 'gains', 'faders', 'buttons']) {
						cfg = Object.values(cm5map[cat]).find(c => c.name === action.name);
						if (cfg) { type = cat; break; }
					}

					if (cfg) {
						const triggerKey = `${cfg.chan}:${cfg.cc}:${action.val}`;
						if (!processedTriggers.has(triggerKey)) {
							safeSend(midiOutLoopback, scc, cfg.chan, cfg.cc, action.val);
							processedTriggers.add(triggerKey);
						}
						
						logger('macro', `> MACRO SET ${action.name} (${type}) > CHAN: ${cfg.chan} CC: ${cfg.cc} VAL: ${action.val}`);
					} else {
						logger('error', `> MACRO: Control not found in cm5map: ${action.name}`);
					}
				});
			}
		});
	}

	if (!matched && msg.velocity > 65) {
		logger('unassign', `> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note}`);
	}
};

midiIn.on('noteon', handleNoteOn);
midiIn2.on('noteon', handleNoteOn);

return;