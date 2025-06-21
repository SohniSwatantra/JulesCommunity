document.addEventListener('DOMContentLoaded', () => {
    console.log("Jules Community Website Loaded");

    // Active navigation link highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Default to index.html if path is '/'
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });

    // --- Prompts Page Functionality ---
    if (document.getElementById('prompt-list')) {
        const promptList = document.getElementById('prompt-list');
        const categoryFilter = document.getElementById('category-filter');
        const searchInput = document.getElementById('search-prompts');
        const filterButton = document.getElementById('filter-button');
        const sortByFilter = document.getElementById('sort-by-filter');
        const loadingMessage = document.getElementById('loading-prompts-message');
        const promptSubmissionForm = document.getElementById('prompt-submission-form');

        // Function to create a star rating display
        function createStarRating(ratingValue) {
            if (ratingValue === null || ratingValue === undefined) return 'N/A';
            const rating = parseFloat(ratingValue);
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5 ? 1 : 0;
            const emptyStars = 5 - fullStars - halfStar;
            return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars) + ` (${rating.toFixed(1)}/5)`;
        }

        // Function to display prompts
        function displayPrompts(prompts) {
            promptList.innerHTML = ''; // Clear current prompts or loading message
            if (prompts.length === 0) {
                promptList.innerHTML = '<p>No prompts found matching your criteria.</p>';
                return;
            }
            prompts.forEach(prompt => {
                const card = document.createElement('div');
                card.className = 'prompt-card';
                card.innerHTML = `
                    <h3>${prompt.title}</h3>
                    <p><strong>Category:</strong> ${prompt.category}</p>
                    <p><strong>Description:</strong> ${prompt.description || 'N/A'}</p>
                    <pre><code>${escapeHtml(prompt.prompt_text)}</code></pre>
                    <button class="copy-prompt-button">Copy Prompt</button>
                    <div class="prompt-rating">${createStarRating(prompt.rating)}</div>
                    <div class="prompt-usage">Usage: ${prompt.usage_count}</div>
                    <div class="prompt-date">Added: ${new Date(prompt.created_at).toLocaleDateString()}</div>
                `;
                promptList.appendChild(card);
            });
            addCopyButtonListeners(); // Re-attach listeners to new buttons
        }

        // Helper to escape HTML for display in <pre><code>
        function escapeHtml(unsafe) {
            if (unsafe === null || unsafe === undefined) return '';
            return unsafe
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }

        // Function to fetch prompts
        async function fetchPrompts() {
            if(loadingMessage) loadingMessage.style.display = 'block';
            promptList.innerHTML = ''; // Clear previous results

            const category = categoryFilter.value;
            const searchTerm = searchInput.value;
            const sortBy = sortByFilter.value;

            let url = '/prompts?';
            if (category !== 'all') {
                url += `category=${encodeURIComponent(category)}&`;
            }
            if (searchTerm) {
                url += `term=${encodeURIComponent(searchTerm)}&`;
            }
            url += `sort_by=${encodeURIComponent(sortBy)}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const prompts = await response.json();
                displayPrompts(prompts);
            } catch (error) {
                console.error('Failed to fetch prompts:', error);
                promptList.innerHTML = '<p>Error loading prompts. Please try again later.</p>';
            } finally {
                if(loadingMessage) loadingMessage.style.display = 'none';
            }
        }

        // Function to fetch and populate categories
        async function fetchCategories() {
            try {
                const response = await fetch('/prompts/categories');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const categories = await response.json();

                // Save current value if exists, to reselect after repopulating
                const currentCategoryValue = categoryFilter.value;

                // Clear existing options (except "All Categories")
                while (categoryFilter.options.length > 1) {
                    categoryFilter.remove(1);
                }

                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.name;
                    option.textContent = `${cat.name} (${cat.count})`;
                    categoryFilter.appendChild(option);
                });

                // Reselect previous value if it still exists
                if (Array.from(categoryFilter.options).some(opt => opt.value === currentCategoryValue)) {
                    categoryFilter.value = currentCategoryValue;
                }

            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        }

        // Event listeners for filters
        if (filterButton) {
            filterButton.addEventListener('click', fetchPrompts);
        }
        // Also fetch when sort option changes
        if (sortByFilter) {
            sortByFilter.addEventListener('change', fetchPrompts);
        }
         // Fetch on search input enter key
        if (searchInput) {
            searchInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    fetchPrompts();
                }
            });
        }


        // Initial fetch
        fetchCategories(); // Populate categories first
        fetchPrompts();    // Then fetch prompts

        // Handle prompt submission form
        if (promptSubmissionForm) {
            promptSubmissionForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const formData = new FormData(promptSubmissionForm);
                const promptData = {
                    title: formData.get('prompt-title'),
                    category: formData.get('prompt-category'),
                    description: formData.get('prompt-description'),
                    prompt_text: formData.get('prompt-text'),
                    // Rating is not part of submission form in HTML, can be added
                };

                try {
                    const response = await fetch('/prompts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(promptData),
                    });

                    if (!response.ok) {
                        let errorMsg = `HTTP error! status: ${response.status}`;
                        try {
                            const errorData = await response.json();
                            errorMsg = errorData.error || errorMsg; // Use server's error message if available
                        } catch (e) {
                            // If response is not JSON or another error occurs parsing it
                            console.warn("Could not parse error response as JSON:", e);
                        }
                        throw new Error(errorMsg);
                    }

                    const result = await response.json();
                    console.log('Prompt Submitted:', result);
                    alert('Thank you for your prompt submission! Your prompt has been added.');
                    promptSubmissionForm.reset();
                    fetchPrompts(); // Refresh the list of prompts
                    fetchCategories(); // Refresh categories in case a new one was added
                } catch (error) {
                    console.error('Failed to submit prompt:', error);
                    // Display a more informative error message to the user
                    alert(`Error submitting prompt: ${error.message}\nPlease check your input and try again. If the problem persists, contact support.`);
                }
            });
        }
    } // End of prompt page specific code

    // Generic copy button handler (delegated for dynamically added buttons)
    function addCopyButtonListeners() {
        document.querySelectorAll('.copy-prompt-button').forEach(button => {
            // Remove existing listener to prevent duplicates if function is called multiple times
            button.replaceWith(button.cloneNode(true));
        });
        // Add new listeners
        document.querySelectorAll('.copy-prompt-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const targetButton = event.currentTarget;
                const pre = targetButton.previousElementSibling;
                if (pre && pre.tagName === 'PRE') {
                    const code = pre.querySelector('code');
                    if (code) {
                        navigator.clipboard.writeText(code.innerText)
                            .then(() => {
                                targetButton.innerText = 'Copied!';
                                setTimeout(() => { targetButton.innerText = 'Copy Prompt'; }, 2000);
                            })
                            .catch(err => {
                                console.error('Failed to copy text: ', err);
                                alert('Failed to copy. Please copy manually.');
                            });
                    }
                }
            });
        });
    }
    // Initial call for any static copy buttons (though prompts are dynamic now)
    addCopyButtonListeners();


    // Handle feedback form submission (if it exists on the page)
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(feedbackForm);
            const feedbackData = {
                type: formData.get('feedback-type'),
                summary: formData.get('feedback-summary'),
                details: formData.get('feedback-details'),
                // email: formData.get('feedback-email') // Assuming you might add an email field
            };

            console.log('Feedback Submitted:', feedbackData);
            // Replace with actual API call to submit feedback
            // try {
            //     const response = await fetch('/api/feedback', { // Example endpoint
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify(feedbackData)
            //     });
            //     if (!response.ok) throw new Error('Network response was not ok.');
            //     alert('Thank you for your feedback!');
            //     feedbackForm.reset();
            // } catch (error) {
            //     console.error('Feedback submission error:', error);
            //     alert('There was an issue submitting your feedback. Please try again.');
            // }
            alert('Thank you for your feedback! (Simulated submission)');
            feedbackForm.reset();
        });
    }
});
