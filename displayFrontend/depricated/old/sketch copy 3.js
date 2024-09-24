let socket;
let wordsMap = new Map(); // Map to track word ID and its corresponding sprite
let wordQueue = [];
let wordIds = new Set(); // Track ids of words currently displayed
let page = 1;
let perPage = 50;
let currentZIndex = 99999;
let allWordsFetched = false;
let collisionForce = 0.5;
let dragForce = 0.98;
let wordSprites;
let inactivityTimeout;

let collisionForceSlider;
let dragForceSlider;

let grid = [];
let cell = 8;
let tileWidth = cell;
let tileHeight = cell;
let numRows, numCols;

function setup() {
    createCanvas(windowWidth, windowHeight);
    background('#502d4d');

    socket = io.connect('http://{{ ip_address }}:5000');

    calculateGridDimensions(); // Calculate grid based on canvas size
    initializeGrid(); // Initialize grid with empty cells
    fetchWords();  // Initial fetch to populate the display
    setInterval(spawnNextWord, 3000); // Periodically spawn words from the queue

    wordSprites = new Group();

    collisionForceSlider = createSlider(0, 1, collisionForce, 0.01);
    collisionForceSlider.position(10, 10);
    collisionForceSlider.style('width', '200px');

    dragForceSlider = createSlider(0.9, 1, dragForce, 0.01);
    dragForceSlider.position(10, 40);
    dragForceSlider.style('width', '200px');

    // Real-time WebSocket events
    socket.on('new_word', function (word) {
        if (!wordIds.has(word.id)) {
            wordQueue.push(word);
            wordIds.add(word.id);
        }
    });
    

    socket.on('remove_word', function (data) {
        removeWordById(data.id);
    });
}

function draw() {
    background('#000000'); // Clear the background each frame

    wordSprites.forEach(wordSprite => {
        wordSprite.velocity.x *= dragForce;
        wordSprite.velocity.y *= dragForce;
    
        // Apply any easing or growth logic if needed
        if (wordSprite.easing) {
            let duration = 2000;
            let time = millis() - wordSprite.easingStart;
            if (time < duration) {
                let progress = time / duration;
                progress = easeOutQuad(progress);
                wordSprite.scale = progress * wordSprite.originalScale;
            } else {
                wordSprite.scale = wordSprite.originalScale;
                wordSprite.easing = false;
            }
        }
    
        // Remove word if out of bounds
        if (isOutOfBounds(wordSprite)) {
            removeWordById(wordSprite.wordId);
        }
    
        // Custom draw method handles bounding box and word rendering
        fillOccupiedGridCells(wordSprite);
        wordSprite.draw();
    });
    
    // Handle collision, but only if both sprites have collision enabled
    wordSprites.collide(wordSprites, (a, b) => {
        if (a.collisionEnabled && b.collisionEnabled) {  // Only handle collisions if both sprites are collision-enabled
            handleCollision(a, b);  // Handle the actual collision physics
            drawMinDistanceCircle(a, b);  // Optional visualization
        }
    });
    drawGrid();  // Draw the grid for debugging
     // Fill the grid cells occupied by the words
    // // Handle collision
    // wordSprites.collide(wordSprites, (a, b) => {
    //     handleCollision(a, b);  // Handle the actual collision physics
    //     drawMinDistanceCircle(a, b);  // Optional visualization
    // });
}



function fillOccupiedGridCells(wordSprite) {
    let padding = 20; // Padding for the bounding box
    let wordWidth = textWidth(wordSprite.word.string) * wordSprite.scale + padding;
    let wordHeight = wordSprite.textSize * wordSprite.scale + padding;

    // Get the top-left and bottom-right coordinates of the bounding box
    let topLeftX = wordSprite.position.x - wordWidth / 2;
    let topLeftY = wordSprite.position.y - wordHeight / 2;
    let bottomRightX = wordSprite.position.x + wordWidth / 2;
    let bottomRightY = wordSprite.position.y + wordHeight / 2;

    // Determine the grid cell range that this bounding box occupies
    let startCol = floor(topLeftX / tileWidth);
    let startRow = floor(topLeftY / tileHeight);
    let endCol = floor(bottomRightX / tileWidth);
    let endRow = floor(bottomRightY / tileHeight);

    // Ensure the range is within bounds of the grid
    startCol = constrain(startCol, 0, numCols - 1);
    startRow = constrain(startRow, 0, numRows - 1);
    endCol = constrain(endCol, 0, numCols - 1);
    endRow = constrain(endRow, 0, numRows - 1);

    // Fill the grid cells within the bounding box range
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            let x = col * tileWidth;
            let y = row * tileHeight;

            // Fill the grid cell
            fill(255, 0, 0, 100); // Red color with low opacity
            noStroke();
            rect(x, y, tileWidth, tileHeight); // Fill the grid cell, exactly matching the grid dimensions
        }
    }
}



