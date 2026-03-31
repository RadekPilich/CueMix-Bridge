// --- REQUIREMENTS ------------------------------------------------------------------
const axios = require('axios');
const WebSocket = require('ws');

// --- MOTU / CUEMIX CONFIG ------------------------------------------------------------------

		// currently handling single CUEMIX PRO and / or single CUEMIX 5 device

	// CUEMIX PRO
		//  (16A) 169.254.13.223/16A2FEDF0C
	const cmProAddr = '169.254.13.223';
	// CUEMIX 5
		//  (828) 127.0.0.1:1281/828E071FBQ
	const cm5Addr = 'ws://127.0.0.1:1281/828E071FBQ'; 
	const ws = new WebSocket(cm5Addr);

// --- MODULE EXPORTS ------------------------------------------------------------------

module.exports = {
	axios, 	ws, 
	cmProAddr, cm5Addr, 
};
