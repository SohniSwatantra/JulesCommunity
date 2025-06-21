// Basic script file - can be expanded later

document.addEventListener('DOMContentLoaded', () => {
    console.log("Jules Community Website Loaded");

    // Active navigation link highlighting
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });


    // Example: Smooth scroll for navigation links (if we add IDs to sections)
    // document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
    //     anchor.addEventListener('click', function (e) {
    //         e.preventDefault();
    //         document.querySelector(this.getAttribute('href')).scrollIntoView({
    //             behavior: 'smooth'
    //         });
    //     });
    // });

    // Example: Handle prompt copy button
    const copyButtons = document.querySelectorAll('.prompt-card button');
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pre = button.previousElementSibling; // Assuming button is right after <pre>
            if (pre && pre.tagName === 'PRE') {
                const code = pre.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.innerText)
                        .then(() => {
                            button.innerText = 'Copied!';
                            setTimeout(() => { button.innerText = 'Copy Prompt'; }, 2000);
                        })
                        .catch(err => {
                            console.error('Failed to copy text: ', err);
                            // Fallback for older browsers or if Clipboard API fails
                            // You might want to implement a textarea-based copy here
                            alert('Failed to copy. Please copy manually.');
                        });
                }
            }
        });
    });

    // Example: Handle feedback form submission
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent actual form submission for now
            const formData = new FormData(feedbackForm);
            const feedbackData = {
                type: formData.get('feedback-type'),
                summary: formData.get('feedback-summary'),
                details: formData.get('feedback-details'),
            };
            console.log('Feedback Submitted:', feedbackData);
            alert('Thank you for your feedback!');
            feedbackForm.reset();
            // Here you would typically send the data to a server
        });
    }
});
