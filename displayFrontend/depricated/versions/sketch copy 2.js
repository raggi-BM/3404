let socket;
let wordsMap = new Map(); // Map to track word ID and its corresponding sprite
let wordQueue = [];
let wordIds = new Set(); // Track ids of words currently displayed
let page = 1;
let perPage = 50;
let currentZIndex = 99999;
let allWordsFetched = false;
let collisionForce = 0.1;
let dragForce = 0.98;
let showBoundingBoxes = false;
let settingsVisible = false;

let collisionForceSlider;
let dragForceSlider;
let showBoundingBoxesCheckbox;

let wordSprites;

let inactivityTimeout;

// Function to hide the cursor
function hideCursor() {
    document.body.classList.add('hide-cursor');
}

// Function to reset the timer and show the cursor again
function resetInactivityTimer() {
    // Show the cursor when there's activity
    document.body.classList.remove('hide-cursor');
    
    // Clear the previous timeout
    clearTimeout(inactivityTimeout);
    
    // Set a new timeout to hide the cursor after n seconds (e.g., 5 seconds)
    inactivityTimeout = setTimeout(hideCursor, 1000); // 5000 ms = 5 seconds
}

// Add event listeners for user activity
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);

// Start the inactivity timer when the page loads
resetInactivityTimer();


function setup() {
    // Initial setup
    resizeCanvasToFullScreen();  // Create the initial canvas with the full potential width and height
    background('#502d4d');

    socket = io.connect(`http://{{ ip_address }}:5000`);

    fetchWords();  // Initial fetch to populate the display
    setInterval(spawnNextWord, 1500); // Periodically spawn words from the queue

    wordSprites = new Group();

    // Create GUI elements
    collisionForceSlider = createSlider(0, 1, collisionForce, 0.01);
    collisionForceSlider.position(10, 10);
    collisionForceSlider.style('width', '200px');

    dragForceSlider = createSlider(0.9, 1, dragForce, 0.01);
    dragForceSlider.position(10, 40);
    dragForceSlider.style('width', '200px');

    showBoundingBoxesCheckbox = createCheckbox('Show Bounding Boxes', showBoundingBoxes);
    showBoundingBoxesCheckbox.position(10, 70);

    hideSettings();

    // Real-time WebSocket events
    socket.on('new_word', function (word) {
        if (!wordIds.has(word.id)) {
            wordQueue.push(word);
            wordIds.add(word.id);
        }
    });

    socket.on('remove_word', function (data) {
        console.log('Removing word:', data);
        removeWordById(data.id);
    });
}

function windowResized() {
    // Adjust the canvas size dynamically whenever the window is resized
    resizeCanvasToFullScreen();
}

function resizeCanvasToFullScreen() {
    // Get the width and height of the window (viewport)
    const fullWidth = window.innerWidth;
    const fullHeight = window.innerHeight;

    // Resize or create the canvas to fit the full screen
    resizeCanvas(fullWidth, fullHeight);

    // Reapply the background color after resizing
    background('#502d4d');
}

function generateRandomCSS() {
    // Define possible values for each attribute
    const sizes = ['16px', '20px', '24px', '28px', '32px', '36px'];
    const backgroundColors = ['#ab5e8a', '#a14330', '#ddb73f', '#a44830', '#7e6792'];
    const darkFontColors = ['#502d4d', '#3B1E2E'];
    const lightFontColors = ['#fefbe8', '#fefae7'];
    const allFontColors = [...darkFontColors, ...lightFontColors]; // Combine both light and dark font colors
    const fontFamilies = ['Merriweather', 'Oswald', 'Playfair Display', 'Lora', 'Lobster'];
    const textDecorations = ['none', 'underline'];
    const paddings = ['5px', '10px', '15px', '20px'];
    const textAlignments = ['left', 'center', 'right'];
    const whiteSpaceOptions = ['nowrap', 'normal'];

    // Randomly select values for each attribute
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const backgroundColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)];
    const fontFamily = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
    const textDecoration = textDecorations[Math.floor(Math.random() * textDecorations.length)];
    const padding = paddings[Math.floor(Math.random() * paddings.length)];
    const textAlign = textAlignments[Math.floor(Math.random() * textAlignments.length)];
    const whiteSpace = whiteSpaceOptions[Math.floor(Math.random() * whiteSpaceOptions.length)];

    // Randomly select a font color from both light and dark colors
    const fontColor = allFontColors[Math.floor(Math.random() * allFontColors.length)];

    // Determine if this div should have a pill shape based on a percentage chance
    const pillShapeChance = 0.2; // 50% chance to apply the pill shape (adjust this value as needed)
    const applyPillShape = Math.random() < pillShapeChance;

    // Calculate border-radius if pill shape is applied
    let borderRadius = '3px'; // Default border-radius
    if (applyPillShape) {
        const verticalPadding = parseInt(padding);
        const fontSize = parseInt(size);
        borderRadius = (fontSize + 2 * verticalPadding) / 2 + 'px';
    }

    // Generate a unique class name
    const className = `word-class-${Math.floor(Math.random() * 10000)}`;

    // Create the CSS class
    const style = `
        .${className} {
            font-size: ${size};
            background-color: ${backgroundColor};
            font-family: '${fontFamily}', sans-serif;
            color: ${fontColor};
            text-decoration: ${textDecoration};
            padding: ${padding};
            border-radius: ${borderRadius};
            display: inline-block;
            text-align: ${textAlign};
            white-space: ${whiteSpace};
        }
    `;

    // Append the style to the document's head
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = style;
    document.head.appendChild(styleSheet);

    return className;
}


