document.addEventListener('DOMContentLoaded', () => {
    const LOADING = 'Loading...';
    const API_EXCEPTION = 'API rate limit exceeded';
    const GITHUB_USER = 'vimaltiwari2612';

    // Helper function for fetching JSON
    const fetchData = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Check for rate limit error specifically
                const data = await response.json();
                if (data.message && data.message.includes(API_EXCEPTION)) {
                    throw new Error(API_EXCEPTION);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error("Fetch Error:", error);
            throw error;
        }
    };

    // --- 1. Lead Section (Name/Bio) Dynamic Text ---
    const updateLead = async () => {
        const nameElement = document.getElementById('name');
        const bioElement = document.getElementById('bio');
        let wordArray = ['Software Engineer']; // Default
        const urlMain = `https://api.github.com/users/${GITHUB_USER}`;

        try {
            const out = await fetchData(urlMain);
            if (out.name) {
                nameElement.textContent = out.name;
            }
            if (out.bio) {
                wordArray = out.bio.split('|').map(w => w.trim()).filter(w => w.length > 0);
            }
        } catch (err) {
            nameElement.textContent = 'Vimal Tiwari';
            bioElement.textContent = 'Software Engineer';
            console.error("Lead section API error:", err.message);
        }

        // Blinking/Typing effect logic
        let count = 0;
        setInterval(() => {
            if (wordArray.length > 0) {
                bioElement.textContent = wordArray[count % wordArray.length];
                count++;
            }
        }, 750);
    };

    // --- 2. About Section (Readme content) ---
    const updateAbout = async () => {
        const aboutContent = document.getElementById('about-content');
        const repoURL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_USER}.github.io/readme`;

        try {
            const out = await fetchData(repoURL);
            const content = atob(out.content);
            // Assuming the content structure still uses 'SKILLS' as a separator
            const skillIndex = content.indexOf('SKILLS');
            let header = content;
            if (skillIndex !== -1) {
                header = content.substring(0, skillIndex);
            }
            
            const currentYear = new Date().getFullYear();
            header = header.replaceAll('CURRENT_YEAR', currentYear - 2016); // Assuming 2016 is start year

            aboutContent.innerHTML = `<p>${header.trim()}</p>`;

        } catch (err) {
            aboutContent.innerHTML = `<p class="text-danger">${LOADING} or Error loading About content.</p>`;
        }
    };

    // --- 3. Experience Timeline (Calculate duration) ---
    const calculateExperience = () => {
        const experienceData = [
            { from: "Oct 18, 2021", to: new Date(), text: "October 2021 – Present Day" },
            { from: "Jan 1, 2019", to: "Oct 8, 2021", text: "January 2019 – October 2021" },
            { from: "Sept 14, 2016", to: "Dec 14, 2018", text: "September 2016 – December 2018" },
            { from: "May 10, 2015", to: "July 10, 2015", text: "May 2015 – July 2015" }
        ];

        const timelineItems = document.querySelectorAll('#experience-timeline .timeline-item');

        timelineItems.forEach((node, index) => {
            if (experienceData[index]) {
                const data = experienceData[index];
                const fromDate = new Date(data.from);
                const toDate = data.to instanceof Date ? data.to : new Date(data.to);

                if (isNaN(fromDate) || isNaN(toDate)) return;

                const diffTime = Math.abs(toDate - fromDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const years = Math.floor(diffDays / 365.25);
                const remainingDays = diffDays % 365.25;
                const months = Math.round(remainingDays / 30.44); // Average month length

                let duration = `${years}y ${months}m`;
                if (years === 0) duration = `${months}m`;
                if (months === 0 && years === 0) duration = '< 1 Month';
                
                node.setAttribute("data-date", `${data.text} (${duration})`);
            }
        });
    };
    
    // --- 4. Certifications ---
    const updateCertifications = async () => {
        const container = document.getElementById('certification-container');
        container.innerHTML = `<div class="text-muted">${LOADING}</div>`; // Clear placeholder

        const masterURL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_USER}.github.io/git/trees/master`;

        try {
            const masterTree = await fetchData(masterURL);
            const certItem = masterTree.tree.find(item => item.path.includes('certification'));
            
            if (!certItem) {
                 container.innerHTML = `<div class="text-muted">No certifications found.</div>`;
                 return;
            }
            
            const certContent = await fetchData(certItem.url);
            const content = atob(certContent.content);
            const items = content.split('\n');

            let html = '';
            items.forEach(item => {
                const con = item.split("|").map(s => s.trim());
                if (con.length === 3) {
                    html += `
                        <a target="_blank" href="${con[1]}" title="${con[0]}" class="shadow-sm border rounded p-2 text-center">
                            <img src="${con[2]}" alt="${con[0]} Badge" style="width: 80px; height: 80px; object-fit: contain;" />
                            <small class="d-block mt-1 text-muted">${con[0]}</small>
                        </a>
                    `;
                }
            });
            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `<div class="text-danger">${LOADING} or Error loading certifications.</div>`;
        }
    };

    // --- 5. Projects Section (Chart and Dynamic Accordion) ---
    const updateProjects = async () => {
        const chartCanvas = document.getElementById("chartId");
        const chartContext = chartCanvas.getContext("2d");
        const accordionContainer = document.getElementById('dynamic-projects-accordion');
        
        accordionContainer.innerHTML = `<p class="text-muted text-center">${LOADING}</p>`;

        const projURL = `https://api.github.com/users/${GITHUB_USER}/repos?sort=createdDate&per_page=100`;

        try {
            const out = await fetchData(projURL);
            
            const projectsByLanguage = {};

            out.filter(item => item.has_wiki).forEach(item => {
                const lang = item.language || 'Other';
                item.name = item.name.replaceAll('-', ' ');
                if (!projectsByLanguage[lang]) {
                    projectsByLanguage[lang] = [];
                }
                projectsByLanguage[lang].push(item);
            });
            
            let technologiesArray = [];
            let technologiesProjectCount = [];
            let technologiesColor = [];
            let accordionHtml = '<div class="accordion" id="projectsAccordion">';
            let index = 0;

            for (const key in projectsByLanguage) {
                const color = "#" + (((1 + Math.random()) * (1 << 24) | 0).toString(16)).substr(-6);
                
                technologiesArray.push(key);
                technologiesProjectCount.push(projectsByLanguage[key].length);
                technologiesColor.push(color);
                
                // Bootstrap Accordion Structure
                accordionHtml += `
                    <div class="accordion-item">
                        <h2 class="accordion-header" id="heading${index}">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                                data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}"
                                style="background-color: ${color} !important;">
                                ${key} (${projectsByLanguage[key].length} Projects)
                            </button>
                        </h2>
                        <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#projectsAccordion">
                            <div class="accordion-body">
                                <ul class="list-unstyled mb-0">
                                    ${projectsByLanguage[key].map(item => `
                                        <li><a target="_blank" href="${item.html_url}">${item.name}</a></li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>`;
                index++;
            }

            accordionHtml += '</div>';
            accordionContainer.innerHTML = accordionHtml;

            // Initialize Chart.js Doughnut Chart
            chartCanvas.style.display = 'inline';
            new Chart(chartContext, {
                type: 'doughnut',
                data: {
                    labels: technologiesArray,
                    datasets: [{
                        label: "Tech Proficiency",
                        data: technologiesProjectCount,
                        backgroundColor: technologiesColor,
                        hoverOffset: 10
                    }],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ${context.raw}`;
                                }
                            }
                        }
                    }
                },
            });

        } catch (err) {
            chartCanvas.style.display = 'none';
            accordionContainer.innerHTML = `<p class="text-danger">Error loading dynamic projects: ${err.message}.</p>`;
        }
    };
    
    // --- 6. Games and Utilities (UPDATED FOR STAGGERING) ---
    const updateGamesAndUtilities = async () => {
        const gamesList = document.getElementById("dynamic-lists");
        gamesList.innerHTML = `<div class="text-muted">Loading...</div>`;

        const url = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`;
        
        try {
            const out = await fetchData(url);
            gamesList.innerHTML = ''; // Clear loading
            
            // Filter and process items
            const gameItems = out.filter(item => 
                item.homepage && item.homepage !== "" && 
                !item.homepage.includes("salesforce") && 
                !item.homepage.includes("sfdc")
            );

            gameItems.forEach((item, index) => {
                item.name = item.name.replaceAll('-', ' ');
                const li = document.createElement("li");
                li.className = "mb-2";

                // Calculate a delay based on the item's index (0.05s stagger)
                const delay = index * 0.05;
                li.style.animationDelay = `${delay}s`; 

                li.innerHTML = `<a target="_blank" href="${item.homepage}" class="text-decoration-none">${item.name} <i class="fas fa-external-link-alt fa-xs ms-1"></i></a>`;
                gamesList.appendChild(li);
            });

        } catch (err) {
            gamesList.innerHTML = `<div class="text-danger">${LOADING} or Error loading games/utilities.</div>`;
        }
    };

    // --- 7. Dark Mode Toggle ---
    window.toggleMode = (checkbox) => {
        const container = document.getElementById('page-container');
        if (checkbox.checked) {
            container.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'enabled');
        } else {
            container.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'disabled');
        }
    };

    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'enabled') {
        const switchElement = document.getElementById('darkModeSwitch');
        if(switchElement) {
             switchElement.checked = true;
             toggleMode(switchElement); // Apply styles on load
        }
    }


    // Run all update functions
    updateLead();
    updateAbout();
    calculateExperience();
    updateCertifications();
    updateProjects();
    updateGamesAndUtilities(); // Now includes staggering logic
});

// Client-side form validation for Bootstrap 5
(() => {
    'use strict'
    const forms = document.querySelectorAll('.needs-validation')
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }
            form.classList.add('was-validated')
        }, false)
    })
})()