document.addEventListener('DOMContentLoaded', () => {
    console.log("Jules AI Community Hub Loaded");

    // Helper to escape HTML for display
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Active navigation link highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.main-nav a'); // Updated selector for new nav structure
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active'); // Ensure only current page is active
        }
    });

    // Set current year in footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // --- Prompts Page Functionality ---
    // Ensure prompt-list ID is present on prompts.html for this to work
    const promptList = document.getElementById('prompt-list');
    if (promptList) {
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
                card.className = 'card prompt-card'; // Ensure new global card style is applied
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

    // --- Showcase Page Functionality ---
    const projectSubmissionForm = document.getElementById('project-submission-form');
    const showcaseGallery = document.querySelector('.showcase-gallery'); // For refreshing later

    if (projectSubmissionForm) {
        projectSubmissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(projectSubmissionForm);
            // No need to manually build JSON if sending FormData directly for file uploads
            // server-side (Flask) needs to expect form-data, not application/json, which it does.

            const submitButton = projectSubmissionForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            try {
                const response = await fetch('/showcase/projects', {
                    method: 'POST',
                    body: formData, // FormData will correctly set Content-Type to multipart/form-data
                });

                const result = await response.json(); // Always try to parse JSON

                if (!response.ok) {
                    throw new Error(result.error || `HTTP error! status: ${response.status}`);
                }

                console.log('Project Submitted:', result);
                alert(result.message || 'Project submitted successfully!');
                projectSubmissionForm.reset();
                // Call function to refresh project list (will be implemented in next step)
                if (typeof fetchAndDisplayShowcaseProjects === 'function') {
                    fetchAndDisplayShowcaseProjects();
                } else {
                    console.warn('fetchAndDisplayShowcaseProjects function not yet defined. Please refresh manually for now.');
                }

            } catch (error) {
                console.error('Failed to submit project:', error);
                alert(`Error submitting project: ${error.message}`);
            } finally {
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }

    // Placeholder for the function to fetch and display projects (will be implemented next)
    async function fetchAndDisplayShowcaseProjects() {
        if (!showcaseGallery) return; // Only run if the gallery element exists

        showcaseGallery.innerHTML = '<p>Loading projects...</p>'; // Show loading message

        try {
            const response = await fetch('/showcase/projects');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const projects = await response.json();

            showcaseGallery.innerHTML = ''; // Clear loading message or old projects

            if (projects.length === 0) {
                showcaseGallery.innerHTML = '<p>No projects submitted yet. Be the first!</p>';
                return;
            }

            projects.forEach(project => {
                const card = document.createElement('div');
                card.className = 'card project-card'; // Ensure new global card style is applied

                let imageHtml = `<img src="placeholder.jpg" alt="${escapeHtml(project.title)}">`; // Default placeholder
                if (project.image_url) {
                    // The image_url from backend is like "/uploads/showcase_images/filename.jpg"
                    imageHtml = `<img src="${escapeHtml(project.image_url)}" alt="${escapeHtml(project.title)}">`;
                }

                const linkHtml = project.link
                    ? `<a href="${escapeHtml(project.link)}" target="_blank" rel="noopener noreferrer">View Project Details/Repo</a>`
                    : '<span>No link provided</span>';

                card.innerHTML = `
                    ${imageHtml}
                    <h3>${escapeHtml(project.title)}</h3>
                    <p><strong>Category:</strong> ${escapeHtml(project.category)}</p>
                    <p>${escapeHtml(project.description)}</p>
                    <p><em>Submitted: ${new Date(project.submitted_at).toLocaleDateString()}</em></p>
                    ${linkHtml}
                `;
                showcaseGallery.appendChild(card);
            });

        } catch (error) {
            console.error('Failed to fetch or display showcase projects:', error);
            showcaseGallery.innerHTML = `<p>Error loading projects: ${error.message}. Please try refreshing the page.</p>`;
        }
    }

    // Initial fetch for showcase projects if on the showcase page
    if (document.querySelector('.showcase-gallery')) {
        fetchAndDisplayShowcaseProjects();
    }

    // --- Mobile Navigation Toggle ---
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    const siteHeader = document.querySelector('.site-header'); // Or body, if preferred for .nav-open

    if (mobileNavToggle && mainNav) {
        mobileNavToggle.addEventListener('click', () => {
            mainNav.classList.toggle('nav-open');
            const isExpanded = mainNav.getAttribute('aria-expanded') === 'true' || false;
            mainNav.setAttribute('aria-expanded', !isExpanded);
            mobileNavToggle.setAttribute('aria-expanded', !isExpanded); // Also update toggle's aria
        });
    }

    // --- Scroll Animations with Intersection Observer ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target); // Optional: stop observing after animation
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% of the element is visible
        });

        animatedElements.forEach(element => {
            observer.observe(element);
        });
    }

    // --- Guides Page Functionality ---
    const guideSubmissionForm = document.getElementById('guide-submission-form');
    const guidesListDiv = document.querySelector('.guides-list');
    const guideUrlInput = document.getElementById('guide-url-input');
    const guideSubmitCategorySelect = document.getElementById('guide-submit-category');
    const noGuidesMessage = document.getElementById('no-guides-message');
    const guideCategoryFilterSelect = document.getElementById('guide-category-filter');
    const filterGuidesButton = document.getElementById('filter-guides-button');
    const addGuideButton = document.getElementById('add-guide-button');


    // Function to generate thumbnail URL (client-side attempt)
    function getThumbnailUrl(url, category) {
        let thumbnailUrl = 'placeholder.jpg'; // Default placeholder
        try {
            if (category === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
                let videoId = '';
                if (url.includes('v=')) {
                    videoId = new URL(url).searchParams.get('v');
                } else if (url.includes('youtu.be/')) {
                    const pathParts = new URL(url).pathname.split('/');
                    videoId = pathParts[pathParts.length -1];
                }
                if (videoId) {
                    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                }
            }
            // Add more thumbnail generation logic for other platforms if needed
        } catch (e) {
            console.warn("Error generating thumbnail URL for:", url, e);
        }
        return thumbnailUrl;
    }

    async function fetchAndDisplayGuides(category = 'all') {
        if (!guidesListDiv) return;
        if (noGuidesMessage) noGuidesMessage.style.display = 'none';
        guidesListDiv.innerHTML = '<p>Loading guides...</p>';

        let url = '/guides';
        if (category && category !== 'all') {
            url += `?category=${encodeURIComponent(category)}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const guides = await response.json();
            renderGuides(guides);
        } catch (error) {
            console.error('Failed to fetch guides:', error);
            guidesListDiv.innerHTML = `<p>Error loading guides: ${error.message}. Please try again later.</p>`;
            if (noGuidesMessage) noGuidesMessage.style.display = 'block'; // Show if error
        }
    }

    function renderGuides(guidesToRender) {
        guidesListDiv.innerHTML = ''; // Clear current guides or loading message

        if (guidesToRender.length === 0) {
            if (noGuidesMessage) {
                noGuidesMessage.textContent = 'No guides found matching your criteria or none submitted yet.';
                noGuidesMessage.style.display = 'block';
            } else {
                const p = document.createElement('p');
                p.textContent = 'No guides match the current filter or none submitted yet.';
                guidesListDiv.appendChild(p);
            }
            return;
        }

        if (noGuidesMessage) noGuidesMessage.style.display = 'none';

        guidesToRender.forEach(guide => {
            const card = document.createElement('div');
            card.className = 'card guide-card';

            const safeUrl = escapeHtml(guide.url);
            // For title, try to extract a more meaningful title from the URL if possible, or just use the URL
            let displayTitle = safeUrl;
            try {
                const urlObject = new URL(guide.url);
                displayTitle = urlObject.hostname + (urlObject.pathname !== '/' ? urlObject.pathname : '');
            } catch (e) { /* Use safeUrl if URL parsing fails */ }


            const thumbnailUrl = getThumbnailUrl(guide.url, guide.category);

            card.innerHTML = `
                <div class="guide-card-thumbnail">
                    <img src="${escapeHtml(thumbnailUrl)}" alt="Thumbnail for ${escapeHtml(displayTitle)}" onerror="this.onerror=null;this.src='placeholder.jpg';">
                </div>
                <div class="guide-card-content">
                    <h3><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayTitle)}</a></h3>
                    <p><strong>Category:</strong> ${escapeHtml(guide.category)}</p>
                    <p class="guide-submitted-date">Submitted: ${new Date(guide.submitted_at).toLocaleDateString()}</p>
                </div>
            `;
            guidesListDiv.appendChild(card);
        });
    }


    if (guideSubmissionForm && guidesListDiv && guideUrlInput && guideSubmitCategorySelect) {
        guideSubmissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if(addGuideButton) addGuideButton.disabled = true;

            const url = guideUrlInput.value.trim();
            const category = guideSubmitCategorySelect.value;

            if (!url || !category) {
                alert('Please provide both a URL and a category for the guide.');
                if(addGuideButton) addGuideButton.disabled = false;
                return;
            }

            try {
                const response = await fetch('/guides', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: url, category: category }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `HTTP error! status: ${response.status}`);
                }

                alert(result.message || 'Guide submitted successfully!');
                guideSubmissionForm.reset();
                fetchAndDisplayGuides(guideCategoryFilterSelect ? guideCategoryFilterSelect.value : 'all'); // Refresh list
            } catch (error) {
                console.error('Failed to submit guide:', error);
                alert(`Error submitting guide: ${error.message}`);
            } finally {
                if(addGuideButton) addGuideButton.disabled = false;
            }
        });

        // Initial fetch of guides when the page loads
        fetchAndDisplayGuides();

        // --- Guide Filtering ---
        if (guideCategoryFilterSelect && filterGuidesButton) {
            filterGuidesButton.addEventListener('click', () => {
                const selectedCategory = guideCategoryFilterSelect.value;
                fetchAndDisplayGuides(selectedCategory);
            });
        }
    }

    // Ensure escapeHtml is used from the global scope defined at the top of DOMContentLoaded
});