function drawWordBoundingBox(wordSprite) {
    textAlign(CENTER, CENTER);
    
    // Update text size dynamically during growth
    textSize(wordSprite.textSize * wordSprite.scale);
    fill(255);

    // Calculate width and height with padding
    let wordWidth = textWidth(wordSprite.word.string) * wordSprite.scale + 20; // 10px padding on each side
    let wordHeight = wordSprite.textSize * wordSprite.scale + 20; // 10px padding above and below

    // Draw the word centered
    text(wordSprite.word.string, wordSprite.position.x, wordSprite.position.y);

    // Draw the bounding box (collision box)
    noFill(); 
    stroke(255, 0, 0); // Red outline for the bounding box
    rectMode(CENTER); 
    rect(wordSprite.position.x, wordSprite.position.y, wordWidth, wordHeight);  // Draw the rectangle around the word
}


function calculateGridDimensions() {
    // Calculate how many rows and columns fit based on the canvas size and tile dimensions
    numCols = floor(width / tileWidth);
    numRows = floor(height / tileHeight);
}

function initializeGrid() {
    // Create a 2D array with empty cells
    grid = new Array(numRows);
    for (let row = 0; row < numRows; row++) {
        grid[row] = new Array(numCols).fill(null); // null indicates an empty cell
    }
}

function drawGrid() {
    stroke(200); // Light grey outline for the grid
    noFill();    // No fill for the grid cells
    
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            let x = col * tileWidth;
            let y = row * tileHeight;
            rect(x, y, tileWidth, tileHeight); // Draw the grid
        }
    }
}


function createWordSprite(word) {
    let baseSize = 16;  // Base font size
    let maxSize = 64;   // Maximum font size based on word count
    
    // Scale font size based on the word's count
    let size = map(word.count, 1, 100, baseSize, maxSize);
    
    // Set text size before calculating the dimensions
    textSize(size);
    
    // Calculate the full width and height of the word (with padding)
    let wordWidth = textWidth(word.string) ; // Add 10px padding on each side
    let wordHeight = size ; // Add 10px padding above and below

    // Generate the occupied grid
    let occupiedGrid = generateOccupiedGrid();

    // Try to find an empty spot on the grid where the word can fit
    let spawnLocation = findEmptyGridCell(wordWidth, wordHeight, occupiedGrid);
    
    if (spawnLocation) {
        console.log("Spawning word at:", spawnLocation);  // Debug: Log where the word is spawned
        
        // Create the word sprite using the calculated position
        let wordSprite = createSprite(spawnLocation.x, spawnLocation.y);

        wordSprite.textSize = size;
        // wordSprite.velocity.x = random(-1, 1);
        // wordSprite.velocity.y = random(-1, 1);
        wordSprite.velocity.x =0
        wordSprite.velocity.y =0
        // Start small and grow via easing
        wordSprite.originalScale = 1;
        wordSprite.scale = 0;  // Start at a tiny scale for the word
        wordSprite.boundingBoxScale = 0;  // Start the bounding box at 0

        wordSprite.easing = true;
        wordSprite.easingStart = millis();  // Track start time for easing
        
        wordSprite.wordId = word.id;
        wordSprite.word = word;  // Attach word data
        
        wordSprite.collisionEnabled = false;

        // Gradually enable collision with a buffer zone
        setTimeout(() => {
            wordSprite.collisionEnabled = true;
            console.log("Collision enabled for:", word.id);

        }, 100);  // 500ms delay before enabling full collision

        // Push nearby words gently to make space for the new word
       // pushNearbyWordsGently(wordSprite);

        wordSprite.draw = function() {
            // Translate to the sprite's position
            push();  // Save the current drawing context
            translate(this.position.x, this.position.y);  // Move the origin to the sprite's position
        
            textAlign(CENTER, CENTER);
            textSize(this.textSize * this.scale);
            fill(255);
            
            // Draw the word centered
            text(this.word.string, 0, 0);  // Since we translated, we can use 0, 0 as the center
        
            // Animate the bounding box scaling more slowly than the word
            let boundingBoxDelay = 500;  // Delay the bounding box by 500ms
            let boundingBoxDuration = 2500;  // Make it grow slower than the word
            let timeSinceStart = millis() - this.easingStart;
        
            if (timeSinceStart > boundingBoxDelay && timeSinceStart - boundingBoxDelay < boundingBoxDuration) {
                let progress = (timeSinceStart - boundingBoxDelay) / boundingBoxDuration;
                progress = easeOutQuad(progress);  // Easing for smooth growth
                this.boundingBoxScale = progress * this.originalScale;
            } else if (timeSinceStart - boundingBoxDelay >= boundingBoxDuration) {
                this.boundingBoxScale = this.originalScale;  // Set final bounding box scale
            }
        
            // Draw the bounding box (collision box) with the slower animation
            let padding = 20;  // Padding for the bounding box
            let wordWidth = textWidth(this.word.string) * this.boundingBoxScale + padding;
            let wordHeight = this.textSize * this.boundingBoxScale + padding;
        
            noFill(); 
            stroke(255, 0, 0);  // Red outline for the bounding box
            rectMode(CENTER); 
            rect(0, 0, wordWidth, wordHeight);  // Draw the rectangle around the word at the origin
        
            pop();  // Restore the drawing context to the previous state
        };
        

        wordSprites.add(wordSprite);
        wordsMap.set(word.id, wordSprite);  // Store sprite reference by word ID
    } else {
        console.log("No valid spawn location found for word:", word.string);
    }
}


