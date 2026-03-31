// --- REQUIREMENTS ------------------------------------------------------------------

const { noiseGrp, COLORS, TYPE_COLORS, TYPE_MARGIN, } = require('../config/config-monitor');

// --- MONITOR --- SUB-STRINGIFY ------------------------------------------------------------------

	const getHex = (data) => {
		return data.toString('hex');
	};

	const getCmdGrp = (data) => {
		const hex = getHex(data);
		return hex.substring(0, 4);
	};

	const getCmdTrg = (data) => {
		const hex = getHex(data);
		return hex.substring(4, 8);
	};

	const getCmdVal = (data) => {
		const hex = getHex(data);
		return hex.substring(8);
	};

	const getCmdId = (data) => {
		const hex = getHex(data);
		return hex.substring(0, 8);
	};

// --- MONITOR --- MOTU HANDLER ------------------------------------------------------------------
		/**
		 * Main MOTU message processor
		 * @param {Buffer} data - Raw binary data from WebSocket
		 */
const handleMotuMessage = (data) => {
			const hexData = getHex(data);
			const CmdGrp = getCmdGrp(data); 
			const CmdTrg = getCmdTrg(data); 
			const CmdVal = getCmdVal(data); 
			if (noiseGrp.includes(CmdGrp)) return;
	logger('MOTU',`${CmdGrp} | ${CmdTrg} | ${CmdVal}`); 
};

// --- MONITOR --- LOGGER ------------------------------------------------------------------

	let globalLogCount = 0;
	const timestamp = new Date().toLocaleTimeString();
	const lastLogTimes = new Map();

const logger = (type, message) => {
	
	// HEADER
			const now = Date.now();
			const upperType = type.toUpperCase();
			
	// REDUCE HIGH FREQUENCY MESSAGES
		// Only throttle high-frequency stream types. 
		// Setup types (CONTROL, INPUT, SYSTEM, ERROR) should ALWAYS show up.
			const highFrequencyTypes = ['MOTU', 'INPUT', 'INVALUES', 'CONTROL', 'FEEDBACK', 'FBVALUES',]; 

			if (highFrequencyTypes.includes(upperType)) {
				const throttleKey = `${upperType}_${`${message}`.split(' ')[0]}`;
				const lastTime = lastLogTimes.get(throttleKey) || 0;
				
				if (now - lastTime < 150) {
					return; 
				}
				lastLogTimes.set(throttleKey, now);
			}
			
	// TEXT CENTERING
		//	const totalPad = 12 - upperType.length;
		//	const leftPad = Math.floor(totalPad / 2);
		//	const centeredText = upperType.padStart(leftPad + upperType.length).padEnd(12);
		
			const marginSize = TYPE_MARGIN[upperType] ?? TYPE_MARGIN.DEFAULT;
			const margin = "".padStart(marginSize);

			const timestamp = new Date().toLocaleTimeString('en-GB');
			const coloredTime = `${COLORS.dim}${timestamp}${COLORS.reset}`;
	
			const color = TYPE_COLORS[upperType] || TYPE_COLORS.DEFAULT;
			const coloredType = `${color}${upperType}${COLORS.reset}`;
			const coloredMessage = `${color}${`${message}`}${COLORS.reset}`;
		
	console.log(`${coloredTime} ${margin} [${coloredType}] ${coloredMessage}`);
	
	// CLEAN OLD LOGS
			globalLogCount++;
			if (globalLogCount >= 5000) { 
				console.clear(); 
				globalLogCount = 0; 
			}
};

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	handleMotuMessage, logger,
	getCmdId, getCmdVal, getCmdTrg, getCmdGrp,
};
