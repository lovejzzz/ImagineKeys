# Imagine Piano

A web-based physical modeling piano-building simulator that allows users to customize a piano's dimensions and material, then play it using a virtual or MIDI keyboard.

## Features

- Interactive piano silhouette that can be resized by dragging control points
- Material selection (wood, metal, composite) affecting the piano's tone
- Real-time audio synthesis using Web Audio API
- Virtual keyboard playable with mouse/touch or computer keyboard
- MIDI keyboard support via Web MIDI API

## How to Use

1. Open `index.html` in a modern web browser (Chrome recommended for best Web MIDI support)
2. Resize the piano by dragging the blue control points:
   - Corner points adjust both length and width
   - Edge points adjust either length or width
   - Red center point adjusts height
3. Select a material from the dropdown menu
4. Click the "Build Piano" button to create your custom piano
5. Play your piano using:
   - The on-screen keyboard (click/touch)
   - Your computer keyboard (keys A-L correspond to white keys, W,E,T,Y,U,O,P for black keys)
   - A connected MIDI keyboard (if your browser supports Web MIDI API)

## Technical Details

This project uses:

- HTML5 Canvas for the piano visualization
- Web Audio API for physical modeling synthesis
- Web MIDI API for MIDI keyboard support

## Browser Compatibility

For the best experience, use Google Chrome which has full support for both Web Audio API and Web MIDI API.

## License

This project is open source and available for educational and personal use.
