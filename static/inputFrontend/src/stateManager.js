const STATES = {
    INPUT: 'inputState',
    LOADING: 'LoadingState',
    SUCCESS: 'successState',
    ERROR: 'errorState',
    MODERATION: 'moderationState'
};

// Set the initial state here (you can change it to LOADING, SUCCESS, ERROR)
let currentState = STATES.INPUT;



function setState(newState) {
    currentState = newState;

    // Hide all states
    document.querySelector('.inputState').style.display = 'none';
    document.querySelector('.LoadingState').style.display = 'none';
    document.querySelector('.successState').style.display = 'none';
    document.querySelector('.errorState').style.display = 'none';
    document.querySelector('.moderationState').style.display = 'none';

    // Show the current state
    switch (newState) {
        case STATES.INPUT:
            document.querySelector('.inputState').style.display = 'block';
            break;
        case STATES.LOADING:
            document.querySelector('.LoadingState').style.display = 'block';
            break;
        case STATES.SUCCESS:
            document.querySelector('.successState').style.display = 'block';
            break;
        case STATES.ERROR:
            document.querySelector('.errorState').style.display = 'block';
            break;
        case STATES.MODERATION:
            document.querySelector('.moderationState').style.display = 'block';
            break;
    }
}

// Initialize the state
document.addEventListener('DOMContentLoaded', () => {
    setState(currentState);
});

