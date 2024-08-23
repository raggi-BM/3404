let socket;
let wordsMap = new Map(); // Map to track word ID and its corresponding sprite
let wordQueue = [];
let wordIds = new Set(); // Track ids of words currently displayed
let page = 1;
let perPage = 50;
let allWordsFetched = false;
let collisionForce = 0.1;
let dragForce = 0.98;
let showBoundingBoxes = false;
let settingsVisible = false;

let collisionForceSlider;
let dragForceSlider;
let showBoundingBoxesCheckbox;

let wordSprites;
let cssClasses = ['class1', 'class2', 'class3'];

function setup() {
    createCanvas(windowWidth, windowHeight);
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

function draw() {
    background(255);

    collisionForce = collisionForceSlider.value();
    dragForce = dragForceSlider.value();
    showBoundingBoxes = showBoundingBoxesCheckbox.checked();

    wordSprites.forEach(wordSprite => {
        wordSprite.velocity.x *= dragForce;
        wordSprite.velocity.y *= dragForce;

        if (wordSprite.position.x - wordSprite.width / 2 < 0 || wordSprite.position.x + wordSprite.width / 2 > width) {
            wordSprite.velocity.x *= -1;
        }
        if (wordSprite.position.y - wordSprite.height / 2 < 0 || wordSprite.position.y + wordSprite.height / 2 > height) {
            wordSprite.velocity.y *= -1;
        }

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
    let wordSprite = createSprite(width / 2 + random(-50, 50), height / 2 + random(-50, 50));
    let wordDiv = createDiv(word.string);
    wordDiv.parent('wordContainer'); // Add the div inside the canvas
    wordDiv.position(wordSprite.position.x, wordSprite.position.y);
    wordDiv.style('font-size', `${size}px`);
    wordDiv.style('position', 'absolute');
    wordDiv.style('white-space', 'nowrap');
    wordDiv.style('transform', 'scale(0.01)'); // Start with a small scale
    wordDiv.class(cssClasses[floor(random(cssClasses.length))]);

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
    wordSprite.scale = 0.01;

    wordSprite.easing = true;
    wordSprite.easingStart = millis();

    wordSprite.wordDiv = wordDiv;
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
