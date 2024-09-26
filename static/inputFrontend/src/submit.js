document.addEventListener('DOMContentLoaded', () => {
    const voteButton = document.querySelector('.voteButton');
    const inputField = document.querySelector('.input');
    const exitButton = document.querySelector('.exitButton');
    const header = document.querySelector('.header');
    const Keyboard = window.SimpleKeyboard.default;

    const myKeyboard = new Keyboard({
        onChange: input => onChange(input),
        onKeyPress: button => onKeyPress(button),

        layout: {
            'default': [
                "{} q w e r t y u i o p {bksp}",
                "{lock} a s d f g h j k l ' {enter}",
                "{shift} z x c v b n m {} {mic} {shift}"
            ]
        },
        enabled: button => {
            // Disable the empty button so it is unclickable
            if (button === '{empty}') {
                return false; // Disable the empty keys
            }
            return true; // Enable all other keys
        }
    });

    const micButton = document.querySelector('.hg-button[data-skbtn="{mic}"]');
const textInput = document.getElementById('input');
const micIndicator = document.querySelector('.mic-indicator');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';

    micButton.addEventListener('click', () => {
        
        // focus the mic button after clicking
        micButton.focus();

        inputField.value = ''; // Clear the input field
        myKeyboard.clearInput(); // Clear the virtual keyboard state
        
        micIndicator.classList.add('active'); // Fade in the mic indicator
        micButton.classList.add('mic-active'); // Add the class to animate mic button background and text color
        
        setTimeout(() => {
            recognition.start();
        }, 50);
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        const firstWord = transcript.split(' ')[0]; // Get the first word from the transcript
        
        let i = 0;
        const typeLetter = () => {
            if (i < firstWord.length) {
                const letter = firstWord[i];
                myKeyboard.setInput(myKeyboard.getInput() + letter); // Simulate typing the letter
                textInput.value = myKeyboard.getInput(); // Update the text input value
                i++;
                setTimeout(typeLetter, randomTime(40, 150)); // Adjust delay between typing each letter
            }
        };

        function randomTime(min, max) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        }

        typeLetter(); // Start typing the first word letter by letter
    };

    recognition.onspeechend = () => {
        recognition.stop();
        micIndicator.classList.remove('active'); // Fade out the mic indicator
        micButton.classList.remove('mic-active'); // Remove the animation class

        // focus on the input field after speech recognition ends and make the selection be at the end of the text
        inputField.focus();
        inputField.setSelectionRange(inputField.value.length, inputField.value.length);

        // make the keyboard know that the selection is at the end of the text
        myKeyboard.setCaretPosition('end');

        

    

    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micIndicator.classList.remove('active'); // Hide the indicator on error
        micButton.classList.remove('mic-active'); // Remove the animation class
    };
} else {
    console.log('Speech recognition not supported in this browser.');
}



    let keySequence = [];
    const requiredSequence = ["{shift}", "{enter}", "{enter}", "{shift}"];

    const MAX_INPUT_LENGTH = 15;

function onChange(input) {
    if (input.length > MAX_INPUT_LENGTH) {
        input = input.substring(0, MAX_INPUT_LENGTH); // Limit the input to MAX_INPUT_LENGTH
    }
    document.querySelector(".input").value = input;
    console.log("Input changed", input);
    myKeyboard.setInput(input); // Ensure virtual keyboard's state matches the truncated input
}


    function onKeyPress(button) {
        console.log("Button pressed", button);

        // Add the pressed button to the keySequence array
        keySequence.push(button);

        // Keep the keySequence array length equal to the required sequence length
        if (keySequence.length > requiredSequence.length) {
            keySequence.shift(); // Remove the first (oldest) key press
        }

        // Check if the current key sequence matches the required sequence
        if (keySequence.toString() === requiredSequence.toString()) {
            console.log("Shift -> Enter -> Enter -> Shift sequence detected!");
            header.classList.add('hide');

            // set the state to moderation
            setState(STATES.MODERATION);
            // Reset the sequence after detection
            keySequence = [];
        }
    }

    exitButton.addEventListener('click', () => {

        setState(STATES.INPUT);
        header.classList.remove('hide');
    });



    voteButton.addEventListener('click', () => {
        const stringValue = inputField.value.trim();

        if (stringValue === '') {
            console.error('Input cannot be empty!');
            return;
        }

        // Set the state to loading
        setState(STATES.LOADING);

        // Make the fetch request
        fetch('http://{{ ip_address }}:5000//store_string', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ string: stringValue }),
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Check if the response is approved or not
                if (data.approved === false) {
                    console.error('Error:', data.message);
                    setState(STATES.ERROR);

                    // Clear the input field and virtual keyboard
                    inputField.value = ''; // Clear the input field
                    myKeyboard.clearInput(); // Clear the virtual keyboard state

                    // Automatically return to input state after 5 seconds
                    setTimeout(() => {
                        setState(STATES.INPUT);
                    }, 5000);
                } else {
                    console.log('Success:', data.message);

                    // Set state to success
                    setState(STATES.SUCCESS);

                    // Clear the input field and virtual keyboard
                    inputField.value = ''; // Clear the input field
                    myKeyboard.clearInput(); // Clear the virtual keyboard state

                    // Automatically return to input state after 5 seconds
                    setTimeout(() => {
                        setState(STATES.INPUT);
                    }, 5000);
                }
            })
            .catch(error => {
                console.error('Error:', error.message);
                // Set state to error if there's a network or fetch error
                setState(STATES.ERROR);

                // Clear the input field and virtual keyboard
                inputField.value = ''; // Clear the input field
                myKeyboard.clearInput(); // Clear the virtual keyboard state

                // Automatically return to input state after 5 seconds
                setTimeout(() => {
                    setState(STATES.INPUT);
                }, 5000);
            });
    });
});
