// --- REQUIREMENTS --- ------------------------------------------------------------------

const { midiIn, midiIn2, midiOut, midiOut2, } = require('./config/config-midi');
const { ws, axios, cmProAddr, cm5Addr, } = require('./config/config-motu');
const { grpDef, chanDef, findChan, findGrp, cmpMap, checkMappingsPro, } = require('./config/config-cuemixpro');

const { handleMotuMessage, logger, getCmdId, getCmdVal, getCmdTrg, getCmdGrp, } = require('./lib/motu-monitor');


// --- HELPERS --- ------------------------------------------------------------------

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robust Axios Patch with Retries
 */
const safePatch = async (url, payload, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
          // await axios.patch(url, payload);	
			await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

			
            return true; // Success!
        } catch (err) {
            const isLastRetry = i === retries - 1;
            if (isLastRetry) {
                logger('ERROR', `Final attempt failed: ${url} - ${err.message}`);
                return false;
            }
            logger('SYSTEM', `Retry ${i + 1}/${retries} for MOTU path...`);
            await sleep(500); // Wait 500ms before trying again
        }
    }
};

/**
 * Queries the MOTU to ensure the routing matches our command
 */
const verifyRouting = async (url, expectedValue) => {
    try {
        // Give the hardware 50ms to settle
        await sleep(50); 
        
        const response = await axios.get(url);
        
        // MOTU usually returns { value: "3:24" }
        const actualValue = response.data.value;

        if (actualValue === expectedValue) {
            return true;
        } else {
            logger('ERROR', `Mismatch! Hardware says: ${actualValue}, Expected: ${expectedValue}`);
            return false;
        }
    } catch (err) {
        logger('ERROR', `Verification Query Failed: ${err.message}`);
        return false;
    }
};

/**
 * Fetches the entire routing state and updates all MIDI LEDs
 */
const syncLedsWithHardware = async () => {
    try {
        // 1. Fetch the flat bank
        // Querying /ext/obank returns keys relative to that path
        const response = await axios.get(`http://${cmProAddr}/datastore/ext/obank`);
        const remoteState = response.data;

        if (!remoteState) {
            logger('ERROR', 'Sync failed: No data received from MOTU.');
            return;
        }

        // 2. Iterate through every button in your map
        for (const btn of cmpMap.buttons) {
            let matches = 0;
            let totalPatches = 0;

            for (const route of btn.routings) {
                const src = findChan(route.src);
                const trg = findChan(route.trg);
                const sGrp = findGrp(src.grpCode);
                const tGrp = findGrp(trg.grpCode);

                const iterations = trg.stereo === 1 ? 2 : 1;

                for (let i = 0; i < iterations; i++) {
                    totalPatches++;
                    
                    const tID = trg.chanID + i;
                    const sID = src.stereo === 1 ? src.chanID + i : src.chanID;

                    // CONSTRUCT THE FLAT KEY
                    // This matches exactly: "1/ch/0/src"
                    const lookupKey = `${tGrp.grpID}/ch/${tID}/src`;
                    const expectedValue = `${sGrp.grpID}:${sID}`;
                    
                    // ACCESS BY STRING KEY
                    const actualValue = remoteState[lookupKey];

                    if (actualValue === expectedValue) {
                        matches++;
                    }
                }
            }

            // 3. SET LED STATE (Single Source of Truth)
            let velocity = 0; // Default: OFF (Overwritten or non-match)
            
            if (totalPatches > 0 && matches === totalPatches) {
                velocity = 127; // SOLID: Perfect match
            } else if (matches > 0) {
                velocity = 1;   // FLASH: Partial match (something is wrong)
            }

            midiOut2.send('noteon', { 
                note: btn.note, 
                velocity: velocity, 
                channel: btn.chan 
            });
        }

        logger('SYSTEM', 'LED states synchronized with hardware.');
    } catch (err) {
        logger('ERROR', `Sync Logic Error: ${err.message}`);
    }
};


// --- START --- ------------------------------------------------------------------

// --- STARTUP SEQUENCE ---
(async () => {
    logger('SYSTEM', 'Initializing Bridge...');
    checkMappingsPro();    // Verify config logic
    await sleep(500);      // Let MIDI ports settle
    await syncLedsWithHardware(); // Set initial LED states
    logger('SYSTEM', 'Ready for MIDI Input.');
})();

// --- MIDI TO MOTU (Control) - NOTEON HANDLING --- ------------------------------------------------------------------

