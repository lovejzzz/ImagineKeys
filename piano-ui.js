/**
 * Piano UI - Handles the canvas drawing and interaction
 */
class PianoUI {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas dimensions to match display size
        this.resizeCanvas();
        
        // Piano silhouette parameters - adjusted for wider appearance
        this.pianoParams = {
            length: 160,   // cm - default length (more realistic for a medium grand piano)
            width: 220,   // cm - wider default width to match reference image
            height: 40    // cm - default height
        };
        
        // Store max dimensions based on container size
        this.maxDimensions = {
            width: 320,  // Will be updated in resizeCanvas
            length: 300  // Will be updated in resizeCanvas
        };
        
        // Piano material (default: wood)
        this.material = 'wood';
        
        // Control points for resizing
        this.controlPoints = [];
        this.activePoint = null;
        this.isDragging = false;
        this.hoverPoint = null;  // Track which point is being hovered over
        
        // Initial mouse position for smooth dragging
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Piano key specifications (based on standard piano measurements)
        this.keySpecs = {
            whiteKeyWidth: 2.3,  // cm - standard piano white key width
            minKeys: 36,         // minimum number of keys (3 octaves)
            maxKeys: 88,         // maximum number of keys (standard full piano)
            standardWhiteKeys: 52, // standard 88-key piano has 52 white keys
            standardWidth: 123    // cm - width of standard 88-key keyboard
        };
        
