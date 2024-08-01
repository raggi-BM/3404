let words = [];
let wordQueue = [];
let wordIds = new Set();
let page = 1;
let perPage = 50;
let fetchInterval = 1000; // Fetch new words every 10 seconds
let allWordsFetched = false;
let collisionForce = 0.1; // Adjust this value to control the collision force
let dragForce = 0.98; // Adjust this value to control the drag force
let showBoundingBoxes = false;
let settingsVisible = false;

let collisionForceSlider;
let dragForceSlider;
let showBoundingBoxesCheckbox;

let wordSprites;
let cssClasses = ['class1', 'class2', 'class3']; // Add your CSS class names here

function setup() {
    createCanvas(windowWidth, windowHeight);
    fetchWords();
    setInterval(fetchNewWords, fetchInterval);
    setInterval(spawnNextWord, 1500); // Spawn a new word every 1.5 seconds

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
}

function draw() {
    background(255);

    collisionForce = collisionForceSlider.value();
    dragForce = dragForceSlider.value();
    showBoundingBoxes = showBoundingBoxesCheckbox.checked();

    wordSprites.forEach(wordSprite => {
        wordSprite.velocity.x *= dragForce;
        wordSprite.velocity.y *= dragForce;

        // Check for collision with canvas edges
        if (wordSprite.position.x - wordSprite.width / 2 < 0 || wordSprite.position.x + wordSprite.width / 2 > width) {
            wordSprite.velocity.x *= -1;
        }
        if (wordSprite.position.y - wordSprite.height / 2 < 0 || wordSprite.position.y + wordSprite.height / 2 > height) {
            wordSprite.velocity.y *= -1;
        }

        // Update the position of the corresponding div element
        wordSprite.wordDiv.position(wordSprite.position.x - wordSprite.width / 2, wordSprite.position.y - wordSprite.height / 2);

        // Apply easing effect for scaling
        if (wordSprite.easing) {
            let duration = 1000; // 1 second
            let time = millis() - wordSprite.easingStart;
            if (time < duration) {
                let progress = time / duration;
                progress = easeOutQuad(progress); // Apply ease-out function
                wordSprite.scale = progress * wordSprite.originalScale; // Scale the word from 0 to original scale
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
    });

    // Handle collisions between sprites
    wordSprites.collide(wordSprites, (a, b) => {
        // Apply a simple collision force
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
                    fetchWords();
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

function fetchNewWords() {
    if (!allWordsFetched) return;

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
                }
            }
        })
        .catch(error => {
            console.error('Error fetching new words:', error);
        });
}

function createWordObject(word) {
    let size = random(16, 48);
    let wordSprite = createSprite(width / 2 + random(-50, 50), height / 2 + random(-50, 50));
    let wordDiv = createDiv(word.string);
    wordDiv.parent('wordContainer'); // Add the div inside the canvas
    wordDiv.position(wordSprite.position.x, wordSprite.position.y);
    wordDiv.style('font-size', `${size}px`);
    wordDiv.style('position', 'absolute');
    wordDiv.style('white-space', 'nowrap'); // Prevent line breaks
    wordDiv.style('transform', 'scale(0.01)'); // Start with a small scale
    wordDiv.class(cssClasses[floor(random(cssClasses.length))]); // Assign a random CSS class

    wordDiv.size(AUTO, AUTO);
    let textWidthValue = wordDiv.elt.offsetWidth;
    let textHeightValue = wordDiv.elt.offsetHeight;
    wordSprite.originalWidth = textWidthValue;
    wordSprite.originalHeight = textHeightValue;
    wordSprite.width = textWidthValue * 0.01; // Start with a small width
    wordSprite.height = textHeightValue * 0.01; // Start with a small height

    wordSprite.velocity.x = random(-1, 1);
    wordSprite.velocity.y = random(-1, 1);
    wordSprite.originalScale = 1;
    wordSprite.scale = 0.01; // Start with a small scale

    wordSprite.easing = true;
    wordSprite.easingStart = millis();

    wordSprite.wordDiv = wordDiv; // Attach the DOM element to the sprite
    wordSprites.add(wordSprite);

    // Apply gentle movement to existing sprites based on the scaling progress of the new sprite
    wordSprites.forEach(existingSprite => {
        if (existingSprite !== wordSprite) {
            let dx = existingSprite.position.x - wordSprite.position.x;
            let dy = existingSprite.position.y - wordSprite.position.y;
            let distance = sqrt(dx * dx + dy * dy);
            let minDistance = max(wordSprite.width, existingSprite.width);

            if (distance < minDistance * 1.5) { // Adjust the threshold as needed
                let forceMagnitude = collisionForce * (minDistance - distance) / minDistance;
                let forceX = dx / distance * forceMagnitude;
                let forceY = dy / distance * forceMagnitude;
                existingSprite.velocity.x -= forceX;
                existingSprite.velocity.y -= forceY;
            }
        }
    });

    return {
        id: word.id,
        string: word.string,
        sprite: wordSprite
    };
}

function spawnNextWord() {
    if (wordQueue.length > 0) {
        let word = wordQueue.shift();
        let wordObj = createWordObject(word);
        words.push(wordObj);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
    if (key === 'n' || key === 'N') {
        settingsVisible = !settingsVisible;
        if (settingsVisible) {
            showSettings();
        } else {
            hideSettings();
        }
    }
}

function showSettings() {
    collisionForceSlider.show();
    dragForceSlider.show();
    showBoundingBoxesCheckbox.show();
}

function hideSettings() {
    collisionForceSlider.hide();
    dragForceSlider.hide();
    showBoundingBoxesCheckbox.hide();
}

function easeOutQuad(t) {
    return t * (2 - t);
}