function draw() {
    // background(255);

    collisionForce = collisionForceSlider.value();
    dragForce = dragForceSlider.value();
    showBoundingBoxes = showBoundingBoxesCheckbox.checked();

    const n = 50; // Replace 50 with your desired threshold in pixels

    wordSprites.forEach(wordSprite => {
        wordSprite.velocity.x *= dragForce;
        wordSprite.velocity.y *= dragForce;

        wordSprite.wordDiv.position(wordSprite.position.x - wordSprite.width / 2, wordSprite.position.y - wordSprite.height / 2);

        if (wordSprite.easing) {
            let duration = 1000;
            let time = millis() - wordSprite.easingStart;
            if (time < duration) {
                let progress = time / duration;
                progress = easeOutQuad(progress);
                wordSprite.scale = progress * wordSprite.originalScale;
                wordSprite.wordDiv.style('transform', `scale(${wordSprite.scale})`);
                wordSprite.width = wordSprite.originalWidth * wordSprite.scale;
                wordSprite.height = wordSprite.originalHeight * wordSprite.scale;
            } else {
                wordSprite.scale = wordSprite.originalScale;
                wordSprite.easing = false;
                wordSprite.wordDiv.style('transform', `scale(${wordSprite.scale})`);
                wordSprite.width = wordSprite.originalWidth * wordSprite.scale;
                wordSprite.height = wordSprite.originalHeight * wordSprite.scale;
            }
        }

        // Check if the object is fully out of the canvas by more than `n` pixels
        if (
            wordSprite.position.x + wordSprite.width / 2 < -n || // Out on the left
            wordSprite.position.x - wordSprite.width / 2 > width + n || // Out on the right
            wordSprite.position.y + wordSprite.height / 2 < -n || // Out on the top
            wordSprite.position.y - wordSprite.height / 2 > height + n // Out on the bottom
        ) {
            removeWordById(wordSprite.wordId); // Use your existing remove function
        }
    });

    wordSprites.collide(wordSprites, (a, b) => {
        let dx = a.position.x - b.position.x;
        let dy = a.position.y - b.position.y;
        let distance = sqrt(dx * dx + dy * dy);
        let minDistance = max(a.width, b.width);

        if (distance < minDistance) {
            let force = collisionForce * (minDistance - distance) / minDistance;
            let forceX = dx / distance * force;
            let forceY = dy / distance * force;
            a.velocity.x += forceX;
            a.velocity.y += forceY;
            b.velocity.x -= forceX;
            b.velocity.y -= forceY;
        }
    });
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
    let wordObj = wordsMap.get(id);
    if (wordObj) {
        console.log(`Removing sprite for word with id: ${id}`);

        // Remove the sprite from the p5.js Group
        wordSprites.remove(wordObj.sprite);

        // Remove the sprite from the canvas
        wordObj.sprite.remove();

        // Remove the associated <div> element
        wordObj.sprite.wordDiv.remove();

        // Remove the word from the tracking structures
        wordsMap.delete(id);
        wordIds.delete(id);

        // Force a redraw of the canvas to update immediately
        redraw();
    } else {
        console.error(`No sprite found for word with id: ${id}`);
    }
}

function createWordObject(word) {
    let size = random(16, 48);
    let margin = 20; // Define a uniform margin in pixels

    let wordSprite = createSprite(width / 2 + random(-50, 50), height / 2 + random(-50, 50));
    let wordDiv = createDiv(word.string);
    wordDiv.parent('wordContainer'); // Add the div inside the canvas
    wordDiv.position(wordSprite.position.x, wordSprite.position.y);
    wordDiv.style('font-size', `${size}px`);
    wordDiv.style('position', 'absolute');
    wordDiv.style('white-space', 'nowrap');
    wordDiv.style('transform', 'scale(0.01)'); // Start with a small scale

    // Decrement the z-index and apply it to the div
    currentZIndex--;
    wordDiv.style('z-index', currentZIndex);

    // Generate a random CSS class and apply it
    const randomClass = generateRandomCSS();
    wordDiv.class(randomClass);

    wordDiv.size(AUTO, AUTO);
    let textWidthValue = wordDiv.elt.offsetWidth;
    let textHeightValue = wordDiv.elt.offsetHeight;

    // Increase the width and height to account for the margin
    wordSprite.originalWidth = textWidthValue + margin;
    wordSprite.originalHeight = textHeightValue + margin;
    wordSprite.width = (textWidthValue + margin) * 0.01; // Start with a small width
    wordSprite.height = (textHeightValue + margin) * 0.01; // Start with a small height

    wordSprite.velocity.x = random(-1, 1);
    wordSprite.velocity.y = random(-1, 1);
    wordSprite.originalScale = 1;
    wordSprite.scale = 0.01;

    wordSprite.easing = true;
    wordSprite.easingStart = millis();

    wordSprite.wordDiv = wordDiv;
    wordSprite.wordId = word.id; // Ensure the ID is accessible
    wordSprites.add(wordSprite);

    // Store the word object in the map with its id as the key
    wordsMap.set(word.id, { id: word.id, string: word.string, sprite: wordSprite });
}



function spawnNextWord() {
    if (wordQueue.length > 0) {
        let word = wordQueue.shift();
        createWordObject(word);
    }
}

function hideSettings() {
    collisionForceSlider.hide();
    dragForceSlider.hide();
    showBoundingBoxesCheckbox.hide();
}

function easeOutQuad(t) {
    return t * (2 - t);
}