function pushNearbyWordsGently(newWordSprite) {
    wordSprites.forEach(existingWord => {
        let distance = dist(newWordSprite.position.x, newWordSprite.position.y, existingWord.position.x, existingWord.position.y);
        let minDistance = (textWidth(newWordSprite.word.string) + textWidth(existingWord.word.string)) / 2 + 30; // A buffer zone

        if (distance < minDistance) {
            console.log("Pushing nearby words gently:", distance, minDistance);
            console.log("Before push - Existing Word:", existingWord.word.string, "Position:", existingWord.position.x, existingWord.position.y);
            console.log("Before push - New Word:", newWordSprite.word.string, "Position:", newWordSprite.position.x, newWordSprite.position.y);

            // Apply a gentle force to push the existing word away
            let dx = existingWord.position.x - newWordSprite.position.x;
            let dy = existingWord.position.y - newWordSprite.position.y;
            let angle = atan2(dy, dx);

            let pushForce = map(distance, 0, minDistance, 0.000002, 0); // Stronger push when words are closer
            existingWord.velocity.x += cos(angle) * pushForce;
            existingWord.velocity.y += sin(angle) * pushForce;

            console.log("After push - Existing Word Velocity:", existingWord.velocity.x, existingWord.velocity.y);
        }
    });
}




function generateOccupiedGrid() {
    // Initialize the grid as empty
    let occupiedGrid = new Array(numRows);
    for (let row = 0; row < numRows; row++) {
        occupiedGrid[row] = new Array(numCols).fill(false);  // false indicates an empty cell
    }

    // Loop over the current word sprites to mark the grid cells they occupy
    wordSprites.forEach(wordSprite => {
        let padding = 20;
        let wordWidth = textWidth(wordSprite.word.string) * wordSprite.scale + padding;
        let wordHeight = wordSprite.textSize * wordSprite.scale + padding;

        // Get the top-left and bottom-right coordinates of the bounding box
        let topLeftX = wordSprite.position.x - wordWidth / 2;
        let topLeftY = wordSprite.position.y - wordHeight / 2;
        let bottomRightX = wordSprite.position.x + wordWidth / 2;
        let bottomRightY = wordSprite.position.y + wordHeight / 2;

        // Determine the grid cell range that this bounding box occupies
        let startCol = floor(topLeftX / tileWidth);
        let startRow = floor(topLeftY / tileHeight);
        let endCol = floor(bottomRightX / tileWidth);
        let endRow = floor(bottomRightY / tileHeight);

        // Ensure the range is within bounds of the grid
        startCol = constrain(startCol, 0, numCols - 1);
        startRow = constrain(startRow, 0, numRows - 1);
        endCol = constrain(endCol, 0, numCols - 1);
        endRow = constrain(endRow, 0, numRows - 1);

        // Mark the grid cells within the bounding box as occupied
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                occupiedGrid[row][col] = true;  // Mark this cell as occupied
            }
        }
    });

    return occupiedGrid;  // Return the array of occupied cells
}



