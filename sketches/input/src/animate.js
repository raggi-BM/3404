const speed = 1; // Adjust scrolling speed
let scrollPosition = 0;

function scrollText() {
    const carouselWrapper = document.querySelector('.carouselWrapper');
    const footerTexts = document.querySelectorAll('.footerText');
    const totalWidth = footerTexts[0].offsetWidth; // Width of one text instance

    scrollPosition -= speed;

    // When the first text moves out of view, reset the position to create the loop
    if (Math.abs(scrollPosition) >= totalWidth) {
        scrollPosition = 0;
    }

    carouselWrapper.style.transform = `translateX(${scrollPosition}px)`;
    requestAnimationFrame(scrollText);
}

document.addEventListener('DOMContentLoaded', () => {
    scrollText();
});
