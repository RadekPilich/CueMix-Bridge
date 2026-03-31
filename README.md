# CueMix-Bridge
Bi-directional MIDI-to-WebSockets bridge for MOTU CueMix 5 audio interfaces.

Bi-directional MIDI-to-Axios bridge for MOTU CueMix Pro audio interfaces.

Written in Node.js.

Requires easyMidi, axios, ws.

## Installation:
1. Download files
2. Edit your device address in config-motu
3. Edit your MIDI control device ports in config-midi

## Usage - CueMix 5:
1. Run nodemon CM5_BRIDGE.js
2. Move / press controllers you want to map in CueMix 5 and observe and note down their codes
3. Move / press controllers you want to map on your MIDI controler and observe and note down their numbers
4. Add mapping pairs to cm5map in config-cm5
