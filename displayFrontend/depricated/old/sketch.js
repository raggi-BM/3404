    // Data
    const wordData = [
        { "string": "cool", "count": 20 },
        { "string": "amazing", "count": 4 },
        { "string": "liberty", "count": 1 },
        { "string": "freedom", "count": 1 },
        { "string": "justice", "count": 1 },
        { "string": "rights", "count": 1 }
      ];
  
      // Matter.js Setup
      const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;
  
      // Create engine
      const engine = Engine.create();
      const world = engine.world;
  
      // Disable gravity
      engine.world.gravity.y = 0;
  
      // Create a full-screen canvas
      const render = Render.create({
        element: document.body,
        engine: engine,
        options: {
          width: window.innerWidth,
          height: window.innerHeight,
          wireframes: false,
          background: '#000000'
        }
      });
  
      Render.run(render);
      const runner = Runner.create();
      Runner.run(runner, engine);
  
      // Function to create HTML word elements
      function createWordElements(words) {
        return words.map(word => {
          const fontSize = word.count * 5 + 20; // Scale size by count
          const wordEl = document.createElement('div');
          wordEl.className = 'word';
          wordEl.innerText = word.string;
          wordEl.style.fontSize = `${fontSize}px`;
          wordEl.style.color = '#ffffff';
  
          document.body.appendChild(wordEl);
          return wordEl;
        });
      }
  
      // Function to create words as physics bodies
      function createWordBodies(words, wordElements) {
        return words.map((word, index) => {
          const wordEl = wordElements[index];
          const fontSize = word.count * 5 + 20; // Scale size by count
          const textWidth = wordEl.offsetWidth;
          const textHeight = wordEl.offsetHeight;
  
          // Create body slightly within canvas bounds
          const wordBody = Bodies.rectangle(
            Math.random() * (window.innerWidth - textWidth), // Random x-position
            Math.random() * (window.innerHeight - textHeight), // Random y-position
            textWidth,
            textHeight,
            {
              restitution: 0.9, // Bounce
              render: {
                visible: false // Hide the body render, we only use it for physics
              }
            }
          );
  
          return { body: wordBody, element: wordEl };
        });
      }
  
      // Add word bodies to the world
      const wordElements = createWordElements(wordData);
      const wordBodies = createWordBodies(wordData, wordElements);
  
      // Add all the bodies to the world
      Composite.add(world, wordBodies.map(item => item.body));
  
      // Sync the HTML word positions with the Matter.js body positions
      Events.on(engine, 'afterUpdate', function() {
        wordBodies.forEach(item => {
          const { body, element } = item;
          element.style.transform = `translate(${body.position.x - (element.offsetWidth / 2)}px, ${body.position.y - (element.offsetHeight / 2)}px)`;
        });
      });
  
      // Adjust canvas on window resize
      window.addEventListener('resize', () => {
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
      });