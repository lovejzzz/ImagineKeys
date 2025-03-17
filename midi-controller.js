/**
 * MIDI Controller - Handles MIDI input and virtual keyboard
 */
class MidiController {
    constructor(pianoModel) {
        this.pianoModel = pianoModel;
        this.midiAccess = null;
        this.midiInputs = [];
        this.activeInputs = new Set();
        
        // Virtual keyboard element
        this.keyboardElement = document.getElementById('keyboard');
        this.midiStatusElement = document.getElementById('midiStatus');
        
        // Virtual keyboard configuration
        this.keyboardConfig = {
            startNote: 48, // C3
            endNote: 72,   // C5
            whiteKeyWidth: 40,
            blackKeyWidth: 24
        };
        
        // Default piano width (used for calculating key range)
        this.pianoWidth = 150; // cm
        
        // Calculate the actual width based on the container size
        const updateKeyboardDimensions = () => {
            if (this.keyboardElement) {
                const containerWidth = this.keyboardElement.clientWidth;
                const whiteKeysCount = 21; // Number of white keys in our range
                this.keyboardConfig.whiteKeyWidth = Math.floor(containerWidth / whiteKeysCount);
                this.keyboardConfig.blackKeyWidth = Math.floor(this.keyboardConfig.whiteKeyWidth * 0.6);
            }
        };
        
        // Update dimensions on window resize
        window.addEventListener('resize', () => {
            updateKeyboardDimensions();
            this.createVirtualKeyboard();
        });
        
        // Initial update
        setTimeout(updateKeyboardDimensions, 0);
        
        // Map of computer keyboard keys to MIDI notes (similar to SequencePuzzle)
        this.keyboardMapping = {
            'z': 48, 's': 49, 'x': 50, 'd': 51, 'c': 52, 'v': 53, 'g': 54, 'b': 55,
            'h': 56, 'n': 57, 'j': 58, 'm': 59, 'q': 60, '2': 61, 'w': 62, '3': 63, 'e': 64,
            'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71, 'i': 72
        };
        
        // Track pressed keys
        this.pressedKeys = new Set();
        
        // Initialize
        this.initMIDI();
        this.createVirtualKeyboard();
        this.initKeyboardListeners();
    }
    
