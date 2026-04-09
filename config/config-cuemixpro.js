// --- REQUIREMENTS --- ------------------------------------------------------------------

const { handleMotuMessage, logger, getCmdId, getCmdVal, getCmdTrg, getCmdGrp, } = require('../lib/motu-monitor');


// --- MAPPING / ROUTINGS DEFINITIONS --- ------------------------------------------------------------------

const cmpMap = { 
		// name is only descriptive grouping of complete configurations
		// trg and src defines patch connection to be established
    buttons: [
        { 
            name: 'init', note: 79, chan: 0,
            routings: [
                { trg: 'AA-MAIN', src: 'MIX-MAIN' },
                { trg: 'AA-SUBS', src: 'MIX-SUBS' },
                { trg: 'AA-AUX1', src: 'MIX-AUX1' },
                { trg: 'AA-AUX2', src: 'MIX-AUX2' },
                { trg: 'AB-HP1', src: 'MIX-HP1' },
                { trg: 'AB-HP2', src: 'MIX-HP2' },
            ]
        },
        { 
            name: 'sonarworks', note: 78, chan: 0,
            routings: [
                { trg: 'MIX-MAIN', src: 'SW-MAIN' },
                { trg: 'MIX-SUBS', src: 'SW-SUBS' },
                { trg: 'MIX-AUX1', src: 'SW-AUX1' },
                { trg: 'MIX-AUX2', src: 'SW-AUX2' },
                { trg: 'MIX-HP1', src: 'SW-HP1' },
                { trg: 'MIX-HP2', src: 'SW-HP2' },
            ]
        },
        { 	
            name: 'dawless', note: 76, chan: 0,
            routings: [
                { trg: 'MIX-MAIN', src: 'MAIN' },
                { trg: 'MIX-SUBS', src: 'MAIN' },
                { trg: 'MIX-AUX1', src: 'MAIN' },
                { trg: 'MIX-AUX2', src: 'MAIN' },
                { trg: 'MIX-HP1', src: 'MON' },
                { trg: 'MIX-HP2', src: 'MAIN' },
            ]
        },
/*         { 
            name: 'xxx', note: 0, chan: 0,
            routings: [
                { trg: 'xxx', src: 'xxx' },
                { trg: 'xxx', src: 'xxx' },
                { trg: 'xxx', src: 'xxx' },
                { trg: 'xxx', src: 'xxx' },
                { trg: 'xxx', src: 'xxx' },
                { trg: 'xxx', src: 'xxx' },
            ]
        }, */
    ],
};

/*

MIX BUSES
- MAIN - MAIN FROM SW // MAIN FROM MIX --> INTO DELAY / OPT OUTS vs. INTO ABC (not really, would need double delays)
- HP1 - MONITOR FROM SW // MONITOR FROM MIX
- HP2 - MAIN HP FROM SW // MAIN FROM MIX

OPTICAL OUTS
- MAIN - MIX BUS MAIN
- HP1 - MIX BUS HP1
- HP2 - MIX BUS HP2

*/


// --- CUEMIXPRO DEFINITIONS --- ------------------------------------------------------------------

