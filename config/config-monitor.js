// --- REQUIREMENTS ------------------------------------------------------------------


// --- MONITOR / LOGGER CONFIG ------------------------------------------------------------------

	// Irrelevant messages such as clock / sync we don't want to monitor
	const noiseGrp = ['1770'];  // '0801', '0802', '0b01', '4c01'

	const COLORS = {
		reset: "\x1b[0m",
		bright: "\x1b[1m",
		dim: "\x1b[2m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[94m",
		lightBlue: "\x1b[96m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m",
		white: "\x1b[37m",
	};

	const TYPE_COLORS = {
		MOTU: COLORS.blue,
		CONTROL: COLORS.green,
		ROUTING: COLORS.green,
		FEEDBACK: COLORS.cyan,
		VALUES: COLORS.yellow,
		INVALUES: COLORS.yellow,
		FBVALUES: COLORS.yellow,
		UNASSIGN: COLORS.magenta,
		ERROR: COLORS.red,
		DEFAULT: COLORS.white,
		SYSTEM: COLORS.white,
		INPUT: COLORS.lightBlue,
	};

	const TYPE_MARGIN = {
		DEFAULT: 0,
		SYSTEM: 0,
		ERROR: 0,
		UNASSIGN: 0,
		VALUES: 0,
		INPUT: 10,
		ROUTING: 20,
		INVALUES: 30,
		CONTROL: 50,
		MOTU: 70,
		FBVALUES: 85,
		FEEDBACK: 100,
	};

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	noiseGrp, COLORS, TYPE_COLORS, TYPE_MARGIN,
};