    /**
     * Initialize Web MIDI API
     */
    async initMIDI() {
        if (!navigator.requestMIDIAccess) {
            console.warn('Web MIDI API not supported in this browser');
            this.updateMidiStatus('MIDI: Not supported in this browser');
            return;
        }
        
        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log('MIDI access granted');
            
            this.updateMIDIDevices();
            
            // Listen for MIDI device changes
            this.midiAccess.onstatechange = (event) => {
                console.log(`MIDI connection state change: ${event.port.name} - ${event.port.state}`);
                this.updateMIDIDevices();
            };
        } catch (error) {
            console.error('Failed to get MIDI access:', error);
            this.updateMidiStatus('MIDI: Access denied');
        }
    }
    
    /**
     * Update available MIDI devices
     */
    updateMIDIDevices() {
        // Clear existing inputs
        this.midiInputs = [];
        this.activeInputs.clear();
        
        if (!this.midiAccess) return;
        
        // Get all available inputs
        const inputs = this.midiAccess.inputs.values();
        let deviceCount = 0;
        
        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            this.midiInputs.push(input.value);
            deviceCount++;
            
            // Connect input
            input.value.onmidimessage = this.handleMIDIMessage.bind(this);
            this.activeInputs.add(input.value.id);
            
            console.log(`MIDI Input: ${input.value.name} (${input.value.manufacturer})`);
        }
        
        // Update status display
        if (deviceCount > 0) {
            this.updateMidiStatus(`MIDI: ${deviceCount} device${deviceCount !== 1 ? 's' : ''} connected`);
            console.log(`${deviceCount} MIDI input(s) detected`);
        } else {
            this.updateMidiStatus('MIDI: No devices connected');
            console.log('No MIDI inputs detected');
        }
    }
    
    /**
     * Update MIDI status display
     */
    updateMidiStatus(message) {
        if (this.midiStatusElement) {
            this.midiStatusElement.textContent = message;
        }
    }
    
    /**
     * Handle incoming MIDI messages
     */
    handleMIDIMessage(message) {
        const command = message.data[0] & 0xF0; // Mask channel (lower 4 bits)
        const note = message.data[1]; // MIDI note number
        const velocity = message.data[2] / 127; // Convert to 0-1 range
        
        // Track MIDI notes with a timestamp to prevent rapid on/off cycles
        // that might cause stuck notes
        const now = Date.now();
        const noteKey = `${note}`;
        
        // Handle note on/off messages
        switch (command) {
            case 0x90: // Note On
                if (velocity > 0) {
                    console.log(`MIDI Note On: ${note} (${this.getNoteNameFromMidi(note)}) - Velocity: ${velocity}`);
                    
                    // Force stop the note first to ensure clean start
                    if (this.pianoModel) {
                        this.pianoModel.forceStopNote(note);
                    }
                    
                    // Then play the note
                    this.noteOn(note, velocity);
                } else {
                    // Some devices send Note On with velocity 0 instead of Note Off
                    console.log(`MIDI Note Off (via Note On with velocity 0): ${note}`);
                    this.noteOff(note);
                }
                break;
                
            case 0x80: // Note Off
                console.log(`MIDI Note Off: ${note}`);
                
                // Make sure we really stop the note
                if (this.pianoModel) {
                    // Use forceStopNote to ensure it's really stopped
                    this.pianoModel.forceStopNote(note);
                }
                
                this.noteOff(note);
                break;
        }
    }
    
    /**
     * Create virtual keyboard in the DOM
     */
    createVirtualKeyboard() {
        if (!this.keyboardElement) return;
        
        // Clear existing keyboard
        this.keyboardElement.innerHTML = '';
        
        const { startNote, endNote } = this.keyboardConfig;
        
        // Calculate number of white keys in our range
        let whiteKeyCount = 0;
        for (let note = startNote; note <= endNote; note++) {
            const noteType = note % 12;
            // White keys are C, D, E, F, G, A, B (notes 0, 2, 4, 5, 7, 9, 11)
            if (![1, 3, 6, 8, 10].includes(noteType)) {
                whiteKeyCount++;
            }
        }
        
        // Create white keys first
        const whiteKeys = [];
        let whiteKeyIndex = 0;
        
        for (let note = startNote; note <= endNote; note++) {
            const noteType = note % 12;
            // White keys are C, D, E, F, G, A, B (notes 0, 2, 4, 5, 7, 9, 11)
            if (![1, 3, 6, 8, 10].includes(noteType)) {
                const keyElement = document.createElement('div');
                keyElement.className = 'piano-key white';
                keyElement.dataset.note = note;
                keyElement.id = `key${note}`;
                
                // Position the white key
                const leftPosition = (whiteKeyIndex / whiteKeyCount) * 100;
                keyElement.style.left = `${leftPosition}%`;
                
                // Add key label (note name)
                const noteName = this.getNoteNameFromMidi(note);
                const keyLabel = document.createElement('div');
                keyLabel.className = 'key-label';
                keyLabel.textContent = noteName;
                keyElement.appendChild(keyLabel);
                
                // We're not showing computer key labels anymore (only note names)
                
                // Add event listeners with improved handling to prevent stuck notes
                keyElement.addEventListener('mousedown', (e) => {
                    // Prevent double-click text selection
                    e.preventDefault();
                    
                    // Store the note being played to track it
                    keyElement.dataset.isPlaying = 'true';
                    this.noteOn(note, 0.7);
                });
                
                keyElement.addEventListener('mouseup', () => {
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(note);
                    }
                });
                
                keyElement.addEventListener('mouseleave', () => {
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(note);
                    }
                });
                
                // Touch events with improved handling
                keyElement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    keyElement.dataset.isPlaying = 'true';
                    this.noteOn(note, 0.7);
                });
                
                keyElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(note);
                    }
                });
                
                keyElement.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(note);
                    }
                });
                
                this.keyboardElement.appendChild(keyElement);
                whiteKeys.push({ element: keyElement, note, index: whiteKeyIndex });
                whiteKeyIndex++;
            }
        }
        
        // Then add black keys on top
        for (let i = 0; i < whiteKeys.length - 1; i++) {
            const whiteNote = whiteKeys[i].note;
            const nextWhiteNote = whiteKeys[i + 1].note;
            
            // If there's a gap of 2 semitones, there's a black key in between
            if (nextWhiteNote - whiteNote === 2) {
                const blackNote = whiteNote + 1;
                const keyElement = document.createElement('div');
                keyElement.className = 'piano-key black';
                keyElement.dataset.note = blackNote;
                keyElement.id = `key${blackNote}`;
                
                // Position the black key between the two white keys
                // Calculate the position based on the current white key's position
                const currentWhiteKey = whiteKeys[i];
                const nextWhiteKey = whiteKeys[i + 1];
                
                // Position halfway between the two white keys
                const leftPosition = ((currentWhiteKey.index + 0.75) / whiteKeyCount) * 100;
                keyElement.style.left = `${leftPosition}%`;
                
                // Add computer key label if mapped
                const computerKey = this.getComputerKeyForNote(blackNote);
                if (computerKey) {
                    const computerKeyLabel = document.createElement('div');
                    computerKeyLabel.className = 'key-label';
                    computerKeyLabel.style.bottom = '15px';
                    computerKeyLabel.textContent = computerKey.toUpperCase();
                    keyElement.appendChild(computerKeyLabel);
                }
                
                // Add event listeners with improved handling to prevent stuck notes
                keyElement.addEventListener('mousedown', (e) => {
                    // Prevent double-click text selection
                    e.preventDefault();
                    
                    // Store the note being played to track it
                    keyElement.dataset.isPlaying = 'true';
                    this.noteOn(blackNote, 0.7);
                });
                
                keyElement.addEventListener('mouseup', () => {
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(blackNote);
                    }
                });
                
                keyElement.addEventListener('mouseleave', () => {
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(blackNote);
                    }
                });
                
                // Touch events with improved handling
                keyElement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    keyElement.dataset.isPlaying = 'true';
                    this.noteOn(blackNote, 0.7);
                });
                
                keyElement.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(blackNote);
                    }
                });
                
                keyElement.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    if (keyElement.dataset.isPlaying === 'true') {
                        keyElement.dataset.isPlaying = 'false';
                        this.noteOff(blackNote);
                    }
                });
                
                this.keyboardElement.appendChild(keyElement);
            }
        }
    }
    
    /**
     * Initialize computer keyboard listeners
     */
    initKeyboardListeners() {
        // Key down event
        window.addEventListener('keydown', (e) => {
            // Ignore if key is already pressed or if typing in an input
            if (this.pressedKeys.has(e.key) || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                return;
            }
            
            const note = this.keyboardMapping[e.key.toLowerCase()];
            if (note) {
                this.noteOn(note, 0.7);
                this.pressedKeys.add(e.key);
            }
        });
        
        // Key up event
        window.addEventListener('keyup', (e) => {
            const note = this.keyboardMapping[e.key.toLowerCase()];
            if (note) {
                this.noteOff(note);
                this.pressedKeys.delete(e.key);
            }
        });
        
        // Clear all notes when window loses focus
        window.addEventListener('blur', () => {
            this.pressedKeys.clear();
            this.pianoModel.stopAllNotes();
            this.clearAllPlayingFlags();
        });
        
        // Global mouseup and touchend handlers as safety measures
        window.addEventListener('mouseup', () => {
            // Check if any keys are still marked as playing and force stop them
            this.clearAllPlayingFlags();
        });
        
        window.addEventListener('touchend', () => {
            this.clearAllPlayingFlags();
        });
    }
    
    /**
     * Play a note
     */
    noteOn(note, velocity = 0.7) {
        // Ensure the note is within our keyboard range
        if (note < this.keyboardConfig.startNote || note > this.keyboardConfig.endNote) {
            console.log(`Note ${note} (${this.getNoteNameFromMidi(note)}) is outside keyboard range (${this.keyboardConfig.startNote}-${this.keyboardConfig.endNote})`);
            return;
        }
        
        // First stop the note if it's already playing (handles double-clicks)
        if (this.pianoModel) {
            // Force stop the note before playing it again
            this.pianoModel.forceStopNote(note);
            
            // Now play the note
            this.pianoModel.playNote(note, velocity);
        }
        
        // Update virtual keyboard UI
        this.updateKeyUI(note, true);
    }
    
    /**
     * Stop a note
     */
    noteOff(note) {
        // Ensure the note is within our keyboard range
        if (note < this.keyboardConfig.startNote || note > this.keyboardConfig.endNote) {
            return;
        }
        
        // Stop the note using the piano model
        if (this.pianoModel) {
            // First try to force stop it to ensure it's really stopped
            this.pianoModel.forceStopNote(note);
            
            // Then do a normal stop (this is redundant but ensures compatibility)
            this.pianoModel.stopNote(note);
        }
        
        // Update virtual keyboard UI
        this.updateKeyUI(note, false);
    }
    
    /**
     * Update key UI state (pressed/released)
     */
    updateKeyUI(note, isActive) {
        // Try to find by data-note attribute first
        let keyElement = this.keyboardElement.querySelector(`[data-note="${note}"]`);
        
        // If not found, try by id
        if (!keyElement) {
            keyElement = document.getElementById(`key${note}`);
        }
        
        if (keyElement) {
            if (isActive) {
                keyElement.classList.add('active');
            } else {
                keyElement.classList.remove('active');
            }
        } else {
            console.log(`Could not find key element for note ${note}`);
        }
    }
    
    /**
     * Get note name from MIDI note number (e.g., C4, D#3)
     */
    getNoteNameFromMidi(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteName = noteNames[midiNote % 12];
        const octave = Math.floor(midiNote / 12) - 1;
        return noteName + octave;
    }
    
    /**
     * Get computer keyboard key for a given MIDI note
     */
    getComputerKeyForNote(midiNote) {
        // Reverse lookup in the keyboard mapping
        for (const [key, note] of Object.entries(this.keyboardMapping)) {
            if (note === midiNote) {
                return key;
            }
        }
        return null;
    }
    
    /**
     * Update keyboard range based on piano width
     * @param {number} pianoWidth - Width of the piano in cm
     */
    updateKeyboardRange(pianoWidth) {
        this.pianoWidth = pianoWidth;
        
        // Standard piano key width is about 2.3cm
        const standardKeyWidth = 2.3; // cm
        
        // Calculate how many white keys we can fit based on the piano width
        // We want at least 7 keys (one octave) and at most 52 keys (standard 88-key piano has 52 white keys)
        const idealNumWhiteKeys = Math.floor(pianoWidth / standardKeyWidth);
        const numWhiteKeys = Math.max(7, Math.min(52, idealNumWhiteKeys));
        
        // Calculate how many octaves we can fit
        const octaves = Math.floor(numWhiteKeys / 7);
        
        // Middle C is MIDI note 60, we'll center our keyboard around it
        const middleC = 60;
        const octaveSize = 12; // semitones in an octave
        
        // Calculate start and end notes to center around middle C
        this.keyboardConfig.startNote = middleC - Math.floor(octaves / 2) * octaveSize;
        this.keyboardConfig.endNote = this.keyboardConfig.startNote + (octaves * 7) * 12 / 7;
        
        // Make sure we start on a C note (MIDI note number divisible by 12)
        this.keyboardConfig.startNote = Math.floor(this.keyboardConfig.startNote / 12) * 12;
        
        // Recreate the virtual keyboard with the new range
        this.createVirtualKeyboard();
        
        console.log(`Piano width: ${pianoWidth}cm, Keys: ${numWhiteKeys}, Range: ${this.getNoteNameFromMidi(this.keyboardConfig.startNote)} to ${this.getNoteNameFromMidi(this.keyboardConfig.endNote)}`);
    }
    
    /**
     * Clear all playing flags and ensure no notes are stuck
     */
    clearAllPlayingFlags() {
        if (!this.keyboardElement) return;
        
        // Find all keys marked as playing and stop them
        const playingKeys = this.keyboardElement.querySelectorAll('[data-is-playing="true"]');
        
        playingKeys.forEach(key => {
            const note = parseInt(key.dataset.note);
            if (!isNaN(note)) {
                // Stop the note
                this.pianoModel.stopNote(note);
                // Update UI
                this.updateKeyUI(note, false);
                // Clear playing flag
                key.dataset.isPlaying = 'false';
            }
        });
    }
}
