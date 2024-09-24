document.addEventListener('DOMContentLoaded', () => {
    const voteButton = document.querySelector('.voteButton');
    const inputField = document.querySelector('.input');
    const exitButton = document.querySelector('.exitButton');
    const header = document.querySelector('.header');
    const Keyboard = window.SimpleKeyboard.default;

const myKeyboard = new Keyboard({
  onChange: input => onChange(input),
  onKeyPress: button => onKeyPress(button)
});

let keySequence = [];
const requiredSequence = ["{shift}", "{enter}", "{enter}", "{shift}"];

function onChange(input) {
  document.querySelector(".input").value = input;
  console.log("Input changed", input);
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