const SYNC_TRIGGER_NOTE = 74; // Change this to whatever button you want to use

const handleNoteOn = async (msg) => {
	if (msg.velocity === 127) {
		
		// Check if the user pressed the manual Sync/Refresh button
    if (msg.note === SYNC_TRIGGER_NOTE) {
        logger('SYSTEM', 'Manual Sync Triggered...');
        await syncLedsWithHardware();
        return; // Don't look for routings for the sync button itself
    }
		
    // 1. Find the button config that matches the MIDI note
    const btn = cmpMap.buttons.find(b => b.note === msg.note && b.chan === msg.channel);
    if (!btn) return;

    logger('INPUT', `Setup: ${btn.name}`);
	
    let totalExpected = 0;
    let verifiedCount = 0;

    // 2. Loop through every routing change defined for this button
    for (const route of btn.routings) {
        try {
            // 3. Locate definitions using hybrid search (Checks ibank, obank, and mixer)
            const srcChan = findChan(route.src);
            const trgChan = findChan(route.trg);

            if (!srcChan || !trgChan) {
                logger('ERROR', `Channel definition for either ${route.src} or ${route.trg} not found.`);
                continue;
            }

            // 4. Locate group IDs
            const srcGrp = findGrp(srcChan.grpCode);
            const trgGrp = findGrp(trgChan.grpCode);

            if (!srcGrp || !trgGrp) {
                logger('ERROR', `I/O Groups for either ${srcChan.grpCode} or ${trgChan.grpCode} not found.`);
                continue;
            }

            // --- STEREO INTELLIGENCE LOOP ---
            // If target is stereo, we perform 2 patches. If mono, only 1.
            const iterations = trgChan.stereo === 1 ? 2 : 1;

            for (let i = 0; i < iterations; i++) {
                totalExpected++; // We expect this patch to work
				
				const currentTrgID = trgChan.chanID + i;
                
                // Logic for 1:2 routing: 
                // If source is stereo, we use L and R (chanID + i). 
                // If source is mono, both L and R targets get the same source (chanID).
                const currentSrcID = srcChan.stereo === 1 ? srcChan.chanID + i : srcChan.chanID;

                // 5. Construct MOTU Path & Payload
                const path = `ext/obank/${trgGrp.grpID}/ch/${currentTrgID}/src`;
                const url = `http://${cmProAddr}/datastore/${path}`;
				const rawValue = `${srcGrp.grpID}:${currentSrcID}`;
                const payload = `json=${JSON.stringify({ value: rawValue })}`;
				
                // 6. Send to MOTU via Axios with Retry + verify via MOTU query
                const patchSuccess = await safePatch(url, payload);
				if (patchSuccess) {
                    const isVerified = await verifyRouting(url, rawValue);
                    const label = iterations > 1 ? (i === 0 ? "[L]" : "[R]") : "[M]";
                    if (isVerified) {
						verifiedCount++;
						logger('ROUTING', `${label}: ${route.src} (${currentSrcID}) -> ${route.trg} (${currentTrgID})`);
                    } else {
                        // This will show up in Error colors
                        logger('ERROR', `FAILED TO VERIFY ${label}: ${route.src} (${currentSrcID}) -> ${route.trg} (${currentTrgID})`);
                    }
                }
            }  // --- END STEREO LOOP ---
        } catch (err) {
            logger('ERROR', `Failed routing: ${route.src} -> ${route.trg} => ${err.message}`);
        }
    }

// FINAL STEP: Wait a moment for hardware to settle, then sync ALL LEDs
    await sleep(200); 
    await syncLedsWithHardware();

/*     // --- MIDI FEEDBACK PHASE ---
    // Calculate the "Health" of the routing group
    let feedbackVelocity = 0;

    if (verifiedCount === totalExpected && totalExpected > 0) {
        feedbackVelocity = 127; // SOLID: 100% Success
        logger('SYSTEM', `>>> SUCCESS: All ${totalExpected} patches verified.`);
    } else if (verifiedCount > 0) {
        feedbackVelocity = 1;   // FLASHING: Partial Success
        logger('SYSTEM', `>>> WARNING: Only ${verifiedCount}/${totalExpected} patches verified.`);
    } else {
        feedbackVelocity = 0;   // OFF: Complete Failure
        logger('ERROR', `>>> CRITICAL: 0/${totalExpected} patches verified.`);
    }

    // Send the signal back to your controller
    // We use the same note and channel that triggered the command
    midiOut2.send('noteon', {
        note: btn.note,
        velocity: feedbackVelocity,
        channel: btn.chan
    }); */
}
};

