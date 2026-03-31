# CueMix-Bridge
Bi-directional MIDI-to-WebSockets bridge for MOTU CueMix 5 audio interfaces.

Bi-directional MIDI-to-Axios bridge for MOTU CueMix Pro audio interfaces.

Written in Node.js.

Requires easyMidi, axios, ws.

## Installation:
1. Download files
2. Edit your device address in config-motu
3. Edit your MIDI control device ports in config-midi

## CueMix 5:
### Usage and mapping:
1. Run nodemon CM5_BRIDGE.js
2. Move / press controllers you want to map in CueMix 5 and observe and note down their codes
3. Move / press controllers you want to map on your MIDI controler and observe and note down their numbers
4. Add / edit mapping pairs inside the cm5map in config-cuemix5

### Expectations / Limitations:
1. Control of balances, EQs and compressors will not work out of the box at the moment. That would require additional conversions, that are currently not implemented.
2. Control of trims, on/off buttons and faders is should be generally working, but there might be some specific instances in CueMix, that expect different value ranges and could therefore not work correctly.

## CueMix Pro:
### Usage and mapping:
1. Run nodemon CMPRO_BRIDGE.js (will be added in 2026/Q2)
2. ....