const chanDef = {
			// IDs are user friendly channel names that corresponds src / trg in mapping above
			// name = channel name to be used in CUEMIXPRO
	ibank: {
		// FIXED MIXER OUTPUTS
		'MAIN': { grpCode: 'MAIN', name: 'MAIN', chanID: 0, stereo: 1 },
		'MON': { grpCode: 'MON', name: 'MAIN', chanID: 0, stereo: 1 },
		'REVERB': { grpCode: 'MON', name: 'MAIN', chanID: 0, stereo: 1 },
		// HOST OUTPUTS
		'SW-MAIN': { grpCode: 'HOST', name: 'MAIN (FROM HOST)', chanID: 6, stereo: 1 },			// FROM SW
		'SW-SUBS': { grpCode: 'HOST', name: 'SUBS (FROM HOST)', chanID: 8, stereo: 1 },
		'SW-AUX1': { grpCode: 'HOST', name: 'AUX1 (FROM HOST)', chanID: 10, stereo: 1 },
		'SW-AUX2': { grpCode: 'HOST', name: 'AUX2 (FROM HOST)', chanID: 12, stereo: 1 },
		'SW-HP1': { grpCode: 'HOST', name: 'HP1 (FROM HOST)', chanID: 14, stereo: 1 },
		'SW-HP2': { grpCode: 'HOST', name: 'HP2 (FROM HOST)', chanID: 16, stereo: 1 },
		},
	obank: {
		// ADAT-A OUTPUTS
		'AA-MAIN': { grpCode: 'ADAT-A', name: 'MAIN (AA)', chanID: 0, stereo: 1 }, 		// TO ADAT-A
		'AA-SUBS': { grpCode: 'ADAT-A', name: 'SUBS (AA)', chanID: 2, stereo: 1 },
		'AA-AUX1': { grpCode: 'ADAT-A', name: 'AUX1 (AA)', chanID: 4, stereo: 1 },
		'AA-AUX2': { grpCode: 'ADAT-A', name: 'AUX2 (AA)', chanID: 6, stereo: 1 },
		// ADAT-B OUTPUTS
		'AB-HP1': { grpCode: 'ADAT-B', name: 'HP1 (AB)', chanID: 0, stereo: 1 }, 		// TO ADAT-B
		'AB-HP2': { grpCode: 'ADAT-B', name: 'HP2 (AB)', chanID: 2, stereo: 1 },
		},
	mixer: {
		// MIXER INPUTS // POST-FX OUTPUTS
		'MIX-MAIN': { grpCode: 'MIX', name: 'MAIN (B)', chanID: 52, stereo: 1 }, 		// TO ADAT-A   FROM MAIN
		'MIX-SUBS': { grpCode: 'MIX', name: 'SUBS (B)', chanID: 54, stereo: 1 },
		'MIX-AUX1': { grpCode: 'MIX', name: 'AUX1 (B)', chanID: 56, stereo: 1 },
		'MIX-AUX2': { grpCode: 'MIX', name: 'AUX2 (B)', chanID: 58, stereo: 1 },
		'MIX-HP1': { grpCode: 'MIX', name: 'HP1 (B)', chanID: 60, stereo: 1 },			// TO ADAT-B
		'MIX-HP2': { grpCode: 'MIX', name: 'HP2 (B)', chanID: 62, stereo: 1 },
	},
};

// --- HARDWARE DEFINITIONS --- ------------------------------------------------------------------

const grpDef = {
			// IDs are user friendly input / output group names (replacing chanIDs) that corresponds grpCode in channel definitions above
			// name = channel name to be used in CUEMIXPRO
    ibank: { //inputs
        'TRS': { grpID: 0,  maxCh: 16 }, // name + trim + trimRange
		'ADAT-A': { grpID: 1,  maxCh: 8 }, // name
		'ADAT-B': { grpID: 2,  maxCh: 8 }, // name
		'HOST': { grpID: 3,  maxCh: 128 }, // name
		'A01': { grpID: 4,  maxCh: 8 }, // name
		'A02': { grpID: 5,  maxCh: 8 }, // name
		'A16': { grpID: 19,  maxCh: 8 }, // name
		'REVERB': { grpID: 21,  maxCh: 2 }, // name
		'GROUP': { grpID: 22,  maxCh: 0 }, // name
		'MAIN': { grpID: 23,  maxCh: 2 }, // name
		'AUX': { grpID: 24,  maxCh: 26 },	// name   -- ABC MIX = AUX:24 AUX:25  PRE-SW = AUX:22 AUX:23
		'MON': { grpID: 25,  maxCh: 2 }, // name
	},
    obank: { //outputs
        'TRS': { grpID: 0,  maxCh: 16 },  // name + trim + trimRange + src
		'ADAT-A': { grpID: 1,  maxCh: 8 }, // name + src      	<<---------
		'ADAT-B': { grpID: 2,  maxCh: 8 },  // name + src		<<---------
		'HOST': { grpID: 3,  maxCh: 128 },  // name + src
		'A01': { grpID: 4,  maxCh: 8 },  // name + src
		'A02': { grpID: 5,  maxCh: 8 },  // name + src
		'A16': { grpID: 19,  maxCh: 8 },  // name + src
	},
	mixer: { //mixer
		'MIX': { grpID: 20,  maxCh: 64 }, //  name + src    //PostFX -- loopback = MIX:58 MIX:59  
	},
};