        // Display elements for dimensions
        this.lengthDisplay = document.querySelector('#lengthDisplay span');
        this.widthDisplay = document.querySelector('#widthDisplay span');
        this.heightDisplay = document.querySelector('#heightDisplay span');
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initial draw
        this.updateControlPoints();
        this.draw();
    }
    
    /**
     * Set up event listeners for canvas interaction
     */
    initEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup');
            this.canvas.dispatchEvent(mouseEvent);
        });
        
        // Resize canvas when window resizes
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.updateControlPoints();
            this.draw();
        });
    }
    
    /**
     * Resize canvas to match display size
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Increase the canvas height to make it more proportional to the title
        this.canvas.width = rect.width;
        
        // Expand the canvas height if we're not constrained by the CSS
        // If the canvas container has a fixed height in CSS, manually adjust it
        const canvasContainer = this.canvas.parentElement;
        canvasContainer.style.height = '450px'; // Increase from 300px to 450px
        
        this.canvas.height = canvasContainer.offsetHeight;
        
        // Store the original container dimensions for reference
        this.containerWidth = rect.width;
        this.containerHeight = this.canvas.height;
        
        // Calculate max dimensions based on container size
        // Using a constant aspect ratio to prevent distortion
        const aspectRatio = 1.375; // width/length ratio (220/160 = 1.375)
        
        // Maximum dimensions in cm based on canvas size and scaling
        const scale = Math.min(this.containerWidth * 0.75, this.containerHeight * 0.75) / Math.max(220, 160);
        this.maxDimensions = {
            width: Math.min(this.containerWidth * 0.8 / scale, 320), // Max 320cm, but constrained by container
            length: Math.min(this.containerHeight * 0.8 / scale, 300) // Max 300cm, but constrained by container
        };
        
        // Force reflow to ensure the new height is applied
        this.canvas.getBoundingClientRect();
    }
    
    /**
     * Update control points based on current piano parameters
     */
    updateControlPoints() {
        // Calculate piano dimensions in canvas coordinates
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Use a consistent scale regardless of piano dimensions
        // This prevents distortion when reaching container edges
        const maxPossibleDimension = Math.max(this.maxDimensions.width, this.maxDimensions.length);
        const scale = Math.min(canvasWidth * 0.75, canvasHeight * 0.75) / maxPossibleDimension;
        
        // Calculate piano position (centered)
        const pianoWidth = this.pianoParams.width * scale;
        const pianoLength = this.pianoParams.length * scale;
        const pianoHeight = this.pianoParams.height * scale * 0.3; // Scale height for visual purposes
        
        const centerX = canvasWidth / 2;
        // Position piano with consistent vertical centering
        const centerY = canvasHeight * 0.45; // Slight offset from center
        
        const left = centerX - pianoWidth / 2;
        const right = centerX + pianoWidth / 2;
        const top = centerY - pianoLength / 2;
        const bottom = centerY + pianoLength / 2;
        
        // Define control points (edge points for width/length and center for height)
        // Add corner control points for diagonal resizing
        this.controlPoints = [
            { x: centerX, y: top, type: 'edge', affects: ['length'], directionHint: 'ns-resize' },  // Top-center
            { x: right, y: centerY, type: 'edge', affects: ['width'], directionHint: 'ew-resize' },  // Right-center
            { x: centerX, y: bottom, type: 'edge', affects: ['length'], directionHint: 'ns-resize' },  // Bottom-center
            { x: left, y: centerY, type: 'edge', affects: ['width'], directionHint: 'ew-resize' },  // Left-center
            { x: right, y: top, type: 'corner', affects: ['width', 'length'], directionHint: 'nwse-resize' },  // Top-right corner
            { x: right, y: bottom, type: 'corner', affects: ['width', 'length'], directionHint: 'nesw-resize' },  // Bottom-right corner
            { x: left, y: bottom, type: 'corner', affects: ['width', 'length'], directionHint: 'nwse-resize' },  // Bottom-left corner
            { x: left, y: top, type: 'corner', affects: ['width', 'length'], directionHint: 'nesw-resize' },  // Top-left corner
            { x: centerX, y: centerY, type: 'height', affects: ['height'], directionHint: 'all-scroll' }  // Center (height control)
        ];
        
        // Store piano dimensions for drawing
        this.pianoDimensions = {
            left, right, top, bottom, centerX, centerY,
            width: pianoWidth, length: pianoLength, height: pianoHeight,
            scale
        };
    }
    
    /**
     * Handle mouse down event
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Store initial mouse position for smooth dragging
        this.lastMouseX = mouseX;
        this.lastMouseY = mouseY;
        
        // Check if mouse is over a control point
        for (const point of this.controlPoints) {
            const distance = Math.sqrt(Math.pow(point.x - mouseX, 2) + Math.pow(point.y - mouseY, 2));
            if (distance < 20) { // Increased hit radius for better usability
                this.activePoint = point;
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
                break;
            }
        }
    }
    
    /**
     * Handle mouse move event
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update cursor style based on proximity to control points
        if (!this.isDragging) {
            let foundHoverPoint = null;
            for (const point of this.controlPoints) {
                const distance = Math.sqrt(Math.pow(point.x - mouseX, 2) + Math.pow(point.y - mouseY, 2));
                if (distance < 20) { // Increased hit radius
                    foundHoverPoint = point;
                    this.canvas.style.cursor = point.directionHint || 'grab';
                    break;
                }
            }
            
            // Only redraw if hover state changed
            if (this.hoverPoint !== foundHoverPoint) {
                this.hoverPoint = foundHoverPoint;
                this.draw();
            }
            
            if (!foundHoverPoint) {
                this.canvas.style.cursor = 'default';
            }
        }
        
        // Handle dragging of control points
        if (this.isDragging && this.activePoint) {
            const { centerX, centerY, scale } = this.pianoDimensions;
            
            // Calculate mouse delta for smoother dragging
            const deltaX = mouseX - this.lastMouseX;
            const deltaY = mouseY - this.lastMouseY;
            
            // Handle different types of control points
            if (this.activePoint.type === 'edge' || this.activePoint.type === 'corner') {
                // Update width for side edge points or corner points
                if (this.activePoint.affects.includes('width')) {
                    // Smoother width adjustment with damping factor
                    const currentWidth = this.pianoParams.width;
                    const distanceFromCenter = Math.abs(mouseX - centerX);
                    
                    // Set width limits based on container and min/max values
                    const newWidth = Math.max(
                        120, // Min width
                        Math.min(
                            this.maxDimensions.width, // Max width based on container
                            distanceFromCenter * 2 / scale
                        )
                    );
                    
                    // Apply smooth interpolation (damping)
                    this.pianoParams.width = currentWidth * 0.7 + newWidth * 0.3;
                }
                
                // Update length for top/bottom edge points or corner points
                if (this.activePoint.affects.includes('length')) {
                    // Smoother length adjustment with damping factor
                    const currentLength = this.pianoParams.length;
                    const distanceFromCenter = Math.abs(mouseY - centerY);
                    
                    // Set length limits based on container and min/max values
                    const newLength = Math.max(
                        120, // Min length
                        Math.min(
                            this.maxDimensions.length, // Max length based on container
                            distanceFromCenter * 2 / scale
                        )
                    );
                    
                    // Apply smooth interpolation (damping)
                    this.pianoParams.length = currentLength * 0.7 + newLength * 0.3;
                }
            } else if (this.activePoint.type === 'height') {
                // Smoother height adjustment
                const currentHeight = this.pianoParams.height;
                const distance = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
                // Standard grand piano heights range from 40-50cm (lid closed)
                const newHeight = Math.max(30, Math.min(70, distance / scale * 2));
                
                // Apply smooth interpolation (damping)
                this.pianoParams.height = currentHeight * 0.7 + newHeight * 0.3;
            }
            
            // Update control points and redraw
            this.updateControlPoints();
            this.draw();
            
            // Update dimension displays
            this.updateDimensionDisplay();
            
            // Store current mouse position for next frame
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }
    
    /**
     * Handle mouse up event
     */
    handleMouseUp() {
        this.isDragging = false;
        this.activePoint = null;
        // Retain hover cursor if over a point
        if (this.hoverPoint) {
            this.canvas.style.cursor = this.hoverPoint.directionHint || 'grab';
        } else {
        this.canvas.style.cursor = 'default';
        }
    }
    
    /**
     * Update dimension display elements
     */
    updateDimensionDisplay() {
        this.lengthDisplay.textContent = Math.round(this.pianoParams.length);
        this.widthDisplay.textContent = Math.round(this.pianoParams.width);
        this.heightDisplay.textContent = Math.round(this.pianoParams.height);
    }
    
    /**
     * Draw the piano silhouette and control points
     */
    draw() {
        const ctx = this.ctx;
        const { left, right, top, bottom, centerX, centerY, height, scale } = this.pianoDimensions;
        
        // Clear canvas with a subtle grid background for better spatial awareness
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Optional: Draw a subtle grid background to help with spatial awareness
        this.drawGridBackground(ctx);
        
        // Add subtle canvas border
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Set shadow for 3D effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        // Draw piano body
        const bodyGradient = ctx.createLinearGradient(left, top, right, bottom);
        
        // Set gradient based on material
        
        switch(this.material) {
            case 'wood':
                bodyGradient.addColorStop(0, '#5d4037');
                bodyGradient.addColorStop(0.7, '#8d6e63');
                bodyGradient.addColorStop(1, '#a1887f');
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                break;
            case 'metal':
                bodyGradient.addColorStop(0, '#455a64');
                bodyGradient.addColorStop(0.7, '#78909c');
                bodyGradient.addColorStop(1, '#90a4ae');
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 10;
                break;
            case 'glass':
                bodyGradient.addColorStop(0, 'rgba(200, 230, 255, 0.7)');
                bodyGradient.addColorStop(0.5, 'rgba(220, 240, 255, 0.5)');
                bodyGradient.addColorStop(1, 'rgba(240, 250, 255, 0.8)');
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 20;
                break;
            case 'plastic':
                bodyGradient.addColorStop(0, '#1a237e');
                bodyGradient.addColorStop(0.7, '#303f9f');
                bodyGradient.addColorStop(1, '#3949ab');
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 12;
                break;
            default:
                bodyGradient.addColorStop(0, '#5d4037');
                bodyGradient.addColorStop(0.7, '#8d6e63');
                bodyGradient.addColorStop(1, '#a1887f');
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
        }
        
        ctx.fillStyle = bodyGradient;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Get piano type based on length
        const pianoType = this.getPianoType();
        
        // Draw the piano body shape based on type
        if (pianoType === 'grand') {
            // Draw grand piano with curved side
            this.drawGrandPianoBody(ctx, left, right, top, bottom, centerX, centerY, height);
        } else {
            // Draw upright piano (rectangular shape with rounded corners)
            this.drawUprightPianoBody(ctx, left, right, top, bottom, cornerRadius);
        }
        
        // Reset shadow for keyboard
        ctx.shadowColor = 'rgba(0, 0, 0, 0)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Determine keyboard position based on piano type
        let keyboardWidth, keyboardLeft, keyboardTop;
        
        if (pianoType === 'grand') {
            // Grand piano: keyboard along the straight edge
            keyboardWidth = (right - left) * 0.95; // Increased from 0.8 to fill more of the piano width
            keyboardLeft = centerX - keyboardWidth / 2;
            
            // Consistent keyboard positioning regardless of piano length
            // Use a fixed distance from the bottom but constrained by piano length
            const keyboardDistance = Math.min((bottom - top) * 0.22, 40 * scale);
            keyboardTop = bottom - keyboardDistance;
        } else {
            // Upright piano: keyboard along the bottom edge
            keyboardWidth = (right - left) * 0.9;
            keyboardLeft = centerX - keyboardWidth / 2;
            keyboardTop = bottom - Math.min((bottom - top) * 0.3, 50 * scale);
        }
        
        // Keyboard background with perspective effect
        ctx.fillStyle = '#111';
        
        // Draw keyboard base with subtle perspective
        // Use a fixed keyboard base height that doesn't stretch with piano length
        const keyboardBaseHeight = Math.min(bottom - keyboardTop + 15, 65 * scale * 0.3);
        const keyboardBaseShadow = 5; // Small shadow below the keyboard
        
        ctx.beginPath();
        ctx.moveTo(keyboardLeft - 10, keyboardTop - 10);
        ctx.lineTo(keyboardLeft + keyboardWidth + 10, keyboardTop - 10);
        ctx.lineTo(keyboardLeft + keyboardWidth + 10, keyboardTop + keyboardBaseHeight);
        ctx.lineTo(keyboardLeft - 10, keyboardTop + keyboardBaseHeight);
        ctx.closePath();
        ctx.fill();
        
        // Calculate number of keys based on piano width
        // The formula scales the number of keys based on the width relative to standard 88-key piano
        const widthRatio = this.pianoParams.width / this.keySpecs.standardWidth;
        let numWhiteKeys = Math.round(this.keySpecs.standardWhiteKeys * widthRatio);
        
        // Ensure minimum and maximum key limits
        numWhiteKeys = Math.max(
            Math.ceil(this.keySpecs.minKeys * 7/12), // Convert min total keys to white keys (7 white keys per 12 total)
            Math.min(
                this.keySpecs.standardWhiteKeys,
                numWhiteKeys
            )
        );
        
        // Make sure the number of white keys is divisible by 7 (complete octaves) + 3 for final C-D-E
        // Standard piano is 7 octaves + 3 keys (52 white keys)
        const octaves = Math.floor(numWhiteKeys / 7);
        numWhiteKeys = octaves * 7 + 3; // Complete octaves + final C, D, E
        
        // Fixed key dimensions with consistent scale
        const pixelsPerCm = scale;
        
        // Calculate proper key sizes for the available space
        const fixedWhiteKeyWidth = keyboardWidth / numWhiteKeys;
        
        // Use a fixed key height that doesn't vary with piano length
        // Standard white key height is about 15cm
        const standardKeyHeight = 15 * pixelsPerCm * 0.3;
        const fixedKeyHeight = Math.min(standardKeyHeight, keyboardBaseHeight - 5);
        
        // Draw white keys with improved appearance
        for (let i = 0; i < numWhiteKeys; i++) {
            const keyX = keyboardLeft + i * fixedWhiteKeyWidth;
            const keyBottom = keyboardTop + fixedKeyHeight;
            
            // White key with subtle gradient
            const keyGradient = ctx.createLinearGradient(keyX, keyboardTop, keyX + fixedWhiteKeyWidth, keyBottom);
            keyGradient.addColorStop(0, '#ffffff');
            keyGradient.addColorStop(0.85, '#f8f8f8');
            keyGradient.addColorStop(1, '#eeeeee');
            
            ctx.fillStyle = keyGradient;
            
            // Draw key with rounded bottom corners
            ctx.beginPath();
            const cornerRadius = 2;
            
            // Top side
            ctx.moveTo(keyX, keyboardTop);
            ctx.lineTo(keyX + fixedWhiteKeyWidth, keyboardTop);
            
            // Right side
            ctx.lineTo(keyX + fixedWhiteKeyWidth, keyBottom - cornerRadius);
            
            // Bottom-right corner
            ctx.quadraticCurveTo(keyX + fixedWhiteKeyWidth, keyBottom, 
                                keyX + fixedWhiteKeyWidth - cornerRadius, keyBottom);
            
            // Bottom side
            ctx.lineTo(keyX + cornerRadius, keyBottom);
            
            // Bottom-left corner
            ctx.quadraticCurveTo(keyX, keyBottom, keyX, keyBottom - cornerRadius);
            
            // Left side back to top
            ctx.lineTo(keyX, keyboardTop);
            
            ctx.closePath();
            ctx.fill();
            
            // Key border - more subtle gray
            ctx.strokeStyle = '#d0d0d0';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            // Add subtle key face detail at the front edge
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(keyX + 0.5, keyBottom - 4, fixedWhiteKeyWidth - 1, 4);
            
            // Add subtle shadows between keys for depth
            if (i > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.07)';
                ctx.fillRect(keyX, keyboardTop, 1, fixedKeyHeight);
            }
        }
        
        // Black keys with improved sizing and positioning
        const blackKeyWidth = fixedWhiteKeyWidth * 0.65; // Slightly wider black keys (was 0.6)
        const blackKeyHeight = fixedKeyHeight * 0.64; // Proper proportion
        
        // Set black key color and shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        
        // Define the pattern for black keys location
        // Each octave has 7 white keys (C, D, E, F, G, A, B) and 5 black keys
        // Black keys are after C, D, F, G, A (indices 0, 1, 3, 4, 5 in octave)
        
        for (let octave = 0; octave < octaves; octave++) {
            // Define black key positions within each octave
            // Adjust positions for more natural appearance
            const blackKeyPositions = [
                { index: 0, offset: 0.68 }, // C#
                { index: 1, offset: 0.68 }, // D#
                { index: 3, offset: 0.68 }, // F#
                { index: 4, offset: 0.68 }, // G#
                { index: 5, offset: 0.68 }  // A#
            ];
            
            // Draw black keys for each complete octave
            blackKeyPositions.forEach(pos => {
                const whiteKeyIndex = octave * 7 + pos.index;
                const keyX = keyboardLeft + whiteKeyIndex * fixedWhiteKeyWidth + fixedWhiteKeyWidth * pos.offset;
                this.drawBlackKey(ctx, keyX, keyboardTop, blackKeyWidth, blackKeyHeight);
            });
        }
        
        // Handle the final partial octave (for C# and D#)
        if (numWhiteKeys % 7 >= 2) {
            this.drawBlackKey(ctx, keyboardLeft + (octaves * 7) * fixedWhiteKeyWidth + fixedWhiteKeyWidth * 0.68, 
                            keyboardTop, blackKeyWidth, blackKeyHeight);
        }
        
        if (numWhiteKeys % 7 >= 3) {
            this.drawBlackKey(ctx, keyboardLeft + (octaves * 7 + 1) * fixedWhiteKeyWidth + fixedWhiteKeyWidth * 0.68, 
                            keyboardTop, blackKeyWidth, blackKeyHeight);
        }
        
        // Reset shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Calculate and display the total number of keys
        const totalKeys = this.calculateTotalKeys(numWhiteKeys);
        
        // Display piano specs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        // Display number of keys
        ctx.fillText(`${totalKeys} keys`, centerX, bottom + 20);
        
        // Display piano type
        ctx.fillText(`${pianoType.charAt(0).toUpperCase() + pianoType.slice(1)} Piano`, centerX, bottom + 38);
        
        // Draw visual indicators for dimension adjustments
        this.drawDimensionIndicators();
        
        // Draw control points with improved visualization
        this.controlPoints.forEach(point => {
            const isActive = point === this.activePoint;
            const isHovered = point === this.hoverPoint;
            
            // Draw larger hit area with glow for active/hover
            if (isActive || isHovered) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw control point
            ctx.fillStyle = isActive 
                ? '#ff3d00' // bright orange for active
                : (isHovered 
                    ? '#ff9e80' // lighter orange for hover
                    : (point.type === 'height' ? '#ff6b6b' : '#3a86ff')); // normal colors
            
            // Draw a larger point
            ctx.beginPath();
            ctx.arc(point.x, point.y, isActive || isHovered ? 12 : 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add direction indicator
            if (point.affects.includes('width')) {
                // Draw horizontal arrow
                ctx.beginPath();
                ctx.moveTo(point.x - 15, point.y);
                ctx.lineTo(point.x + 15, point.y);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Arrow heads
                ctx.beginPath();
                ctx.moveTo(point.x - 15, point.y);
                ctx.lineTo(point.x - 10, point.y - 5);
                ctx.lineTo(point.x - 10, point.y + 5);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(point.x + 15, point.y);
                ctx.lineTo(point.x + 10, point.y - 5);
                ctx.lineTo(point.x + 10, point.y + 5);
                ctx.closePath();
                ctx.fill();
                
            } else if (point.affects.includes('length')) {
                // Draw vertical arrow
                ctx.beginPath();
                ctx.moveTo(point.x, point.y - 15);
                ctx.lineTo(point.x, point.y + 15);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Arrow heads
                ctx.beginPath();
                ctx.moveTo(point.x, point.y - 15);
                ctx.lineTo(point.x - 5, point.y - 10);
                ctx.lineTo(point.x + 5, point.y - 10);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(point.x, point.y + 15);
                ctx.lineTo(point.x - 5, point.y + 10);
                ctx.lineTo(point.x + 5, point.y + 10);
                ctx.closePath();
                ctx.fill();
                
            } else if (point.affects.includes('height')) {
                // Draw radial arrows for height control
                const arrowLength = 15;
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
                    const startX = point.x + Math.cos(angle) * 8;
                    const startY = point.y + Math.sin(angle) * 8;
                    const endX = point.x + Math.cos(angle) * arrowLength;
                    const endY = point.y + Math.sin(angle) * arrowLength;
                    
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    // Arrow head
                    const headSize = 5;
                    ctx.beginPath();
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(
                        endX - headSize * Math.cos(angle - Math.PI/6),
                        endY - headSize * Math.sin(angle - Math.PI/6)
                    );
                    ctx.lineTo(
                        endX - headSize * Math.cos(angle + Math.PI/6),
                        endY - headSize * Math.sin(angle + Math.PI/6)
                    );
                    ctx.closePath();
                    ctx.fill();
                }
            }
        });
    }
    
    /**
     * Draw a grand piano body
     */
    drawGrandPianoBody(ctx, left, right, top, bottom, centerX, centerY, height) {
        const cornerRadius = 15;
        const width = right - left;
        const length = bottom - top;
        
        // Calculate curve parameters for the grand piano shape
        const curveStartY = top + cornerRadius + length * 0.3; // Start curve lower down for more rectangular shape
        const curveControlX = left + width * 0.05;
        const curveControlY = top + length * 0.5; // Control point moved down for more rectangular appearance
        
        ctx.beginPath();
        
        // Start from top-left with rounded corner
        ctx.moveTo(left + cornerRadius, top);
        
        // Top edge to top-right rounded corner
        ctx.lineTo(right - cornerRadius, top);
        ctx.arcTo(right, top, right, top + cornerRadius, cornerRadius);
        
        // Right edge to bottom-right rounded corner
        ctx.lineTo(right, bottom - cornerRadius);
        ctx.arcTo(right, bottom, right - cornerRadius, bottom, cornerRadius);
        
        // Bottom edge (straight part) to bottom-left
        ctx.lineTo(left + cornerRadius, bottom);
        
        // Bottom-left rounded corner
        ctx.arcTo(left, bottom, left, bottom - cornerRadius, cornerRadius);
        
        // Left edge with characteristic grand piano curve
        ctx.lineTo(left, curveStartY);
        
        // The curved section that gives the grand piano its characteristic shape
        ctx.quadraticCurveTo(
            curveControlX,       // Control point X (close to left edge)
            curveControlY,       // Control point Y (about 1/2 from top)
            left + cornerRadius, // End at top-left with corner radius
            top
        );
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw piano legs (3 legs for grand piano)
        this.drawPianoLegs(ctx, left, right, top, bottom, 'grand');
        
        // Draw piano lid (curved with elegant shading) - adjusted for wider shape
        ctx.beginPath();
        ctx.moveTo(left + cornerRadius, top);
        ctx.quadraticCurveTo(centerX, top - height * 1.0, right - cornerRadius, top);
        ctx.stroke();
        
        // Add a subtle highlight line for more elegance
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(left + cornerRadius + 10, top + 5);
        ctx.quadraticCurveTo(centerX, top - height * 0.9 + 5, right - cornerRadius - 10, top + 5);
        ctx.stroke();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Add lid shading
        const lidGradient = ctx.createLinearGradient(centerX, top - height, centerX, top);
        lidGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        lidGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        
        ctx.fillStyle = lidGradient;
        ctx.beginPath();
        ctx.moveTo(left + cornerRadius, top);
        ctx.lineTo(right - cornerRadius, top);
        ctx.quadraticCurveTo(centerX, top - height * 0.7, left + cornerRadius, top);
        ctx.closePath();
        ctx.fill();
        
        // Add string area (soundboard) detail - adjusted position
        const soundboardGradient = ctx.createRadialGradient(
            centerX - width * 0.1, centerY - length * 0.15, 0,
            centerX - width * 0.1, centerY - length * 0.15, width * 0.4
        );
        soundboardGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
        soundboardGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        
        ctx.fillStyle = soundboardGradient;
        
        // Draw oval soundboard - adjusted for wider shape
        ctx.beginPath();
        ctx.ellipse(
            centerX - width * 0.05, centerY - length * 0.15, 
            width * 0.33, length * 0.35, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Add subtle string lines in the soundboard
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        
        // Add more strings for wider piano
        for (let i = 0; i < 12; i++) {
            const stringX = centerX - width * 0.3 + (width * 0.55 * i / 11);
            ctx.beginPath();
            ctx.moveTo(stringX, centerY - length * 0.3);
            ctx.lineTo(stringX + width * 0.15, centerY);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
    }
    
    /**
     * Draw an upright piano body
     */
    drawUprightPianoBody(ctx, left, right, top, bottom, cornerRadius) {
        const width = right - left;
        const height = bottom - top;
        
        // Simple rectangular shape with rounded corners
        ctx.beginPath();
        ctx.moveTo(left + cornerRadius, top);
        ctx.lineTo(right - cornerRadius, top);
        ctx.arcTo(right, top, right, top + cornerRadius, cornerRadius);
        ctx.lineTo(right, bottom - cornerRadius);
        ctx.arcTo(right, bottom, right - cornerRadius, bottom, cornerRadius);
        ctx.lineTo(left + cornerRadius, bottom);
        ctx.arcTo(left, bottom, left, bottom - cornerRadius, cornerRadius);
        ctx.lineTo(left, top + cornerRadius);
        ctx.arcTo(left, top, left + cornerRadius, top, cornerRadius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw piano legs (2 legs for upright piano)
        this.drawPianoLegs(ctx, left, right, top, bottom, 'upright');
        
        // Add upright piano details
        const centerX = (left + right) / 2;
        const topPanelHeight = height * 0.15;
        
        // Top decorative panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(left + 10, top + 10, width - 20, topPanelHeight);
        ctx.strokeRect(left + 10, top + 10, width - 20, topPanelHeight);
        
        // Music stand
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const musicStandWidth = width * 0.6;
        const musicStandHeight = height * 0.1;
        ctx.fillRect(
            centerX - musicStandWidth / 2,
            top + topPanelHeight + 20,
            musicStandWidth,
            musicStandHeight
        );
        
        // Add some decorative details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        
        // Lower panel details
        ctx.fillRect(
            left + width * 0.1,
            top + height * 0.6,
            width * 0.8,
            height * 0.1
        );
        
        // Side panels
        ctx.fillRect(left + 10, top + topPanelHeight + 10, width * 0.1, height * 0.5);
        ctx.fillRect(right - width * 0.1 - 10, top + topPanelHeight + 10, width * 0.1, height * 0.5);
    }
    
    /**
     * Draw piano legs
     */
    drawPianoLegs(ctx, left, right, top, bottom, pianoType) {
        const width = right - left;
        const height = bottom - top;
        const legWidth = width * 0.03;
        const legColor = 'rgba(0, 0, 0, 0.7)';
        
        // Calculate leg height based on the piano height parameter
        // This makes legs taller when the piano height increases
        const heightFactor = this.pianoParams.height / 40; // 40 is the default height
        const legHeightMultiplier = Math.max(0.8, Math.min(1.8, heightFactor));
        
        ctx.fillStyle = legColor;
        
        if (pianoType === 'grand') {
            // Three legs for grand piano
            const standardLegHeight = height * 0.15;
            const adjustedLegHeight = standardLegHeight * legHeightMultiplier;
            
            // Front-right leg - height adjusts with piano height parameter
            ctx.beginPath();
            ctx.rect(right - legWidth - width * 0.1, bottom - height * 0.05, legWidth, adjustedLegHeight);
            ctx.fill();
            
            // Front-left leg - height adjusts with piano height parameter
            ctx.beginPath();
            ctx.rect(left + width * 0.1, bottom - height * 0.05, legWidth, adjustedLegHeight);
            ctx.fill();
            
            // Back leg (centered along curve) - height adjusts with piano height parameter
            ctx.beginPath();
            ctx.rect(left + width * 0.4, top + height * 0.15, legWidth, adjustedLegHeight);
            ctx.fill();
            
            // Add foot detail to each leg
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            
            // Front-right foot
            ctx.beginPath();
            ctx.rect(right - legWidth - width * 0.1 - 5, bottom - height * 0.05 + adjustedLegHeight - 5, legWidth + 10, 5);
            ctx.fill();
            
            // Front-left foot
            ctx.beginPath();
            ctx.rect(left + width * 0.1 - 5, bottom - height * 0.05 + adjustedLegHeight - 5, legWidth + 10, 5);
            ctx.fill();
            
            // Back foot
            ctx.beginPath();
            ctx.rect(left + width * 0.4 - 5, top + height * 0.15 + adjustedLegHeight - 5, legWidth + 10, 5);
            ctx.fill();
            
            // Draw leg ornamental details for taller legs
            if (legHeightMultiplier > 1.2) {
                // Add decorative carvings on legs
                const ornamentColor = 'rgba(0, 0, 0, 0.85)';
                ctx.fillStyle = ornamentColor;
                
                // Right leg ornament
                const rightLegX = right - legWidth - width * 0.1;
                const rightLegY = bottom - height * 0.05;
                this.drawLegOrnament(ctx, rightLegX, rightLegY, legWidth, adjustedLegHeight);
                
                // Left leg ornament
                const leftLegX = left + width * 0.1;
                const leftLegY = bottom - height * 0.05;
                this.drawLegOrnament(ctx, leftLegX, leftLegY, legWidth, adjustedLegHeight);
                
                // Back leg ornament
                const backLegX = left + width * 0.4;
                const backLegY = top + height * 0.15;
                this.drawLegOrnament(ctx, backLegX, backLegY, legWidth, adjustedLegHeight);
            }
            
        } else {
            // Two legs for upright piano
            const standardLegHeight = height * 0.1;
            const adjustedLegHeight = standardLegHeight * legHeightMultiplier;
            
            // Left leg - height adjusts with piano height parameter
            ctx.beginPath();
            ctx.rect(left + width * 0.15, bottom, legWidth, adjustedLegHeight);
            ctx.fill();
            
            // Right leg - height adjusts with piano height parameter
            ctx.beginPath();
            ctx.rect(right - width * 0.15 - legWidth, bottom, legWidth, adjustedLegHeight);
            ctx.fill();
            
            // Add foot detail
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            
            // Left foot
            ctx.beginPath();
            ctx.rect(left + width * 0.15 - 5, bottom + adjustedLegHeight - 5, legWidth + 10, 5);
            ctx.fill();
            
            // Right foot
            ctx.beginPath();
            ctx.rect(right - width * 0.15 - legWidth - 5, bottom + adjustedLegHeight - 5, legWidth + 10, 5);
            ctx.fill();
            
            // Add leg ornaments for taller legs
            if (legHeightMultiplier > 1.2) {
                const ornamentColor = 'rgba(0, 0, 0, 0.85)';
                ctx.fillStyle = ornamentColor;
                
                // Left leg ornament
                const leftLegX = left + width * 0.15;
                const leftLegY = bottom;
                this.drawLegOrnament(ctx, leftLegX, leftLegY, legWidth, adjustedLegHeight);
                
                // Right leg ornament
                const rightLegX = right - width * 0.15 - legWidth;
                const rightLegY = bottom;
                this.drawLegOrnament(ctx, rightLegX, rightLegY, legWidth, adjustedLegHeight);
            }
        }
    }
    
    /**
     * Draw leg ornamental details
     */
    drawLegOrnament(ctx, legX, legY, legWidth, legHeight) {
        // Position ornaments at top and bottom of leg
        const topOrnamentY = legY + legHeight * 0.2;
        const bottomOrnamentY = legY + legHeight * 0.7;
        
        // Save current context
        ctx.save();
        
        // Top ornament (ring around leg)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(legX - 2, topOrnamentY, legWidth + 4, 3);
        
        // Bottom ornament (ring around leg)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(legX - 2, bottomOrnamentY, legWidth + 4, 3);
        
        // Add carved detail in middle for taller legs
        if (legHeight > 30) {
            ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
            
            // Central ornament for taller legs
            const middleOrnamentY = legY + legHeight * 0.45;
            
            // Create a small decorative carving
            ctx.beginPath();
            ctx.moveTo(legX - 1, middleOrnamentY);
            ctx.lineTo(legX + legWidth + 1, middleOrnamentY);
            ctx.lineTo(legX + legWidth + 1, middleOrnamentY + 8);
            ctx.lineTo(legX + legWidth/2, middleOrnamentY + 12);
            ctx.lineTo(legX - 1, middleOrnamentY + 8);
            ctx.closePath();
            ctx.fill();
            
            // Add highlight to carving
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.moveTo(legX, middleOrnamentY + 1);
            ctx.lineTo(legX + legWidth, middleOrnamentY + 1);
            ctx.lineTo(legX + legWidth - 2, middleOrnamentY + 3);
            ctx.lineTo(legX + 2, middleOrnamentY + 3);
            ctx.closePath();
            ctx.fill();
        }
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Calculate the total number of keys based on white keys
     */
    calculateTotalKeys(numWhiteKeys) {
        // Each octave has 7 white keys and 5 black keys (12 total)
        const completeOctaves = Math.floor(numWhiteKeys / 7);
        const remainingWhiteKeys = numWhiteKeys % 7;
        
        // Calculate black keys
        let blackKeys = completeOctaves * 5; // 5 black keys per octave
        
        // Add black keys for remaining white keys
        // C(w) C#(b) D(w) D#(b) E(w) F(w) F#(b) G(w) G#(b) A(w) A#(b) B(w)
        if (remainingWhiteKeys >= 2) blackKeys++; // After D
        if (remainingWhiteKeys >= 3) blackKeys++; // After E
        if (remainingWhiteKeys >= 5) blackKeys++; // After G
        if (remainingWhiteKeys >= 6) blackKeys++; // After A
        
        return numWhiteKeys + blackKeys;
    }
    
    /**
     * Get the piano type based on dimensions
     */
    getPianoType() {
        // Always return 'grand' as the default type per the reference image
        return 'grand';
    }
    
    /**
     * Draw visual indicators for dimensions
     */
    drawDimensionIndicators() {
        const ctx = this.ctx;
        const { left, right, top, bottom, centerX, centerY } = this.pianoDimensions;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        
        // Width indicator
        if (this.activePoint && this.activePoint.affects.includes('width')) {
            ctx.beginPath();
            ctx.moveTo(left, top - 25);
            ctx.lineTo(right, top - 25);
            ctx.stroke();
            
            // Draw width label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(this.pianoParams.width)} cm`, centerX, top - 30);
            
            // Draw arrows
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(left, top - 25);
            ctx.lineTo(left + 10, top - 30);
            ctx.lineTo(left + 10, top - 20);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(right, top - 25);
            ctx.lineTo(right - 10, top - 30);
            ctx.lineTo(right - 10, top - 20);
            ctx.closePath();
            ctx.fill();
        }
        
        // Length indicator
        if (this.activePoint && this.activePoint.affects.includes('length')) {
            ctx.beginPath();
            ctx.moveTo(right + 25, top);
            ctx.lineTo(right + 25, bottom);
            ctx.stroke();
            
            // Draw length label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.save();
            ctx.translate(right + 30, centerY);
            ctx.rotate(Math.PI/2);
            ctx.fillText(`${Math.round(this.pianoParams.length)} cm`, 0, 0);
            ctx.restore();
            
            // Draw arrows
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(right + 25, top);
            ctx.lineTo(right + 30, top + 10);
            ctx.lineTo(right + 20, top + 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(right + 25, bottom);
            ctx.lineTo(right + 30, bottom - 10);
            ctx.lineTo(right + 20, bottom - 10);
            ctx.closePath();
            ctx.fill();
        }
        
        // Height indicator
        if (this.activePoint && this.activePoint.affects.includes('height')) {
            // Draw a circular indicator
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw height label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(this.pianoParams.height)} cm`, centerX, centerY - 50);
        }
        
        // Reset line style
        ctx.setLineDash([]);
    }
    
    /**
     * Get current piano parameters
     */
    getPianoParams() {
        return { ...this.pianoParams };
    }
    
    /**
     * Set piano material and redraw
     */
    setMaterial(material) {
        this.material = material;
        this.draw();
    }
    
    /**
     * Draw a subtle grid background to help with spatial awareness
     */
    drawGridBackground(ctx) {
        const gridSize = 50; // Increased grid size for better visual appeal with larger canvas
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)'; // Slightly more visible grid
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }
    }
    
    /**
     * Helper method to draw a black key
     */
    drawBlackKey(ctx, x, y, width, height) {
        // Save context for shadow
        ctx.save();
        
        // Black key with subtle gradient
        const blackKeyGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        blackKeyGradient.addColorStop(0, '#272727');
        blackKeyGradient.addColorStop(0.85, '#0a0a0a');
        blackKeyGradient.addColorStop(1, '#000');
        
        ctx.fillStyle = blackKeyGradient;
        
        // Draw black key with rounded bottom corners
        ctx.beginPath();
        const cornerRadius = 2;
        
        // Top side
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        
        // Right side
        ctx.lineTo(x + width, y + height - cornerRadius);
        
        // Bottom-right corner
        ctx.quadraticCurveTo(x + width, y + height, 
                            x + width - cornerRadius, y + height);
        
        // Bottom side
        ctx.lineTo(x + cornerRadius, y + height);
        
        // Bottom-left corner
        ctx.quadraticCurveTo(x, y + height, 
                            x, y + height - cornerRadius);
        
        // Left side back to top
        ctx.lineTo(x, y);
        
        ctx.closePath();
        ctx.fill();
        
        // Key border - thinner for more elegant appearance
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.75;
        ctx.stroke();
        
        // Restore context (to avoid applying shadow to highlight)
        ctx.restore();
        
        // Add glossy highlight on black keys for realism
        // Two-tone highlight for more realistic appearance
        const highlightWidth = width - 4;
        
        // Upper highlight (stronger)
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + width - 2, y + 2);
        ctx.lineTo(x + width - 4, y + height * 0.25);
        ctx.lineTo(x + 4, y + height * 0.25);
        ctx.closePath();
        ctx.fill();
        
        // Lower highlight (more subtle)
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + height * 0.25);
        ctx.lineTo(x + width - 4, y + height * 0.25);
        ctx.lineTo(x + width - 6, y + height * 0.5);
        ctx.lineTo(x + 6, y + height * 0.5);
        ctx.closePath();
        ctx.fill();
    }
}