midiIn.on('noteon', handleNoteOn);
midiIn2.on('noteon', handleNoteOn);


/* const handleNoteOn = async (msg) => {
    // 1. Find the button config that matches the MIDI note
    const btn = cmpMap.buttons.find(b => b.note === msg.note && b.chan === msg.channel);
    if (!btn) return;

    logger('INPUT', `Setup: ${btn.name}`);

    // 2. Loop through every routing change defined for this button
    for (const route of btn.routings) {	
	try {
		// 1. Locate definitions using hybrid search
        const srcChan = findChan(route.src);
        const trgChan = findChan(route.trg);

        if (!srcChan || !trgChan) continue;
            if (!trgChan || !srcChan) {
                logger('ERROR', `Channel definition for either ${route.trg} or ${route.src} not found.`);
                continue;
            }
		// 2. Locate group IDs
        const srcGrp = findGrp(srcChan.grpCode);
        const trgGrp = findGrp(trgChan.grpCode);

        if (!srcGrp || !trgGrp) {
            logger('ERROR', `I/O Groups for either ${route.src} or ${route.trg} not found.`);
            continue;
        }
            // 3. Construct MOTU Path
            // Path structure: "ext/obank/20/ch/55/src":"3:23"
			//                  ext/obank/targetGrp/ch/targetChan/src : val
            // The value is: { "val": grpID:chanID }
            const path = `ext/obank/${trgGrp.grpID}/ch/${trgChan.chanID}/src`;
			const url = `http://${cmProAddr}/datastore/${path}`;
            const payload = { value: `${srcGrp.grpID}:${srcChan.chanID}` };

			// 4. Send to MOTU via Axios with Retry
			const success = await safePatch(url, payload);
            //await axios.patch(`http://${cmProAddr}/datastore/${path}`, payload);
            
			if (success) {
            logger('CONTROL', `Successful routing: ${route.src} (${srcChan.grpCode}) -> ${route.trg} (${trgChan.grpCode})`);
        }
        } catch (err) {
            logger('ERROR', `Failed routing: ${route.src} (${srcChan.grpCode}) -> ${route.trg} (${trgChan.grpCode}) => ${err.message}`);
        }
    }
}; */



/* 

async function testRouting(patchId) {
    const path = 'ext/obank/20/ch/0/src';
    try {
        console.log(`Setting Routing 1 to ${patchId} dB...`);
         
        // Use the exact format the 16A hardware expects
        const payload = `json=${JSON.stringify({ value: patchId })}`;
        
        await axios.post(`http://${cmProAddr}/datastore/${path}`, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Wait for hardware sync
        await new Promise(r => setTimeout(r, 100));

        const res = await axios.get(`http://${cmProAddr}/datastore/${path}`);
        console.log(`Verified Trim Value: ${res.data.value} dB`);
        
        if (res.data.value == patchId) {
            console.log("SUCCESS: Trim responded to command!");
        } else {
            console.log("FAILED: Trim did not change. It might be read-only over HTTP.");
        }
    } catch (e) {
        console.error("Communication Error:", e.message);
    }
}
 */
// Test with a whole number (many MOTU trims work in 1dB or 0.5dB increments)

// testTrimControl(6);
// testRouting('1:1');


/*
ext/bankID/grpID/grpParam : Val
ext/bankID/grpID/ch/chanID/chanParam : Val

bankId = ibank obank
chanParam = name":"",  src":"0:0",
*/