// --- MANIPULATIONS --- ------------------------------------------------------------------

// Helper to find a Channel definition in either its specific bank or the mixer bank
const findChan = (id) => {
    const key = id.toUpperCase(); // Normalize to UPPERCASE
    return chanDef.ibank[key] || chanDef.obank[key] || chanDef.mixer[key];
};

// Helper to find a Group definition across all banks
const findGrp = (grpCode) => {
    const key = grpCode.toUpperCase(); // Normalize to UPPERCASE
    return grpDef.ibank[key] || grpDef.obank[key] || grpDef.mixer[key];
};

// --- MAPPING CHECKER ------------------------------------------------------------------


const checkMappingsPro = () => {
    logger('SYSTEM', '--- Starting CueMix Pro Routings Verification ---');
    let errorCount = 0; 

    cmpMap.buttons.forEach(btn => {
        btn.routings.forEach(route => {
            // Check Source and Target using our new helper
            const src = findChan(route.src);
            const trg = findChan(route.trg);

            if (!src) {
                logger('ERROR', `[${btn.name}]: Source '${route.src}' not found in ibank or mixer.`);
                errorCount++;
            }
            if (!trg) {
                logger('ERROR', `[${btn.name}]: Target '${route.trg}' not found in obank or mixer.`);
                errorCount++;
            }

            // If channels exist, check if their grpCodes are valid
            if (src && !findGrp(src.grpCode)) {
                logger('ERROR', `[${route.src}]: grpCode '${src.grpCode}' missing from grpDef.`);
                errorCount++;
            }
            if (trg && !findGrp(trg.grpCode)) {
                logger('ERROR', `[${route.trg}]: grpCode '${trg.grpCode}' missing from grpDef.`);
                errorCount++;
            }
        });
    });
    logger('DEFAULT', '--- Verification Completed ---');
    if (errorCount > 0) {
        logger('SYSTEM', `!!! Verification Failed: ${errorCount} errors. !!!`);
        process.exit(1);
    };
    logger('DEFAULT', '--- Verification Passed ---');
};

/* const checkMappingsPro = () => {
    logger('SYSTEM', '--- Starting Map Verification ---');
    let errorCount = 0;

    cmpMap.buttons.forEach(btn => {
        btn.routings.forEach(route => {
            // Check Source
            if (!chanDef.ibank[route.src]) {
                logger('ERROR', `Mapping [${btn.name}]: Source '${route.src}' not found in chanDef.ibank`);
                errorCount++;
            } else {
                // Check if the group code exists in grpDef
                const srcGrpCode = chanDef.ibank[route.src].grpCode;
                if (!grpDef.ibank[srcGrpCode]) {
                    logger('ERROR', `chanDef [${route.src}]: Group Code '${srcGrpCode}' not found in grpDef.ibank`);
                    errorCount++;
                }
            }

            // Check Target
            if (!chanDef.obank[route.trg]) {
                logger('ERROR', `Mapping [${btn.name}]: Target '${route.trg}' not found in chanDef.obank`);
                errorCount++;
            } else {
                // Check if the group code exists in grpDef
                const trgGrpCode = chanDef.obank[route.trg].grpCode;
                if (!grpDef.obank[trgGrpCode]) {
                    logger('ERROR', `chanDef [${route.trg}]: Group Code '${trgGrpCode}' not found in grpDef.obank`);
                    errorCount++;
                }
            }
        });
    });

    if (errorCount > 0) {
        logger('SYSTEM', `!!! Verification Failed: ${errorCount} errors found. Fix these before running !!!`);
        process.exit(1); // Stop the script if there are errors
    } else {
        logger('SYSTEM', '--- Verification Passed: Map is clean ---');
    }
};
 */

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	grpDef, chanDef, findChan, findGrp,cmpMap, checkMappingsPro, 
};