document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // Page sections
    const landingPage = document.getElementById('landing-page');
    const profilePage = document.getElementById('profile-page');
    const usagePage = document.getElementById('usage-page');
    const resultsPage = document.getElementById('results-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const logsPage = document.getElementById('logs-page');

    // Buttons
    const startAssessmentBtn = document.getElementById('start-assessment-btn');
    const trackProgressBtn = document.getElementById('track-progress-btn');
    const viewLogsBtn = document.getElementById('view-logs-btn');
    const energyToggleBtn = document.getElementById('energy-toggle');
    const waterToggleBtn = document.getElementById('water-toggle');
    const darkModeToggleBtn = document.getElementById('dark-mode-toggle');

    // Results containers
    const energyResults = document.getElementById('energy-results');
    const waterResults = document.getElementById('water-results');

    // Forms
    const profileForm = document.getElementById('profile-form');
    const usageForm = document.getElementById('usage-form');

    // Data store
    let userProfile = {};
    let usageData = {};
    let currentUserId = null;
    let lastConsumptionData = {};

    // --- Theme setup ---
    const applyTheme = (theme) => {
        document.body.setAttribute('data-theme', theme);
        darkModeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    };

    darkModeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);


    // --- Navigation ---
    const showPage = (page) => {
        console.log('Showing page:', page ? page.id : 'null');
        [landingPage, profilePage, usagePage, resultsPage, dashboardPage, logsPage].forEach(p => {
            if (p) {
                p.classList.add('hidden');
            }
        });
        if (page) {
            page.classList.remove('hidden');
        }
    };

    startAssessmentBtn.addEventListener('click', () => {
        console.log('Start Assessment button clicked');
        showPage(profilePage);
    });
    
    viewLogsBtn.addEventListener('click', () => {
        console.log('View Logs button clicked');
        fetchAndDisplayLogs();
        showPage(logsPage);
    });

    energyToggleBtn.addEventListener('click', () => {
        energyToggleBtn.classList.add('active');
        waterToggleBtn.classList.remove('active');
        energyResults.classList.remove('hidden');
        waterResults.classList.add('hidden');
    });

    waterToggleBtn.addEventListener('click', () => {
        waterToggleBtn.classList.add('active');
        energyToggleBtn.classList.remove('active');
        waterResults.classList.remove('hidden');
        energyResults.classList.add('hidden');
    });

    // --- Navigation Button Handlers ---
    document.querySelectorAll('.back-to-landing').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Back to Landing button clicked');
            showPage(landingPage);
        });
    });
    
    document.querySelectorAll('.back-to-profile').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Back to Profile button clicked');
            showPage(profilePage);
        });
    });

    document.querySelectorAll('.start-over-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Start Over button clicked');
            showPage(landingPage);
        });
    });


    // --- Form Handling ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Profile form submitted');
        const formData = new FormData(profileForm);
        const profile = Object.fromEntries(formData.entries());
        userProfile = profile;

        try {
            console.log('Sending profile data to API:', profile);
            const res = await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            if (!res.ok) throw new Error(`Failed to create profile. Status: ${res.status}`);
            const newProfile = await res.json();
            console.log('Profile created successfully:', newProfile);
            currentUserId = newProfile.id; // Save the user ID from the backend
            showPage(usagePage);
        } catch (error) {
            console.error('Error creating profile:', error);
            alert('An error occurred while creating your profile. Please try again.');
        }
    });

    usageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Usage form submitted');
        const formData = new FormData(usageForm);
        const usage = {
            electricity: {
                acUsage: formData.get('acUsage'),
                acStarRating: formData.get('acStarRating'),
                acAge: formData.get('acAge'),
                geyserUsage: formData.get('geyserUsage'),
                geyserStarRating: formData.get('geyserStarRating'),
                geyserAge: formData.get('geyserAge'),
                refrigeratorType: formData.get('refrigeratorType'),
                refrigeratorStarRating: formData.get('refrigeratorStarRating'),
                refrigeratorAge: formData.get('refrigeratorAge'),
                washingMachineCycles: formData.get('washingMachineCycles'),
                washingMachineType: formData.get('washingMachineType'),
                lightingType: formData.get('lightingType'),
                lightingDuration: formData.get('lightingDuration'),
                fanCount: formData.get('fanCount'),
                fanDuration: formData.get('fanDuration'),
            },
            water: {
                bathing: formData.get('bathing'),
                showerFlowRate: formData.get('showerFlowRate'),
                bathFrequency: formData.get('bathFrequency'),
                pumpUsage: formData.get('pumpUsage'),
                toiletFlushes: formData.get('toiletFlushes'),
                toiletFlushType: formData.get('toiletFlushType'),
                washingClothes: formData.get('washingClothes'),
                gardening: formData.get('gardening'),
                gardenSize: formData.get('gardenSize'),
                waterLeakage: formData.get('waterLeakage'),
            }
        };
        usageData = usage;
        
        // Prepare data for API
        const requestData = { profile: userProfile, usage: usageData };

        // Also save the usage data to the backend
        try {
            console.log('Sending usage data to API:', { userId: currentUserId, usage: usageData });
             await fetch('/api/usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, usage: usageData })
            });
             console.log('Usage data saved successfully');
        } catch(error) {
            console.error('Could not save usage data', error);
        }


        // Call calculation and optimization APIs
        try {
            console.log('Calculating consumption and optimizations...');
            const [consumptionRes, optimizationRes] = await Promise.all([
                fetch('/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                }),
                fetch('/api/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                })
            ]);

            if (!consumptionRes.ok || !optimizationRes.ok) {
                throw new Error(`Failed to fetch results. Statuses: ${consumptionRes.status}, ${optimizationRes.status}`);
            }

            const consumption = await consumptionRes.json();
            const optimizations = await optimizationRes.json();
            console.log('Calculation complete:', { consumption, optimizations });
            
            renderResults(consumption, optimizations);
            showPage(resultsPage);

        } catch (error) {
            console.error('Error during calculation:', error);
            alert('An error occurred during calculation. Please try again.');
        }
    });

    // --- Progress Tracking ---
    trackProgressBtn.addEventListener('click', () => {
        if (!currentUserId) {
            alert('Please complete the assessment first.');
            return;
        }

        const progressData = JSON.parse(localStorage.getItem(currentUserId)) || {};
        if (!progressData.baseline) {
            progressData.baseline = lastConsumptionData;
            alert('Baseline usage saved! Complete the assessment again later to see your progress.');
        } else {
            progressData.current = lastConsumptionData;
        }

        localStorage.setItem(currentUserId, JSON.stringify(progressData));
        renderDashboard(progressData);
        showPage(dashboardPage);
    });

    const renderDashboard = (progressData) => {
        const progressSummary = document.getElementById('progress-summary');
        if (!progressData.baseline) {
            progressSummary.innerHTML = '<p>No baseline data found. Complete an assessment to set your baseline.</p>';
            return;
        }

        let html = '<h3>Progress Dashboard</h3>';
        if (!progressData.current) {
            html += '<p>Your baseline is set. Complete the assessment again to track your progress.</p>';
            html += renderComparison(progressData.baseline, progressData.baseline);
        } else {
            html += renderComparison(progressData.baseline, progressData.current);
        }
        progressSummary.innerHTML = html;
    };

    const renderComparison = (baseline, current) => {
        const elecDiff = baseline.electricity.total - current.electricity.total;
        const waterDiff = baseline.water.total - current.water.total;
        const elecCostDiff = baseline.electricity.cost - current.electricity.cost;
        const waterCostDiff = baseline.water.cost - current.water.cost;

        return `
            <div class="result-grid">
                <div class="stat-item">
                    <h4>Electricity</h4>
                    <p>Baseline: ${baseline.electricity.total} kWh</p>
                    <p>Current: ${current.electricity.total} kWh</p>
                    <p>Improvement: ${elecDiff.toFixed(2)} kWh (${((elecDiff / baseline.electricity.total) * 100).toFixed(2)}%)</p>
                    <p>Cost Saving: ₹${elecCostDiff.toFixed(2)}</p>
                </div>
                <div class="stat-item">
                    <h4>Water</h4>
                    <p>Baseline: ${baseline.water.total} L/day</p>
                    <p>Current: ${current.water.total} L/day</p>
                    <p>Improvement: ${waterDiff.toFixed(2)} L/day (${((waterDiff / baseline.water.total) * 100).toFixed(2)}%)</p>
                    <p>Cost Saving: ₹${waterCostDiff.toFixed(2)}</p>
                </div>
            </div>
        `;
    }

    // --- Log Fetching and Rendering ---
    const fetchAndDisplayLogs = async () => {
        console.log('Fetching logs...');
        const logsContent = document.getElementById('logs-content');
        try {
            const res = await fetch('/api/logs');
            if(!res.ok) throw new Error('Could not fetch logs');
            const logs = await res.json();
            console.log('Logs received:', logs);
            
            const usersById = logs.users.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
            }, {});

            let tableHtml = `
                <table class="logs-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Region</th>
                            <th>Electricity Usage (kWh/month)</th>
                            <th>Water Usage (Liters/day)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            logs.usages.forEach(usage => {
                const user = usersById[usage.userId];
                if (user && usage.consumption) {
                    tableHtml += `
                        <tr>
                            <td>${new Date(usage.date).toLocaleString()}</td>
                            <td>${user.cityType}</td>
                            <td>${usage.consumption.electricity.total}</td>
                            <td>${usage.consumption.water.total}</td>
                        </tr>
                    `;
                }
            });

            tableHtml += `
                    </tbody>
                </table>
            `;
            
            logsContent.innerHTML = tableHtml;

        } catch(error) {
            console.error('Error fetching logs:', error);
            logsContent.innerHTML = '<p>Could not load logs.</p>';
        }
    };


    // --- Result Rendering ---
    const renderResults = (consumption, optimizations) => {
        console.log('Rendering results...');
        lastConsumptionData = consumption; // Save for progress tracking

        const energyConsumptionSummary = document.getElementById('energy-consumption-summary');
        const waterConsumptionSummary = document.getElementById('water-consumption-summary');
        const energyOptimizationActions = document.getElementById('energy-optimization-actions');
        const waterOptimizationActions = document.getElementById('water-optimization-actions');

        const getBadgeClass = (efficiency) => `badge-${efficiency.toLowerCase().replace(' ', '-')}`;

        energyConsumptionSummary.innerHTML = `
            <div class="result-card">
                <h3>Energy Consumption</h3>
                <div class="result-grid">
                    <div class="stat-item">
                        <p>${consumption.electricity.total} kWh</p>
                        <span>Total Monthly Electricity</span>
                    </div>
                    <div class="stat-item">
                        <p>₹ ${consumption.electricity.cost}</p>
                        <span>Estimated Monthly Electricity Cost</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 1.5rem;">
                    <h4>Efficiency Level</h4>
                    <span class="efficiency-badge ${getBadgeClass(consumption.electricity.efficiency)}">${consumption.electricity.efficiency}</span>
                </div>
            </div>
        `;

        waterConsumptionSummary.innerHTML = `
            <div class="result-card">
                <h3>Water Consumption</h3>
                <div class="result-grid">
                    <div class="stat-item">
                        <p>${consumption.water.total} L/day</p>
                        <span>Total Daily Water</span>
                    </div>
                    <div class="stat-item">
                        <p>₹ ${consumption.water.cost}</p>
                        <span>Estimated Monthly Water Cost</span>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 1.5rem;">
                    <h4>Efficiency Level</h4>
                    <span class="efficiency-badge ${getBadgeClass(consumption.water.efficiency)}">${consumption.water.efficiency}</span>
                </div>
            </div>
        `;

        const energyActions = optimizations.optimizationActions.filter(a => a.issue.toLowerCase().includes('electric') || a.issue.toLowerCase().includes('ac') || a.issue.toLowerCase().includes('geyser') || a.issue.toLowerCase().includes('refrigerator') || a.issue.toLowerCase().includes('lighting'));
        const waterActions = optimizations.optimizationActions.filter(a => a.issue.toLowerCase().includes('water') || a.issue.toLowerCase().includes('shower') || a.issue.toLowerCase().includes('toilet') || a.issue.toLowerCase().includes('gardening'));

        let energyActionsHtml = '<div class="result-card"><h3>Recommended Actions</h3>';
        if (energyActions.length > 0) {
            energyActions.forEach(action => {
                energyActionsHtml += `
                    <div class="action-card severity-${action.severity}">
                        <strong>${action.issue}</strong>
                        <p>${action.action}</p>
                        <p><strong>Estimated Savings:</strong> ${action.savings}</p>
                        <p class="effort"><strong>Effort:</strong> ${action.effort}</p>
                    </div>
                `;
            });
        } else {
            energyActionsHtml += '<p>Great job! No major energy inefficiencies detected.</p>';
        }
        energyActionsHtml += '</div>';
        energyOptimizationActions.innerHTML = energyActionsHtml;

        let waterActionsHtml = '<div class="result-card"><h3>Recommended Actions</h3>';
        if (waterActions.length > 0) {
            waterActions.forEach(action => {
                waterActionsHtml += `
                    <div class="action-card severity-${action.severity}">
                        <strong>${action.issue}</strong>
                        <p>${action.action}</p>
                        <p><strong>Estimated Savings:</strong> ${action.savings}</p>
                        <p class="effort"><strong>Effort:</strong> ${action.effort}</p>
                    </div>
                `;
            });
        } else {
            waterActionsHtml += '<p>Great job! No major water inefficiencies detected.</p>';
        }
        waterActionsHtml += '</div>';
        waterOptimizationActions.innerHTML = waterActionsHtml;

        console.log('Results rendered');
    };
});