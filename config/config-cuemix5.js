// --- REQUIREMENTS ------------------------------------------------------------------


// --- MAPPING DEFINITIONS --- ------------------------------------------------------------------

// FADERPORT 8 MIDI NOTES
// SELECT = 24 - 31   MUTE = 16 - 23    SOLO = 8 - 15   FADERS = 104 - 111

const cm5map = { //ID is cmdId
    trims: {
        '13930000': { name: 'MONITOR', cc: 20,  chan: 15, pitch: 99 }, 			    	// - MONITOR CueMix + Device
		'1388000f': { name: 'PHONES 1', cc: 6,  chan: 6, pitch: 6 }, 				    // - PHONES 1 CueMix
		'1388000b': { name: 'PHONES 1', cc: 6,  chan: 6, pitch: 6 },					// - PHONES 1 Device
		'1388000d': { name: 'PHONES 2', cc: 3,  chan: 3, pitch: 7 }, 					// - PHONES 2 CueMix
		'13880009': { name: 'PHONES 2', cc: 3,  chan: 3, pitch: 7 },					// - PHONES 2 Device
		'1388000c': { name: 'OUTPUT 1', cc: 0,  chan: 0, pitch: 99 },					// - OUTPUT Trim 1
        '13880008': { name: 'OUTPUT 2', cc: 0,  chan: 0, pitch: 99 },					// - OUTPUT Trim 2
        '13880001': { name: 'OUTPUT 3', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim 3
        '13880003': { name: 'OUTPUT 4', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim 4
        '13880005': { name: 'OUTPUT 5', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim 5
        '13880007': { name: 'OUTPUT 6', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim 6
        '13880006': { name: 'OUTPUT 7', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim_7
        '13880004': { name: 'OUTPUT 8', cc: 6,  chan: 0, pitch: 6 },					// - OUTPUT Trim_8
        '13880002': { name: 'OUTPUT 9', cc: 0,  chan: 0, pitch: 99 },					// - OUTPUT Trim_9
        '13880000': { name: 'OUTPUT 10', cc: 0,  chan: 0, pitch: 99 },					// - OUTPUT Trim_10
    },
    gains: {
        '13890000': { name: 'MIC 1', cc: 11,  chan: 0, pitch: 0}, 					// - MIC 1
		'13890001': { name: 'MIC 2', cc: 12,  chan: 0, pitch: 0}, 			    	// - MIC 2
        '13890002': { name: 'IN 3', cc: 13,  chan: 0, pitch: 1}, 					// - IN 3 - NUMA
		'13890003': { name: 'IN 4', cc: 14,  chan: 0, pitch: 1}, 			    	// - IN 4 - NUMA
        '13890004': { name: 'IN 5', cc: 15,  chan: 0, pitch: 99}, 					// - IN 5 - RESERVED
		'13890005': { name: 'IN 6', cc: 16,  chan: 0, pitch: 99}, 			    	// - IN 6 - RESERVED
        '13890006': { name: 'IN 7', cc: 17,  chan: 0, pitch: 2}, 					// - IN 7 - EXT 1
		'13890007': { name: 'IN 8', cc: 18,  chan: 0, pitch: 2}, 			    	// - IN 8 - EXT 2
        '13890008': { name: 'IN 9', cc: 19,  chan: 0, pitch: 3}, 					// - IN 9 - RETURN 1
		'13890009': { name: 'IN 10', cc: 20,  chan: 0, pitch: 3}, 			    	// - IN 10 - RETURN 2
    },
    faders: {
        '04030002': { name: 'DYN', cc: 31,  chan: 0, pitch: 99 }, 			    	// - DYN
        '04030004': { name: 'SUBS', cc: 32,  chan: 0, pitch: 99 },  		        // - SUBS
		'04030006': { name: 'SNDTBL', cc: 33,  chan: 0, pitch: 4 }, 		    	// - SNDTBL
		
		'03f801cc': { name: '16A-IN HEADPHONES', cc: 34,  chan: 0, pitch: 5 }, 		// - 16A-IN HEADPHONES
		'03f80224': { name: '16A-IN HEADPHONES', cc: 35,  chan: 0, pitch: 5 }, 		// - 16A-IN HEADPHONES
		'03f8006c': { name: '16A-IN DYNS', cc: 36,  chan: 0, pitch: 5 }, 			// - 16A-IN DYNS
		'03f800c4': { name: '16A-IN SUBS', cc: 37,  chan: 0, pitch: 5 }, 			// - 16A-IN SUBS
		'03f8011c': { name: '16A-IN SNDTBL', cc: 38,  chan: 0, pitch: 5 }, 			// - 16A-IN SNDTBL
		
    },
    buttons: {
			// Type 0: Flipped (ON=0, OFF=127)  Type 1: Normal (ON=127, OFF=0)
        '139b0000': { name: 'MAIN MUTE', type: 1, cc: 23, chan: 2, note: 20, note_chan: 0},		// 1 - MAIN MUTE
        '139a0000': { name: 'MAIN MONO', type: 1, cc: 23, chan: 3, note: 12, note_chan: 0},  		// 1 - MAIN MONO

        '0404000a': { name: 'HP1 MUTE', type: 1, cc: 24, chan: 2, note: 17, note_chan: 0}, 		// 2 - HP1 MUTE
        '0404000c': { name: 'HP2 MUTE', type: 1, cc: 25, chan: 2, note: 18, note_chan: 0},		// 3 - HP2 MUTE
		
		'04040002': { name: 'DYN MUTE', type: 1, cc: 26, chan: 2, note: 19, note_chan: 0},  		// 4 - DYN MUTE
        '04040004': { name: 'SUBS MUTE', type: 1, cc: 26, chan: 2, note: 19, note_chan: 0},  		// 5 - SUBS MUTE
		
        '04040006': { name: 'SNDTBL MUTE', type: 1, cc: 28, chan: 2, note: 21, note_chan: 0},  		// 6 - SNDTBL MUTE
		
        '03ff0012': { name: 'SNDTBL EQ1', type: 0, cc: 0, chan: 3, note: 29, note_chan: 0}, 		// x - SNDTBL EQ1
        '03ff0013': { name: 'SNDTBL EQ2', type: 0, cc: 0, chan: 3, note: 29, note_chan: 0},  		// x - SNDTBL EQ2
        '03ff0014': { name: 'SNDTBL EQ3', type: 0, cc: 0, chan: 3, note: 29, note_chan: 0},  		// x - SNDTBL EQ3
        '03ff000c': { name: 'SUBS EQ1', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - SUBS EQ1
        '03ff000d': { name: 'SUBS EQ2', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - SUBS EQ2
        '03ff000e': { name: 'SUBS EQ3', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - SUBS EQ3
        '03ff0006': { name: 'DYNA EQ1', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - DYNA EQ1
        '03ff0007': { name: 'DYNA EQ2', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0},  		// x - DYNA EQ2
        '03ff0008': { name: 'DYNA EQ3', type: 0, cc: 65, chan: 1, note: 27, note_chan: 0}, 		// x - DYNA EQ3
    }
};

const cm5macros = { // values are 0-127 MIDI values and are processed through  CC HANDLING section of the bridge }
        macros: [
        { 
            name: 'normalize-computer', note: 62, chan: 0,
            trims: [
                { name: 'MONITOR', val: 127}, 	
                { name: 'PHONES 1', val: 75}, 				    
                { name: 'PHONES 2', val: 0}, 			
                { name: 'OUTPUT 3', val: 75}, 				            
                { name: 'OUTPUT 4', val: 75},
                { name: 'OUTPUT 5', val: 75},
                { name: 'OUTPUT 6', val: 75},
                { name: 'OUTPUT 7', val: 75},
                { name: 'OUTPUT 8', val: 75}
                ],
        },
        { 
            name: 'normalize-dawless', note: 63, chan: 0,
            trims: [
                { name: 'MONITOR', val: 75}, 	
                { name: 'PHONES 1', val: 0}, 				    
                { name: 'PHONES 2', val: 0}, 			
                { name: 'OUTPUT 3', val: 127}, 				            
                { name: 'OUTPUT 4', val: 127},
                { name: 'OUTPUT 5', val: 127},
                { name: 'OUTPUT 6', val: 127},
                { name: 'OUTPUT 7', val: 127},
                { name: 'OUTPUT 8', val: 127}
                ],
        },
    ],
};

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	cm5map, cm5macros
};