function findEmptyGridCell(wordWidth, wordHeight, occupiedGrid) {
    let centerX = Math.floor(numCols / 2);
    let centerY = Math.floor(numRows / 2);

    let spiralSize = 1;  // Size of the current spiral (step size)
    let x = centerX;
    let y = centerY;

    let dx = 1;
    let dy = 0;

    let stepsTaken = 0;
    let changeDirection = 1;  // Spiral will change direction every step

    // Use a while loop to ensure we check all cells
    while (stepsTaken < numCols * numRows) {
        // Calculate how many cells are required for the word's width and height
        let cellsRequiredX = ceil(wordWidth / tileWidth);
        let cellsRequiredY = ceil(wordHeight / tileHeight);

        // Ensure we are within grid bounds
        if (x < 0 || x + cellsRequiredX > numCols || y < 0 || y + cellsRequiredY > numRows) {
            x += dx;
            y += dy;
            stepsTaken++;
            continue;  // Skip this location if it's out of bounds
        }

        // Check if all the required cells are empty
        let fits = true;
        for (let row = y; row < y + cellsRequiredY; row++) {
            for (let col = x; col < x + cellsRequiredX; col++) {
                if (occupiedGrid[row][col]) {
                    fits = false;
                    break;
                }
            }
            if (!fits) break;
        }

        if (fits) {
            // Return the center coordinates of the valid region
            let spawnLocation = { x: x * tileWidth + wordWidth / 2, y: y * tileHeight + wordHeight / 2 };
            console.log("Found valid location:", spawnLocation);
            return spawnLocation;
        }

        // Move to the next cell in the current direction
        x += dx;
        y += dy;
        stepsTaken++;

        // Change direction in a spiral pattern when the edge of the current spiral is reached
        if (stepsTaken % spiralSize === 0) {
            [dx, dy] = [-dy, dx];  // Swap direction

            if (changeDirection % 2 === 0) {
                spiralSize++;  // Increase spiral size after every second direction change
            }
            changeDirection++;
        }
    }

    return null;  // No valid spot found
}



// Function to draw the square around the current block of grid cells being checked
function drawSquare(x, y, width, height) {
    stroke('red'); // Set stroke color to red
    strokeWeight(2); // Set stroke weight to 2
    noFill(); // Ensure the square is not filled
    rect(x, y, width, height); // Draw the rectangle
}

// Function to check if a block of grid cells can fit the word
function canFitInGridRegion(x, y, wordWidth, wordHeight) {
    let cellsRequiredX = ceil(wordWidth / tileWidth);
    let cellsRequiredY = ceil(wordHeight / tileHeight);

    let startCol = floor(x / tileWidth);
    let startRow = floor(y / tileHeight);

    // Ensure the region stays within grid bounds
    if (startCol + cellsRequiredX > numCols || startRow + cellsRequiredY > numRows) {
        console.log(`Word exceeds grid bounds: StartCol: ${startCol}, StartRow: ${startRow}, CellsRequiredX: ${cellsRequiredX}, CellsRequiredY: ${cellsRequiredY}, numCols: ${numCols}, numRows: ${numRows}`);
        return false;  // Word doesn't fit within grid bounds
    }

    // Check if all the required cells in the region are empty
    for (let row = startRow; row < startRow + cellsRequiredY; row++) {
        for (let col = startCol; col < startCol + cellsRequiredX; col++) {
            if (grid[row][col] !== null) {
                console.log(`Cell at row ${row}, col ${col} is occupied`);
                return false;  // If any cell in the region is occupied, return false
            }
        }
    }

    console.log(`Word can fit: StartCol: ${startCol}, StartRow: ${startRow}, CellsRequiredX: ${cellsRequiredX}, CellsRequiredY: ${cellsRequiredY}`);
    return true;  // All cells are empty, the word can fit
}







