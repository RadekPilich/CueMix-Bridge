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

	let intVal = 0;
		let floatVal = 0;

		// MOTU messages: 2 bytes Group + 2 bytes Trigger + X bytes Value
		// If length is 5, value is 1 byte (0-255)
		if (data.length === 5) {
			intVal = data.readUInt8(4);
			floatVal = intVal; // Usually just an index
		} 
		// If length is 8, value is 4 bytes (32-bit)
		else if (data.length === 8) {
			intVal = data.readUInt32BE(4);
			floatVal = data.readFloatBE(4); // Most balances are IEEE 754 floats
		}

		// Format float to 3 decimal places for readability
		const displayFloat = floatVal.toFixed(3);

logger('MOTU', `${CmdGrp} | ${CmdTrg} | Hex: ${CmdVal} | Int: ${intVal} | Float: ${displayFloat}`);
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