function loadModerationPageInIframe() {
    const iframe = document.createElement('iframe');
    iframe.src = 'http://localhost:5000/moderator'; // Ensure this is the same origin as your parent page
    iframe.width = '100%'; // Set the width to fit the container
    iframe.style.border = 'none'; // Optional: remove iframe border
    iframe.style.zIndex = '0'; // Optional: set the z-index
    iframe.style.overflow = 'hidden'; // Optional: no scrollbars

    // Append the iframe to the container
    const moderationContainer = document.querySelector('.moderationContainer');
    moderationContainer.appendChild(iframe);

    // Adjust iframe height after it loads
    iframe.onload = function() {
        adjustIframeHeight(iframe);
    };
}

// Function to adjust the iframe's height based on its content
function adjustIframeHeight(iframe) {
    if (iframe.contentWindow && iframe.contentWindow.document) {
        const iframeHeight = iframe.contentWindow.document.body.scrollHeight;

        console.log("Iframe content height: ", iframeHeight); // Log the height for debugging

        iframe.style.height = iframeHeight + 'px'; // Set the iframe's height
    } else {
        console.log("Could not access iframe content.");
    }
}

// Call loadModerationPageInIframe on DOMContentLoaded
document.addEventListener("DOMContentLoaded", loadModerationPageInIframe);