function spawnNextWord() {
    if (wordQueue.length > 0) {
        let word = wordQueue.shift();
        createWordSprite(word);
    }
}

function fetchWords() {
    fetch(`http://{{ ip_address }}:5000/strings?page=${page}&per_page=${perPage}`)
        .then(response => response.json())
        .then(data => {
            if (data.data.length > 0) {
                data.data.forEach(word => {
                    if (!wordIds.has(word.id)) {
                        wordQueue.push(word);
                        wordIds.add(word.id);
                    }
                });
                if (data.data.length === perPage) {
                    page++;
                    fetchWords(); // Fetch more if there's more data
                } else {
                    allWordsFetched = true;
                }
            } else {
                allWordsFetched = true;
            }
        })
        .catch(error => {
            console.error('Error fetching words:', error);
        });
}

function removeWordById(id) {
    let wordSprite = wordsMap.get(id);
    if (wordSprite) {
        wordSprites.remove(wordSprite);
        wordSprite.remove();
        wordsMap.delete(id);
        wordIds.delete(id);
    }
}

function isOutOfBounds(sprite) {
    const n = 50;
    return (
        sprite.position.x + sprite.width / 2 < -n || 
        sprite.position.x - sprite.width / 2 > width + n || 
        sprite.position.y + sprite.height / 2 < -n || 
        sprite.position.y - sprite.height / 2 > height + n
    );
}

function drawMinDistanceCircle(a, b) {
    let wordAWidth = textWidth(a.word.string);
    let wordBWidth = textWidth(b.word.string);
    let wordAHeight = a.textSize;
    let wordBHeight = b.textSize;

    // Calculate the minimum distance between word A and word B
    let minDistance = sqrt((wordAWidth / 2) ** 2 + (wordAHeight / 2) ** 2) + 
                      sqrt((wordBWidth / 2) ** 2 + (wordBHeight / 2) ** 2);

    // Draw the circle for word A
    stroke(0, 255, 0);  // Green stroke for the distance visualization
    strokeWeight(2);  // Set the stroke weight for better visibility
    noFill();  // No fill, just the outline
    ellipse(a.position.x, a.position.y, minDistance);  // Draw the circle for word A

    // Draw the circle for word B
    ellipse(b.position.x, b.position.y, minDistance);  // Draw the circle for word B
}


function handleCollision(a, b) {
    if (!a.word || !b.word) return;
    // log the words that are colliding
    console.log("Collision detected between:", a.word.string, "and", b.word.string);
    let wordAWidth = textWidth(a.word.string) * a.boundingBoxScale; // Use boundingBoxScale
    let wordBWidth = textWidth(b.word.string) * b.boundingBoxScale;
    let wordAHeight = a.textSize * a.boundingBoxScale; // Use boundingBoxScale
    let wordBHeight = b.textSize * b.boundingBoxScale;

    let overlapX = (a.position.x < b.position.x + wordBWidth) && (a.position.x + wordAWidth > b.position.x);
    let overlapY = (a.position.y < b.position.y + wordBHeight) && (a.position.y + wordAHeight > b.position.y);

    if (overlapX && overlapY) {
        let dx = a.position.x - b.position.x;
        let dy = a.position.y - b.position.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let minDistance = (wordAWidth + wordBWidth) / 2;

        if (distance < minDistance) {
            console.log("Collision detected between:", a.word.string, "and", b.word.string);
            let force = collisionForce * (minDistance - distance) / minDistance;

            if (a.collisionEnabled && b.collisionEnabled) {
                force *= 0.0005;
            }

            let forceX = (dx / distance) * force;
            let forceY = (dy / distance) * force;

            a.velocity.x += forceX;
            a.velocity.y += forceY;
            b.velocity.x -= forceX;
            b.velocity.y -= forceY;

            console.log("New velocities -", a.word.string, ":", a.velocity.x, a.velocity.y, " | ", b.word.string, ":", b.velocity.x, b.velocity.y);
        }
    }
}









function easeOutQuad(t) {
    return t * (2 - t);
}
