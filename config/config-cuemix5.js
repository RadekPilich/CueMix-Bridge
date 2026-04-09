// --- MAPPING DEFINITIONS --- ------------------------------------------------------------------

const cm5map = { //ID is cmdId
    trims: {
        '13930000': { cc: 1,  chan: 0, pitch: 0}, 					// 1 - MONITOR CueMix + Device
		'1388000f': { cc: 11,  chan: 0, pitch: 1 }, 				// 2 - PHONES 1 CueMix
		'1388000b': { cc: 11,  chan: 0, pitch: 1 },					// 2 - PHONES 1 Device
		'1388000d': { cc: 7,  chan: 0, pitch: 1 }, 					// 2 - PHONES 2 CueMix
		'13880009': { cc: 7,  chan: 0, pitch: 1 },					// 2 - PHONES 2 Device
    },
    gains: {
        '13890004': { cc: 12,  chan: 0, pitch: 6}, 					// 5 - Numa L
		'13890005': { cc: 12,  chan: 0, pitch: 6}, 			    	// 6 - Numa R
    },
    faders: {
        '04030002': { cc: 10, chan: 0, pitch: 2 }, 					// 44 - DYN
        '04030004': { cc: 10,  chan: 0, pitch: 2 },  				// 44 - SUBS
		'04030006': { cc: 0,  chan: 0, pitch: 3 }, 					// 6 - SNDTBL
		
		'03f801cc': { cc: 0,  chan: 0, pitch: 4 }, 					// 6 - 16A-IN HEADPHONES
		'03f80224': { cc: 0,  chan: 0, pitch: 4 }, 					// 6 - 16A-IN HEADPHONES
		'03f8006c': { cc: 0,  chan: 0, pitch: 4 }, 					// 6 - 16A-IN DYNS
		'03f800c4': { cc: 0,  chan: 0, pitch: 4 }, 					// 6 - 16A-IN SUBS
		'03f8011c': { cc: 0,  chan: 0, pitch: 4 }, 					// 6 - 16A-IN SNDTBL
		
    },
    buttons: {
        '139b0000': { type: 1, cc: 23, chan: 2, note: 16, note_chan: 0},		// 1 - MAIN MUTE
        '0404000a': { type: 1, cc: 24, chan: 2, note: 17, note_chan: 0}, 		// 2 - HP1 MUTE
        '0404000c': { type: 1, cc: 25, chan: 2, note: 18, note_chan: 0},		// 3 - HP2 MUTE
		
		'04040002': { type: 1, cc: 26, chan: 2, note: 19, note_chan: 0},  		// 4 - DYN MUTE
        '04040004': { type: 1, cc: 26, chan: 2, note: 19, note_chan: 0},  		// 5 - SUBS MUTE
		
        '04040006': { type: 1, cc: 28, chan: 2, note: 21, note_chan: 0},  		// 6 - SNDTBL MUTE
		
        '139a0000': { type: 1, cc: 23, chan: 3, note: 8, note_chan: 0},  		// 1 - MAIN MONO
		
        '03ff0012': { type: 0, cc: 00, chan: 3, note: 29, note_chan: 0}, 		// x - SNDTBL EQ1
        '03ff0013': { type: 0, cc: 00, chan: 3, note: 29, note_chan: 0},  		// x - SNDTBL EQ2
        '03ff0014': { type: 0, cc: 00, chan: 3, note: 29, note_chan: 0},  		// x - SNDTBL EQ3
        '03ff000c': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - SUBS EQ1
        '03ff000d': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - SUBS EQ2
        '03ff000e': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - SUBS EQ3
        '03ff0006': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - DYNA EQ1
        '03ff0007': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - DYNA EQ2
        '03ff0008': { type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - DYNA EQ3
    }
};

// FADERPORT 8 MIDI NOTES
// SELECT = 24 - 31   MUTE = 16 - 23    SOLO = 8 - 15   FADERS = 104 - 111

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
            grouped[trigger].push(id);
        });

        // Print Grouped Results
        Object.entries(grouped).forEach(([trigger, ids]) => {
            const count = ids.length > 1 ? ` 🔥 [1:${ids.length} MULTI]` : '';
            console.log(`${trigger.padEnd(20)} -> ${ids.join(', ')}${count}`);
        });
    };

    report('TRIMS', cm5map.trims);
    report('FADERS', cm5map.faders);
    report('BUTTONS', cm5map.buttons);
    
    console.log('\n--- AUDIT COMPLETE: Bridge is live ---\n'); 
    console.log('\n--- ATTENTION: Make sure to view the MOTU BRIDGE monitor on full screen (*)  ---\n');
	console.log(' (* or zoom out apropriately to avoid the logs being interupted by line breaks *)');
	
};

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	cm5map, checkMappings,
};