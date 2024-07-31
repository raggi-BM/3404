let words = [];
let wordIds = new Set();
let page = 1;
let perPage = 50;
let fetchInterval = 10000; // Fetch new words every 10 seconds
let allWordsFetched = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    fetchWords();
    setInterval(fetchNewWords, fetchInterval);
}

function draw() {
    background(255);

    for (let i = 0; i < words.length; i++) {
        let wordObj = words[i];

        // Update word position
        wordObj.x += wordObj.vx;
        wordObj.y += wordObj.vy;

        // Check for collision with canvas edges
        if (wordObj.x < 0 || wordObj.x > width) {
            wordObj.vx *= -1;
        }
        if (wordObj.y < 0 || wordObj.y > height) {
            wordObj.vy *= -1;
        }

        // Check for collision with other words
        for (let j = i + 1; j < words.length; j++) {
            let otherWord = words[j];
            let dx = wordObj.x - otherWord.x;
            let dy = wordObj.y - otherWord.y;
            let distance = sqrt(dx * dx + dy * dy);
            let minDist = (textWidth(wordObj.string) + textWidth(otherWord.string)) / 2;

            if (distance < minDist) {
                let angle = atan2(dy, dx);
                let newVx1 = cos(angle);
                let newVy1 = sin(angle);
                let newVx2 = -cos(angle);
                let newVy2 = -sin(angle);

                wordObj.vx = newVx1;
                wordObj.vy = newVy1;
                otherWord.vx = newVx2;
                otherWord.vy = newVy2;
            }
        }

        drawWord(wordObj);
    }
}

function drawWord(wordObj) {
    textSize(wordObj.size);
    textFont(wordObj.font);
    fill(wordObj.color);
    text(wordObj.string, wordObj.x, wordObj.y);
}

function fetchWords() {
    fetch(`http://127.0.0.1:5000/strings?page=${page}&per_page=${perPage}`)
        .then(response => response.json())
        .then(data => {
            if (data.data.length > 0) {
                data.data.forEach(word => {
                    if (!wordIds.has(word.id)) {
                        words.push(createWordObject(word));
                        wordIds.add(word.id);
                    }
                });
                // Increment page only if we received a full page of data
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

    fetch(`http://127.0.0.1:5000/strings?page=${page}&per_page=${perPage}`)
        .then(response => response.json())
        .then(data => {
            if (data.data.length > 0) {
                data.data.forEach(word => {
                    if (!wordIds.has(word.id)) {
                        words.push(createWordObject(word));
                        wordIds.add(word.id);
                    }
                });
                // Increment page only if we received a full page of data
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
    return {
        id: word.id,
        string: word.string,
        size: random(16, 48),
        font: random(['Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana']),
        color: random(['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#FF69B4']),
        x: random(width),
        y: random(height),
        vx: random(-0.5, 0.5),
        vy: random(-0.5, 0.5)
    };
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
