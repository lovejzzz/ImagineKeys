/**
 * Main Application - Initializes and connects all components
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create piano model (audio synthesis)
    const pianoModel = new PianoModel();
    
    // Create piano UI (canvas visualization)
    const pianoUI = new PianoUI('pianoCanvas');
    
    // Create MIDI controller
    const midiController = new MidiController(pianoModel);
    
    // Get UI elements
    const materialSelector = document.getElementById('material');
    const buildButton = document.getElementById('buildButton');
    
    // Initialize material selector
    materialSelector.value = pianoModel.material;
    // Initialize UI material to match model
    pianoUI.setMaterial(pianoModel.material);
    
    // Add event listeners
    materialSelector.addEventListener('change', () => {
        const selectedMaterial = materialSelector.value;
        // Update both the model (for sound) and UI (for appearance)
        pianoModel.setMaterial(selectedMaterial);
        pianoUI.setMaterial(selectedMaterial);
        updateButtonText();
    });
    
    // Listen for dimension changes in the piano UI
    pianoUI.canvas.addEventListener('mouseup', () => {
        if (pianoPreviouslyBuilt) {
            updateButtonText();
        }
    });
    
    // Track if piano has been built and if changes have been made
    let pianoPreviouslyBuilt = false;
    
    // Function to update button text when changes are made
    const updateButtonText = () => {
        if (pianoPreviouslyBuilt) {
            buildButton.textContent = 'Rebuild';
        }
    };
    
    // Hide the piano keyboard initially
    const pianoContainer = document.querySelector('.piano-container');
    pianoContainer.style.display = 'none';
    
    // Create progress bar element
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-container';
    progressBarContainer.style.display = 'none';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBarContainer.appendChild(progressBar);
    
    // Add progress bar after the design panel
    const designPanel = document.querySelector('.design-panel');
    designPanel.parentNode.insertBefore(progressBarContainer, designPanel.nextSibling);
    
    buildButton.addEventListener('click', () => {
        // Get current piano dimensions from UI
        const dimensions = pianoUI.getPianoParams();
        
        // Update piano model with current dimensions
        pianoModel.setDimensions(dimensions.length, dimensions.width, dimensions.height);
        
        // Build the piano
        pianoModel.buildPiano();
        
        // Visual feedback
        buildButton.textContent = 'Building...';
        buildButton.disabled = true;
        
        // Show progress bar
        progressBarContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        // Animate progress bar over 3 seconds
        let progress = 0;
        const totalTime = 3000; // 3 seconds
        const interval = 30; // Update every 30ms
        const increment = (interval / totalTime) * 100;
        
        const progressInterval = setInterval(() => {
            progress += increment;
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // Show the piano keyboard
                pianoContainer.style.display = 'block';
                
                // Hide progress bar
                setTimeout(() => {
                    progressBarContainer.style.display = 'none';
                }, 300);
                
                // Change button text based on whether piano was previously built
                buildButton.textContent = pianoPreviouslyBuilt ? 'Rebuild' : 'Build';
                
                // Set flag to indicate piano has been built
                pianoPreviouslyBuilt = true;
                buildButton.disabled = false;
            }
        }, interval);
    });
    
    // Global safety measure - ensure all notes stop when mouse is released anywhere
    document.addEventListener('mouseup', function() {
        // Force stop any potentially stuck notes
        pianoModel.stopAllNotes();
    });
    
    // Set up a global safety mechanism to periodically check for and clean up any stuck notes
    setInterval(() => {
        if (Object.keys(pianoModel.activeNotes).length > 0) {
            console.log('Safety check: Found active notes:', Object.keys(pianoModel.activeNotes).length);
            
            // Force stop all notes that might be stuck
            Object.keys(pianoModel.activeNotes).forEach(midiNote => {
                pianoModel.forceStopNote(parseInt(midiNote));
                console.warn(`Safety mechanism: Force stopped note ${midiNote}`);
            });
        }
    }, 5000); // Check every 5 seconds
});