/* 
    // NoteOn Buttons Control
    // 1. Only proceed if it's a "Press" (velocity 127). Ignore the "Release" (velocity 0).
    if (msg.velocity === 127) {
        // 2. Find Motu cmdId map (using filter to catch multiple mappings)
        const buttonMatches = Object.entries(cntrlMap.buttons).filter(([id, cfg]) => 
            cfg.note === msg.note && cfg.note_chan === msg.channel
        );
        if (buttonMatches.length > 0) {
		//	logger('input',`> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note} VEL: ${msg.velocity}`);
            // 3. Flip the state: if it's 1, make it 0. If it's 0 (or undefined), make it 1.
            const newState = lastSentValue[getNoteId(msg)] > 0 ? 0 : 1;
            lastSentValue[getNoteId(msg)] = newState;
            // 4. Determine the MIDI velocity and HEX state based on the new toggle position
			// Type 1: Normal (ON=127, OFF=0)
                // Type 0: Flipped (ON=0, OFF=127)
			const stateHex = newState === 1 ? 0x01 : 0x00;
            // 5. Build and send the network packet for EACH match
            buttonMatches.forEach(([idHex, cfg]) => {
				let outputVelocity;
                if (cfg.type === 0) {
                    outputVelocity = newState === 1 ? 0 : 127;
                } else {
                    outputVelocity = newState === 1 ? 127 : 0;
                }
                const packet = Buffer.concat([
                    Buffer.from(idHex, 'hex'), 
                    Buffer.from([0x00, 0x01, stateHex])
                ]);
                ws.send(packet); 
			// 6. Send the MIDI feedback (lights up the button or updates the DAW)
				midiOut2.send('noteon', { channel: msg.channel, note: msg.note, velocity: outputVelocity});            
				logger('control',`> BUTTON [${idHex}] > (Button is ${outputVelocity === 127 ? 'ON' : 'OFF'})`);
            }); 
            return;
        } 
        
        logger('unassign',`> NOTE ON > 0CHAN: ${msg.channel} NOTE: ${msg.note}`);
    }
	return;
};

async function testTrimControl(dbValue) {
    const path = 'ext/ibank/0/ch/0/trim';
    try {
        console.log(`Setting Trim 1 to ${dbValue} dB...`);
         
        // Use the exact format the 16A hardware expects
        const payload = `json=${JSON.stringify({ value: dbValue })}`;
        
        await axios.post(`http://${cmProAddr}/datastore/${path}`, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        // Wait for hardware sync
        await new Promise(r => setTimeout(r, 100));

        const res = await axios.get(`http://${cmProAddr}/datastore/${path}`);
        console.log(`Verified Trim Value: ${res.data.value} dB`);
        
        if (res.data.value == dbValue) {
            console.log("SUCCESS: Trim responded to command!");
        } else {
            console.log("FAILED: Trim did not change. It might be read-only over HTTP.");
        }
    } catch (e) {
        console.error("Communication Error:", e.message);
    }
}

/*

// http://169.254.13.223/datastore
// 169.254.13.223


"avb/0001f2fffefedf0c/current_configuration":0,
"avb/0001f2fffefedf0c/vendor_name":"MOTU",
"avb/0001f2fffefedf0c/model_name":"16A2",
"avb/0001f2fffefedf0c/serial_number":"16A2FEDF0C",
"avb/0001f2fffefedf0c/cfg/0/identify":0,
"avb/0001f2fffefedf0c/cfg/0/current_sampling_rate":48000,
"avb/0001f2fffefedf0c/cfg/0/sample_rates":"44100:48000:88200:96000:176400:192000",
"ext/ibank/0/name":"Analog",

   
*/

/*

MOTU BUGS
xxxxxxx ABC MON xxxxxx 
xxxxxxx ABC MON xxxxxxx - this length duplicates

*/




/*)
// --- SYSTEM DEFINITIONS --- ------------------------------------------------------------------
const WebSocket = require('ws');
const zlib = require('zlib');
const easymidi = require('easymidi');

// Use the IP address you found
//const url = 'ws://192.168.5.128:1280/datastore';
const url = 'ws://192.168.5.128:1280/0001f2fffefedf0c';

const motuWS = new WebSocket(url);

motuWS.on('open', () => {
    console.log("Connected to 16A Hardware WebSocket!");
    // You still need to subscribe to get continuous updates
    motuWS.send('subscribe');
}); 

motuWS.on('message', (data) => {
    // 16A sends Buffer objects. We need to decompress them.
    zlib.inflate(data, (err, buffer) => {
        if (err) {
            // If it fails to inflate, it might be a simple string message
            const text = data.toString();
            console.log("Plain text received:", text);
            return;
        }

        try {
            const jsonString = buffer.toString('utf8');
            const update = JSON.parse(jsonString);
            
            // This is your data!
            console.log("Decompressed Update:", update);
            
            // Example: Filter for fader movements
            if (update['mix/chan/0/matrix/fader']) {
                console.log("Channel 1 Fader is now:", update['mix/chan/0/matrix/fader']);
            }
        } catch (e) {
            console.error("Error parsing decompressed JSON:", e.message);
        }
    });
});

motuWS.on('error', (err) => console.error("WS Error:", err));
*/