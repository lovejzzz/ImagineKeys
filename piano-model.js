/**
 * Piano Model - Handles the audio synthesis and physical modeling
 */
class PianoModel {
    constructor() {
        // Initialize Web Audio API context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isBuilt = false;
        
        // Default piano parameters - as specified
        this.dimensions = {
            length: 80,  // cm - default length
            width: 280,  // cm - default width
            height: 40   // cm - default height
        };
        
        this.material = 'wood';
        
        // Audio nodes that will be reused
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.audioContext.destination);
        
        // Store active notes
        this.activeNotes = {};
    }
    
    /**
     * Update piano dimensions
     */
    setDimensions(length, width, height) {
        this.dimensions.length = length;
        this.dimensions.width = width;
        this.dimensions.height = height;
        
        console.log(`Piano dimensions updated: length=${length}, width=${width}, height=${height}`);
        
        // If piano is already built, rebuild with new dimensions
        if (this.isBuilt) {
            // Stop all notes before rebuilding
            this.stopAllNotes();
            
            // Apply new dimensions to master gain - realistic version
            // Larger pianos have more resonance and volume
            // Base reference is a medium grand piano (180 x 150 x 40 cm)
            const volumeFactor = (length * width * height) / (180 * 150 * 40); // Increased sensitivity
            
            console.log(`Adjusting master volume to ${volumeFactor.toFixed(2)} based on piano dimensions`);
            this.masterGain.gain.value = Math.min(0.7 * volumeFactor, 1.2); // Cap at 1.2 (20% louder)
            
            // Add subtle harmonic enhancement for larger pianos
            if (volumeFactor > 1.2) {
                console.log(`Piano is large enough to add harmonic enhancement`);
                if (!this.distortion) {
                    this.distortion = this.audioContext.createWaveShaper();
                    // Use a gentler distortion curve for realistic harmonic enhancement
                    this.distortion.curve = this.makeDistortionCurve(volumeFactor * 30);
                    this.distortion.oversample = '4x';
                    
                    // Insert distortion between masterGain and destination
                    this.masterGain.disconnect();
                    this.masterGain.connect(this.distortion);
                    this.distortion.connect(this.audioContext.destination);
                } else {
                    // Update distortion curve
                    this.distortion.curve = this.makeDistortionCurve(volumeFactor * 30);
                }
            } else if (this.distortion) {
                // Remove distortion for smaller pianos
                this.masterGain.disconnect();
                this.distortion = null;
                this.masterGain.connect(this.audioContext.destination);
            }
            
            this.buildPiano();
        }
    }
    
    /**
     * Update piano material
     */
    setMaterial(material) {
        this.material = material;
        
        // If piano is already built, rebuild with new material
        if (this.isBuilt) {
            this.buildPiano();
        }
    }
    
    /**
     * Build the piano based on current dimensions and material
     */
    buildPiano() {
        // Resume audio context if it's suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Set flag to indicate piano is built
        this.isBuilt = true;
        
        console.log(`Building piano with dimensions: ${JSON.stringify(this.dimensions)} and material: ${this.material}`);
        
        // Stop any active notes immediately (without release phase)
        // This prevents sounds from lingering when rebuilding the piano
        this.stopAllNotes(true);
        
        // Provide realistic feedback about the piano's sound characteristics
        let soundDescription = '';
        
        // Describe sound based on material - realistic descriptions
        switch (this.material) {
            case 'wood':
                soundDescription = 'warm, resonant tone with rich overtones';
                break;
            case 'metal':
                soundDescription = 'bright, clear tone with extended harmonics';
                break;
            case 'glass':
                soundDescription = 'crystalline, pure tone with transparent sound';
                break;
            case 'plastic':
                soundDescription = 'balanced, modern tone with consistent response';
                break;
        }
        
        // Describe sound based on dimensions - realistic version
        const volumeFactor = (this.dimensions.length * this.dimensions.width * this.dimensions.height) / (180 * 150 * 40);
        
        // Length affects tone and sustain
        if (this.dimensions.length > 250) {
            soundDescription += ', rich bass response'; // Concert grand (275cm)
        } else if (this.dimensions.length > 200) {
            soundDescription += ', full bass extension'; // Grand piano (200-250cm)
        } else if (this.dimensions.length < 120) {
            soundDescription += ', clear, articulate attack'; // Baby grand or smaller
        }
        
        // Width affects resonance and projection
        if (this.dimensions.width > 200) {
            soundDescription += ', powerful projection';
        } else if (this.dimensions.width > 170) {
            soundDescription += ', balanced resonance';
        } else if (this.dimensions.width < 120) {
            soundDescription += ', focused, direct sound';
        }
        
        // Height affects tonal character
        if (this.dimensions.height > 100) {
            soundDescription += ', extended sustain'; // Tall upright or cabinet grand
        } else if (this.dimensions.height > 60) {
            soundDescription += ', smooth, gradual decay'; // Standard upright
        } else if (this.dimensions.height < 30) {
            soundDescription += ', quick decay'; // Low profile piano
        }
        
        // Add harmonic enhancement description for large pianos
        if (volumeFactor > 1.2) {
            soundDescription += ', with rich harmonic overtones';
        }
        
        console.log(`Piano built with ${soundDescription}`);
        
        // Display a message to the user (if a showMessage function is available)
        if (typeof window.showMessage === 'function') {
            window.showMessage(`Piano built with ${soundDescription}. Try playing it!`);
        }
    }
    
    /**
     * Play a note with the given MIDI note number
     */
    playNote(midiNote, velocity = 0.7) {
        // First, ensure any existing note with this MIDI number is stopped
        if (this.activeNotes[midiNote]) {
            // Force immediate stop of the existing note
            this.forceStopNote(midiNote);
        }
        
        if (!this.isBuilt) {
            console.warn('Piano not built yet. Build the piano first.');
            return;
        }
        
        // If note is already playing, stop it first
        if (this.activeNotes[midiNote]) {
            this.stopNote(midiNote);
        }
        
        // Create oscillator and gain nodes for this note
        const oscillator = this.audioContext.createOscillator();
        const noteGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Calculate frequency from MIDI note number
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        // Set up oscillator
        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        
        // Set up filter based on material
        filter.type = 'lowpass';
        
        // Create a second oscillator for harmonics
        const oscillator2 = this.audioContext.createOscillator();
        const harmonicGain = this.audioContext.createGain();
        
        // Set up second oscillator
        oscillator2.frequency.value = frequency * 2; // One octave higher
        
        // Create a third oscillator for extreme effects
        const oscillator3 = this.audioContext.createOscillator();
        const effectGain = this.audioContext.createGain();
        
        // Set up third oscillator
        oscillator3.frequency.value = frequency * 3; // Higher harmonic
        
        // Create a fourth oscillator for the experimental material
        const oscillator4 = this.audioContext.createOscillator();
        const experimentalGain = this.audioContext.createGain();
        oscillator4.frequency.value = frequency * 0.5; // Sub-oscillator (one octave lower)
        
        // Material-specific sound characteristics - realistic version
        switch (this.material) {
            case 'wood':
                // Warm, resonant sound with rich overtones (like a traditional piano)
                oscillator.type = 'triangle';
                oscillator2.type = 'sine';
                oscillator3.type = 'sine';
                harmonicGain.gain.value = 0.25;
                effectGain.gain.value = 0.08;
                filter.type = 'lowpass';
                filter.frequency.value = 3500 + (this.dimensions.length * 20);
                filter.Q.value = 0.7;
                break;
            case 'metal':
                // Bright, clear sound with extended harmonics (like a metal-framed piano)
                oscillator.type = 'triangle';
                oscillator2.type = 'sawtooth';
                oscillator3.type = 'triangle';
                harmonicGain.gain.value = 0.3;
                effectGain.gain.value = 0.15;
                filter.type = 'highshelf';
                filter.frequency.value = 2000 + (this.dimensions.length * 30);
                filter.gain.value = 3.0;
                filter.Q.value = 1.0;
                break;
            case 'glass':
                // Crystalline, pure tone with transparent sound
                oscillator.type = 'sine';
                oscillator2.type = 'sine';
                oscillator3.type = 'triangle';
                harmonicGain.gain.value = 0.15;
                effectGain.gain.value = 0.1;
                filter.type = 'peaking';
                filter.frequency.value = 4000 + (this.dimensions.length * 40);
                filter.gain.value = 6.0;
                filter.Q.value = 4.0;
                break;
            case 'plastic':
                // Balanced, modern tone with consistent response
                
                // Create a more controlled waveform for main oscillator
                oscillator.type = 'triangle';
                
                // Use consistent oscillator types for harmonics
                oscillator2.type = 'sine';
                oscillator3.type = 'triangle';
                oscillator4.type = 'sine';
                
                // Set up consistent frequency for oscillator2
                oscillator2.frequency.value = frequency * 2;
                
                // Set up moderate gains for a balanced sound
                harmonicGain.gain.value = 0.2;
                effectGain.gain.value = 0.1;
                experimentalGain.gain.value = 0.05;
                
                // Use a moderate filter for a balanced tone
                filter.type = 'lowshelf';
                filter.frequency.value = 1000 + (this.dimensions.length * 20);
                filter.gain.value = -2.0;
                filter.Q.value = 0.8;
                
                // Connect oscillator4 for subtle sub-harmonics
                oscillator4.connect(experimentalGain);
                experimentalGain.connect(filter);
                break;
        }
        
        // Connect third oscillator
        oscillator3.connect(effectGain);
        effectGain.connect(filter);
        
        // Connect second oscillator
        oscillator2.connect(harmonicGain);
        harmonicGain.connect(filter);
        
        // Set up gain node for this note
        noteGain.gain.value = 0;
        
        // Connect nodes: oscillator -> filter -> noteGain -> masterGain -> destination
        oscillator.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.masterGain);
        
        // Apply EXTREME envelope based on piano dimensions
        const now = this.audioContext.currentTime;
        
        // Attack time: smaller height = faster attack (0.001 to 0.1 seconds)
        const attackTime = Math.max(0.001, 0.1 - (this.dimensions.height / 100) * 0.099);
        
        // Decay time: taller piano = longer decay (0.05 to 1.0 seconds)
        const decayTime = 0.05 + (this.dimensions.height / 100) * 0.95;
        
        // Sustain level: wider piano = higher sustain (0.1 to 0.9)
        const sustainLevel = 0.1 + (this.dimensions.width / 200) * 0.8;
        
        // Calculate release time based on piano length (longer piano = longer sustain, but not too long)
        // Range from 0.1 seconds (tiny piano) to 0.8 seconds (huge piano)
        // Shortened from previous maximum of 5.0 seconds to prevent lingering sounds
        const releaseTime = 0.1 + (this.dimensions.length / 200) * 0.7;
        
        // Attack
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity, now + attackTime);
        
        // Decay to sustain level
        noteGain.gain.linearRampToValueAtTime(sustainLevel * velocity, now + attackTime + decayTime);
        
        // Start oscillators
        oscillator.start(now);
        oscillator2.start(now);
        oscillator3.start(now);
        
        // Start oscillator4 if it's the experimental material
        if (this.material === 'experimental') {
            oscillator4.start(now);
        }
        
        // Store active note data
        this.activeNotes[midiNote] = {
            oscillator,
            oscillator2,
            oscillator3,
            oscillator4: this.material === 'experimental' ? oscillator4 : null,
            noteGain,
            filter,
            harmonicGain,
            effectGain,
            experimentalGain: this.material === 'experimental' ? experimentalGain : null,
            releaseTime
        };
    }
    
    /**
     * Stop a currently playing note
     */
    stopNote(midiNote) {
        const note = this.activeNotes[midiNote];
        if (!note) return;
        
        const now = this.audioContext.currentTime;
        
        // Apply release envelope
        note.noteGain.gain.cancelScheduledValues(now);
        note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, now);
        note.noteGain.gain.linearRampToValueAtTime(0, now + note.releaseTime);
        
        // Also fade out the harmonic gain
        if (note.harmonicGain) {
            note.harmonicGain.gain.cancelScheduledValues(now);
            note.harmonicGain.gain.setValueAtTime(note.harmonicGain.gain.value, now);
            note.harmonicGain.gain.linearRampToValueAtTime(0, now + note.releaseTime);
        }
        
        // Fade out the effect gain
        if (note.effectGain) {
            note.effectGain.gain.cancelScheduledValues(now);
            note.effectGain.gain.setValueAtTime(note.effectGain.gain.value, now);
            note.effectGain.gain.linearRampToValueAtTime(0, now + note.releaseTime);
        }
        
        // Fade out the experimental gain
        if (note.experimentalGain) {
            note.experimentalGain.gain.cancelScheduledValues(now);
            note.experimentalGain.gain.setValueAtTime(note.experimentalGain.gain.value, now);
            note.experimentalGain.gain.linearRampToValueAtTime(0, now + note.releaseTime);
        }
        
        // Stop oscillators after release with a small additional buffer to prevent pops
        const stopTime = now + note.releaseTime + 0.15; // Add a bit more time after the release
        try {
            note.oscillator.stop(stopTime);
            if (note.oscillator2) {
                note.oscillator2.stop(stopTime);
            }
            if (note.oscillator3) {
                note.oscillator3.stop(stopTime);
            }
            if (note.oscillator4) {
                note.oscillator4.stop(stopTime);
            }
        } catch (e) {
            console.warn('Error stopping oscillators in stopNote:', e);
        }
        
        // Remove note from active notes after release
        // Use a shorter timeout to ensure cleanup happens promptly
        const cleanupTime = Math.min(note.releaseTime + 0.1, 0.5) * 1000;
        setTimeout(() => {
            // Double-check the note is still in activeNotes (might have been cleared by stopAllNotes)
            if (this.activeNotes[midiNote]) {
                delete this.activeNotes[midiNote];
                console.log(`Note ${midiNote} cleanup complete`);
            }
        }, cleanupTime);
        
        // Add a backup cleanup in case the first one fails
        setTimeout(() => {
            if (this.activeNotes[midiNote] === note) {
                console.warn(`Backup cleanup for note: ${midiNote}`);
                delete this.activeNotes[midiNote];
            }
        }, cleanupTime + 1000);
        
        // Final safety net - force cleanup after 5 seconds no matter what
        setTimeout(() => {
            if (this.activeNotes[midiNote] === note) {
                console.error(`Emergency cleanup for stuck note: ${midiNote}`);
                delete this.activeNotes[midiNote];
            }
        }, 5000);
    }
    
    /**
     * Force stop a note immediately without release phase
     * @param {number} midiNote - MIDI note number to stop
     */
    forceStopNote(midiNote) {
        const note = this.activeNotes[midiNote];
        if (!note) return;
        
        const now = this.audioContext.currentTime;
        
        try {
            // Add a very short fade-out to prevent popping sounds (5ms)
            note.noteGain.gain.cancelScheduledValues(now);
            note.noteGain.gain.setValueAtTime(note.noteGain.gain.value, now);
            note.noteGain.gain.linearRampToValueAtTime(0, now + 0.005);
            
            if (note.harmonicGain) {
                note.harmonicGain.gain.cancelScheduledValues(now);
                note.harmonicGain.gain.setValueAtTime(note.harmonicGain.gain.value, now);
                note.harmonicGain.gain.linearRampToValueAtTime(0, now + 0.005);
            }
            
            if (note.effectGain) {
                note.effectGain.gain.cancelScheduledValues(now);
                note.effectGain.gain.setValueAtTime(note.effectGain.gain.value, now);
                note.effectGain.gain.linearRampToValueAtTime(0, now + 0.005);
            }
            
            if (note.experimentalGain) {
                note.experimentalGain.gain.cancelScheduledValues(now);
                note.experimentalGain.gain.setValueAtTime(note.experimentalGain.gain.value, now);
                note.experimentalGain.gain.linearRampToValueAtTime(0, now + 0.005);
            }
            
            // Stop oscillators after the short fade-out to prevent popping
            const stopTime = now + 0.01; // 10ms after fade-out completes
            try {
                note.oscillator.stop(stopTime);
                if (note.oscillator2) note.oscillator2.stop(stopTime);
                if (note.oscillator3) note.oscillator3.stop(stopTime);
                if (note.oscillator4) note.oscillator4.stop(stopTime);
            } catch (e) {
                // Ignore errors if oscillator is already stopped
                console.warn('Error stopping oscillators:', e);
            }
        } catch (e) {
            console.error('Error in forceStopNote:', e);
        } finally {
            // ALWAYS remove from active notes, even if there was an error
            delete this.activeNotes[midiNote];
            console.log(`Force stopped note ${midiNote}`);
        }
    }
    
    /**
     * Stop all currently playing notes
     * @param {boolean} immediate - If true, immediately stop all sounds without release
     */
    stopAllNotes(immediate = false) {
        if (immediate) {
            // Get all active note numbers first (to avoid modifying during iteration)
            const noteNumbers = Object.keys(this.activeNotes).map(note => parseInt(note));
            
            // Force stop each note immediately
            noteNumbers.forEach(midiNote => {
                this.forceStopNote(midiNote);
            });
        } else {
            // Normal stop with release phase
            Object.keys(this.activeNotes).forEach(midiNote => {
                this.stopNote(parseInt(midiNote));
            });
        }
    }
    
    /**
     * Get normalized parameters for the current piano configuration
     * These can be used for visualization or other purposes
     */
    getNormalizedParameters() {
        return {
            length: this.dimensions.length / 200, // Normalize to 0-1 range
            width: this.dimensions.width / 200,
            height: this.dimensions.height / 100,
            material: this.material
        };
    }
    
    /**
     * Create a distortion curve for the waveshaper node
     * @param {number} amount - Amount of distortion (0-1000)
     * @returns {Float32Array} - Distortion curve
     */
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; ++i) {
            const x = i * 2 / samples - 1;
            // Different distortion algorithms for different effects
            
            // For metal material - hard clipping
            if (this.material === 'metal') {
                curve[i] = Math.tanh(x * amount / 100);
            } 
            // For wood material - soft clipping
            else if (this.material === 'wood') {
                curve[i] = Math.sin(x * amount / 100) / Math.cos(x * deg);
            } 
            // For experimental material - extreme chaotic distortion
            else if (this.material === 'experimental') {
                // Create chaotic, unpredictable distortion
                if (x === 0) {
                    curve[i] = 0; // Avoid division by zero
                } else {
                    // Use a combination of mathematical functions for extreme distortion
                    const chaos = Math.sin(1/Math.abs(x) * amount/50) * Math.cos(x * amount/30);
                    curve[i] = chaos * Math.tanh(x * amount / 20);
                }
            }
            // For composite material - asymmetric distortion
            else {
                curve[i] = (3 + amount/200) * x * 20 * deg / (Math.PI + amount/10 * Math.abs(x));
            }
        }
        return curve;
    }
}
