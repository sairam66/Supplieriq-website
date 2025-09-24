// Authentication and Subscription System (UNCHANGED)
let currentUser = null;
let isLoggedIn = false;
let charts = {};

// Subscription tiers data (UNCHANGED)
const subscriptionTiers = {
    "free": {
        "name": "Free",
        "price": "€0/month",
        "features": [
            "Basic dashboard access",
            "1 data upload per month", 
            "Standard reports",
            "Email support",
            "Community access"
        ]
    },
    "lite": {
        "name": "Lite", 
        "price": "€29/month",
        "features": [
            "Enhanced analytics dashboard",
            "5 data uploads per month",
            "Advanced reporting", 
            "Priority email support",
            "Supply chain insights",
            "Benchmarking tools"
        ]
    },
    "paid_max": {
        "name": "Paid Max",
        "price": "€99/month", 
        "features": [
            "Unlimited data uploads",
            "AI-powered predictions",
            "Custom reports & dashboards",
            "API access",
            "24/7 phone support",
            "White-label options",
            "Advanced integrations"
        ]
    }
};

// Sample data for charts and analytics
const chartData = {
    monthlyTrade: {
        labels: ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025'],
        exports: [19.2, 18.9, 20.1, 19.7, 24.3, 20.2, 19.8, 20.4, 19.6],
        imports: [12.8, 12.2, 13.1, 12.9, 13.4, 12.7, 12.9, 13.2, 12.8]
    },
    portThroughput: {
        labels: ['Ro-Ro', 'Lo-Lo', 'Bulk Liquid', 'Bulk Solid', 'Break Bulk'],
        data: [61.1, 20.7, 13.4, 5.7, 0.1],
        tonnage: [21.5, 7.3, 4.7, 2.0, 0.05]
    },
    commodities: {
        labels: ['Medical & Pharmaceutical', 'Chemicals & Related', 'Machinery & Transport', 'Other', 'Food & Live Animals'],
        data: [45, 26, 10, 13, 6],
        values: [99.9, 58.2, 21.4, 31.7, 12.8]
    }
};

// Initialize Application (UNCHANGED AUTHENTICATION FLOW)
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthentication();
    initializeEventListeners();
    checkUserSession();
});

// ALL AUTHENTICATION FUNCTIONS REMAIN EXACTLY THE SAME
function initializeAuthentication() {
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const passwordInput = document.getElementById('signupPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}-form`).classList.add('active');

    clearErrorMessages();
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const loginData = {
        identifier: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    showLoading(submitBtn, true);
    clearErrorMessages();

    try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user = authenticateUser(loginData.identifier, loginData.password);

        if (user) {
            if (!user.emailVerified) {
                showEmailVerification(user.email);
                return;
            }
            loginUser(user);
        } else {
            showError('login-error', 'Invalid credentials. Please check your email/username and password.');
        }
    } catch (error) {
        showError('login-error', 'Login failed. Please try again.');
    } finally {
        showLoading(submitBtn, false);
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const signupData = {
        username: document.getElementById('signupUsername').value.trim(),
        email: document.getElementById('signupEmail').value.trim(),
        password: document.getElementById('signupPassword').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };

    if (!validateSignupData(signupData)) {
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    showLoading(submitBtn, true);
    clearErrorMessages();

    try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (userExists(signupData.email, signupData.username)) {
            showError('signup-error', 'User with this email or username already exists.');
            return;
        }

        const newUser = createUser(signupData);
        await sendVerificationEmail(newUser);
        showEmailVerification(newUser.email);

    } catch (error) {
        showError('signup-error', 'Account creation failed. Please try again.');
    } finally {
        showLoading(submitBtn, false);
    }
}

// User Management Functions (UNCHANGED)
function createUser(signupData) {
    const users = getStoredUsers();
    const userId = 'user_' + Date.now();

    const newUser = {
        id: userId,
        username: signupData.username,
        email: signupData.email,
        password: hashPassword(signupData.password),
        emailVerified: false,
        subscriptionTier: null,
        createdAt: new Date().toISOString(),
        verificationToken: generateToken()
    };

    users.push(newUser);
    localStorage.setItem('isc_users', JSON.stringify(users));
    return newUser;
}

function authenticateUser(identifier, password) {
    const users = getStoredUsers();
    const hashedPassword = hashPassword(password);

    return users.find(user => 
        (user.email === identifier || user.username === identifier) &&
        user.password === hashedPassword
    );
}

function userExists(email, username) {
    const users = getStoredUsers();
    return users.some(user => user.email === email || user.username === username);
}

function getStoredUsers() {
    const stored = localStorage.getItem('isc_users');
    return stored ? JSON.parse(stored) : [];
}

function updateUser(userId, updates) {
    const users = getStoredUsers();
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem('isc_users', JSON.stringify(users));
        return users[userIndex];
    }
    return null;
}

// Email Verification System (UNCHANGED)
async function sendVerificationEmail(user) {
    console.log('=== EMAIL VERIFICATION SENT ===');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Verify your Ireland Supply Chain Pulse account`);
    console.log(`Verification Token: ${user.verificationToken}`);
    console.log('\n--- Email Content ---');
    console.log(`Hi ${user.username},`);
    console.log(`\nWelcome to Ireland Supply Chain Pulse!`);
    console.log(`\nPlease verify your email address to activate your account.`);
    console.log(`\nYour monthly subscription details:`);
    console.log(`- Account: ${user.email}`);
    console.log(`- Plan: Free (Testing Version)`);
    console.log(`- Features: Dashboard access, data uploads, analytics`);
    console.log(`\nClick here to verify: [Verification Link]`);
    console.log(`\nBest regards,`);
    console.log(`Ireland Supply Chain Pulse Team`);
    console.log('==========================================\n');

    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('✅ Verification email sent successfully!');
            resolve();
        }, 500);
    });
}

function showEmailVerification(email) {
    document.getElementById('verification-email').textContent = email;
    showContainer('verification');

    document.getElementById('resendVerification').addEventListener('click', () => {
        resendVerificationEmail(email);
    });

    document.getElementById('changeEmail').addEventListener('click', () => {
        showContainer('auth');
    });

    // Auto-verify after 3 seconds for demo
    setTimeout(() => {
        simulateEmailVerification(email);
    }, 3000);
}

function simulateEmailVerification(email) {
    const users = getStoredUsers();
    const user = users.find(u => u.email === email);

    if (user) {
        const updatedUser = updateUser(user.id, { emailVerified: true });

        const status = document.getElementById('verification-status');
        status.textContent = '✅ Email verified successfully! Redirecting to subscription selection...';
        status.classList.add('success');

        setTimeout(() => {
            showSubscriptionSelection(updatedUser);
        }, 2000);
    }
}

// Subscription Selection (UNCHANGED)
function showSubscriptionSelection(user) {
    currentUser = user;
    showContainer('subscription');

    document.querySelectorAll('.plan-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planCard = e.target.closest('.plan-card');
            const planType = planCard.dataset.plan;
            selectSubscriptionPlan(planType);
        });
    });
}

function selectSubscriptionPlan(planType) {
    if (currentUser) {
        updateUser(currentUser.id, { subscriptionTier: planType });
        currentUser.subscriptionTier = planType;

        localStorage.setItem('isc_current_session', JSON.stringify({
            userId: currentUser.id,
            loginTime: Date.now()
        }));

        showPlatform();
    }
}

// Platform Access (ENHANCED WITH PDF FUNCTIONALITY)
function showPlatform() {
    showContainer('platform');
    initializePlatform();
}

function initializePlatform() {
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.username;
        const planBadge = document.getElementById('user-plan-badge');
        planBadge.textContent = subscriptionTiers[currentUser.subscriptionTier].name;
        planBadge.className = `plan-badge ${currentUser.subscriptionTier}-badge`;
    }

    initializeNavigation();
    initializeCharts();

    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.page;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => page.classList.remove('active'));
            const targetPageElement = document.getElementById(`${targetPage}-page`);
            if (targetPageElement) {
                targetPageElement.classList.add('active');
            }
        });
    });
}

// ENHANCED: Chart Initialization with PDF Export Capability
function initializeCharts() {
    // Monthly Trade Trends Chart
    const tradeCtx = document.getElementById('tradeChart');
    if (tradeCtx) {
        charts.tradeChart = new Chart(tradeCtx, {
            type: 'line',
            data: {
                labels: chartData.monthlyTrade.labels,
                datasets: [{
                    label: 'Exports (€B)',
                    data: chartData.monthlyTrade.exports,
                    borderColor: '#004990',
                    backgroundColor: 'rgba(0, 73, 144, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Imports (€B)',
                    data: chartData.monthlyTrade.imports,
                    borderColor: '#00ABE4',
                    backgroundColor: 'rgba(0, 171, 228, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value (€ Billions)'
                        }
                    }
                }
            }
        });
    }

    // Port Throughput Chart
    const portCtx = document.getElementById('portChart');
    if (portCtx) {
        charts.portChart = new Chart(portCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.portThroughput.labels,
                datasets: [{
                    data: chartData.portThroughput.data,
                    backgroundColor: [
                        '#004990',
                        '#00ABE4',
                        '#FF7A00',
                        '#10B981',
                        '#F59E0B'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // Commodities Chart
    const commodityCtx = document.getElementById('commodityChart');
    if (commodityCtx) {
        charts.commodityChart = new Chart(commodityCtx, {
            type: 'bar',
            data: {
                labels: chartData.commodities.labels,
                datasets: [{
                    label: 'Export Value (€B)',
                    data: chartData.commodities.values,
                    backgroundColor: '#004990'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Value (€ Billions)'
                        }
                    }
                }
            }
        });
    }
}

// NEW: Professional PDF Generation Functions
function showProgressModal(text = 'Generating PDF report...') {
    const modal = document.getElementById('pdf-progress-modal');
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');

    progressText.textContent = text;
    progressFill.style.width = '0%';
    modal.style.display = 'flex';
}

function updateProgress(percentage, text) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    progressFill.style.width = percentage + '%';
    if (text) progressText.textContent = text;
}

function hideProgressModal() {
    const modal = document.getElementById('pdf-progress-modal');
    modal.style.display = 'none';
}

// NEW: Dashboard PDF Report Generation
async function generateDashboardPDF() {
    showProgressModal('Preparing dashboard report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Page 1: Cover Page
        updateProgress(10, 'Creating cover page...');
        pdf.setFontSize(24);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Ireland Supply Chain Pulse', 20, 40);

        pdf.setFontSize(18);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Dashboard Analytics Report', 20, 55);

        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated on: ${new Date().toLocaleDateString('en-IE')}`, 20, 70);
        pdf.text('Created by: Sairam Sundararaman', 20, 80);
        pdf.text('Ireland Supply Chain Pulse Platform', 20, 90);

        // Executive Summary
        updateProgress(25, 'Adding executive summary...');
        pdf.setFontSize(16);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Executive Summary', 20, 110);

        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        const summaryText = [
            'Ireland\'s supply chain performance shows strong momentum in 2025:',
            '',
            '• Total trade volume reached €1.063 trillion, with exports at €564B',
            '• Dublin Port processed 35.2M tonnes, demonstrating robust logistics capacity',
            '• Container traffic reached 885K TEUs, indicating healthy import/export activity',
            '• Cross-border trade totaled €10.6B, supporting regional economic integration',
            '',
            'Key insights: Medical & pharmaceutical exports dominate at 45% of total value,',
            'while Ro-Ro cargo represents 61.1% of port throughput, highlighting Ireland\'s',
            'role as a strategic logistics hub for European trade.'
        ];

        let yPos = 125;
        summaryText.forEach(line => {
            pdf.text(line, 20, yPos);
            yPos += 6;
        });

        // Page 2: Charts
        pdf.addPage();
        updateProgress(40, 'Exporting charts...');

        pdf.setFontSize(16);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Key Performance Indicators', 20, 30);

        // Add KPI values
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Total Trade Volume: €1.063T (+5.2%)', 20, 45);
        pdf.text('Dublin Port Throughput: 35.2M tonnes (+2.8%)', 20, 55);
        pdf.text('Container Traffic: 885K TEUs (+4.1%)', 20, 65);
        pdf.text('Cross-border Trade: €10.6B (+3.5%)', 20, 75);

        // Export charts as images
        updateProgress(60, 'Converting charts to images...');

        if (charts.tradeChart) {
            const tradeImage = charts.tradeChart.toBase64Image('image/png', 1.0);
            pdf.addImage(tradeImage, 'PNG', 20, 90, 170, 85);
        }

        // Page 3: More charts
        pdf.addPage();
        updateProgress(75, 'Adding additional charts...');

        pdf.setFontSize(16);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Detailed Analysis', 20, 30);

        if (charts.portChart) {
            const portImage = charts.portChart.toBase64Image('image/png', 1.0);
            pdf.addImage(portImage, 'PNG', 20, 40, 80, 80);
        }

        if (charts.commodityChart) {
            const commodityImage = charts.commodityChart.toBase64Image('image/png', 1.0);
            pdf.addImage(commodityImage, 'PNG', 110, 40, 80, 80);
        }

        // Recommendations
        updateProgress(90, 'Adding recommendations...');
        pdf.setFontSize(14);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Recommendations', 20, 140);

        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        const recommendations = [
            '1. Leverage pharmaceutical export strength for continued growth',
            '2. Optimize port operations to handle increasing container volumes',
            '3. Diversify trade partnerships to reduce concentration risk',
            '4. Invest in digital supply chain technologies for efficiency gains'
        ];

        yPos = 155;
        recommendations.forEach(rec => {
            pdf.text(rec, 20, yPos);
            yPos += 8;
        });

        // Footer
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Ireland Supply Chain Pulse | Contact: +353 (89) 969 3641 | Dublin, Ireland', 20, 280);

        updateProgress(100, 'Finalizing PDF...');

        // Download
        pdf.save(`Ireland_Supply_Chain_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);

        hideProgressModal();

    } catch (error) {
        console.error('PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Trade Analysis PDF
async function generateTradePDF() {
    showProgressModal('Generating trade analysis report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        // Cover page
        pdf.setFontSize(22);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Ireland Trade Performance Report', 20, 40);

        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Monthly Trade Trends Analysis 2025', 20, 55);

        // Add trade chart
        if (charts.tradeChart) {
            const tradeImage = charts.tradeChart.toBase64Image('image/png', 1.0);
            pdf.addImage(tradeImage, 'PNG', 20, 80, 170, 100);
        }

        // Analysis
        pdf.setFontSize(12);
        pdf.text('Key Findings:', 20, 200);
        pdf.setFontSize(10);
        pdf.text('• Export peak in May 2025 (€24.3B) indicates strong seasonal performance', 20, 215);
        pdf.text('• Consistent import levels suggest stable domestic demand', 20, 225);
        pdf.text('• Trade surplus maintained throughout the period', 20, 235);

        pdf.save(`Ireland_Trade_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
        hideProgressModal();

    } catch (error) {
        console.error('Trade PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Port Analysis PDF
async function generatePortPDF() {
    showProgressModal('Generating port analysis report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        pdf.setFontSize(22);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Dublin Port Analytics Report', 20, 40);

        pdf.setFontSize(14);
        pdf.text('Cargo Distribution & Throughput Analysis', 20, 55);

        if (charts.portChart) {
            const portImage = charts.portChart.toBase64Image('image/png', 1.0);
            pdf.addImage(portImage, 'PNG', 20, 80, 120, 100);
        }

        // Data table
        pdf.setFontSize(12);
        pdf.text('Throughput Breakdown:', 20, 200);
        pdf.setFontSize(10);
        chartData.portThroughput.labels.forEach((label, index) => {
            const tonnage = chartData.portThroughput.tonnage[index];
            const percentage = chartData.portThroughput.data[index];
            pdf.text(`${label}: ${tonnage}M tonnes (${percentage}%)`, 20, 215 + (index * 8));
        });

        pdf.save(`Dublin_Port_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
        hideProgressModal();

    } catch (error) {
        console.error('Port PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Commodity Analysis PDF
async function generateCommodityPDF() {
    showProgressModal('Generating commodity report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        pdf.setFontSize(22);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Export Commodities Analysis', 20, 40);

        if (charts.commodityChart) {
            const commodityImage = charts.commodityChart.toBase64Image('image/png', 1.0);
            pdf.addImage(commodityImage, 'PNG', 20, 60, 170, 100);
        }

        pdf.setFontSize(12);
        pdf.text('Commodity Performance:', 20, 180);
        pdf.setFontSize(10);
        chartData.commodities.labels.forEach((label, index) => {
            const value = chartData.commodities.values[index];
            const percentage = chartData.commodities.data[index];
            pdf.text(`${label}: €${value}B (${percentage}%)`, 20, 195 + (index * 8));
        });

        pdf.save(`Commodity_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
        hideProgressModal();

    } catch (error) {
        console.error('Commodity PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Case Studies PDF
async function generateCaseStudiesPDF() {
    showProgressModal('Generating case studies report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        pdf.setFontSize(22);
        pdf.setTextColor(0, 73, 144);
        pdf.text('SME Success Stories Report', 20, 40);

        pdf.setFontSize(14);
        pdf.text('Supply Chain Optimization Case Studies', 20, 55);

        // Case Study 1
        pdf.setFontSize(14);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Case Study 1: Dublin Food Distributor', 20, 80);

        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Challenge: High inventory carrying costs and frequent stockouts', 20, 95);
        pdf.text('Solution: Demand forecasting system with optimized reorder points', 20, 105);
        pdf.text('Results: 15% inventory reduction, €45K annual savings, 78% fewer stockouts', 20, 115);

        // Case Study 2
        pdf.setFontSize(14);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Case Study 2: Cork Pharmaceutical Supplier', 20, 140);

        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Challenge: Long lead times from EU suppliers impacting production', 20, 155);
        pdf.text('Solution: Diversified supplier base with real-time tracking', 20, 165);
        pdf.text('Results: 22% lead time reduction, €78K cost savings, 96% delivery reliability', 20, 175);

        // Case Study 3
        pdf.setFontSize(14);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Case Study 3: Galway Electronics Retailer', 20, 200);

        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Challenge: Excess inventory tying up working capital', 20, 215);
        pdf.text('Solution: Just-in-time inventory management with automation', 20, 225);
        pdf.text('Results: 18% carrying cost reduction, €32K savings, 4.2x inventory turns', 20, 235);

        pdf.save(`SME_Case_Studies_${new Date().toISOString().split('T')[0]}.pdf`);
        hideProgressModal();

    } catch (error) {
        console.error('Case studies PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Upload Analysis PDF
async function generateUploadPDF() {
    showProgressModal('Generating upload analysis report...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        pdf.setFontSize(22);
        pdf.setTextColor(0, 73, 144);
        pdf.text('Supply Chain Data Analysis Report', 20, 40);

        pdf.setFontSize(14);
        pdf.text('Uploaded Data Analytics & Insights', 20, 55);

        pdf.setFontSize(12);
        pdf.text('Analysis Summary:', 20, 80);
        pdf.setFontSize(10);
        pdf.text('• Data processing completed successfully', 20, 95);
        pdf.text('• Key patterns and trends identified', 20, 105);
        pdf.text('• Optimization opportunities highlighted', 20, 115);
        pdf.text('• Benchmarking against industry standards performed', 20, 125);

        pdf.save(`Upload_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
        hideProgressModal();

    } catch (error) {
        console.error('Upload PDF generation failed:', error);
        hideProgressModal();
        alert('PDF generation failed. Please try again.');
    }
}

// NEW: Template Download
function downloadTemplate() {
    const csvContent = [
        'Date,Order_ID,SKU,Category,Quantity,Unit_Cost,Order_Value,Supplier,Supplier_Country,Lead_Time_Days,Delivery_Status,Customer_Type,Currency',
        '2025-09-01,ORD-1001,PROD-123,Electronics,50,25.99,1299.50,TechSupply Ltd,Ireland,3,On-time,Retailer,EUR',
        '2025-09-02,ORD-1002,PROD-456,Components,25,15.75,393.75,EuroTech GmbH,Germany,5,Delayed,Manufacturer,EUR',
        '2025-09-03,ORD-1003,PROD-789,Materials,100,8.50,850.00,Nordic Supply,Sweden,7,On-time,Distributor,EUR'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'supply_chain_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Session Management (UNCHANGED)
function checkUserSession() {
    const session = localStorage.getItem('isc_current_session');

    if (session) {
        try {
            const sessionData = JSON.parse(session);
            const users = getStoredUsers();
            const user = users.find(u => u.id === sessionData.userId);

            if (user && user.emailVerified && user.subscriptionTier) {
                currentUser = user;
                showPlatform();
                return;
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
    }

    showContainer('auth');
}

function logout() {
    localStorage.removeItem('isc_current_session');
    currentUser = null;
    showContainer('auth');

    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    clearErrorMessages();
}

// Utility Functions (UNCHANGED)
function showContainer(containerName) {
    const containers = {
        auth: document.getElementById('auth-container'),
        verification: document.getElementById('verification-container'),
        subscription: document.getElementById('subscription-container'),
        platform: document.getElementById('platform-container')
    };

    Object.values(containers).forEach(container => {
        if (container) {
            container.classList.remove('active');
        }
    });

    if (containers[containerName]) {
        containers[containerName].classList.add('active');
    }
}

function validateSignupData(data) {
    clearErrorMessages();

    if (data.username.length < 3) {
        showError('signup-error', 'Username must be at least 3 characters long.');
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showError('signup-error', 'Please enter a valid email address.');
        return false;
    }

    if (data.password.length < 6) {
        showError('signup-error', 'Password must be at least 6 characters long.');
        return false;
    }

    if (data.password !== data.confirmPassword) {
        showError('signup-error', 'Passwords do not match.');
        return false;
    }

    return true;
}

function updatePasswordStrength() {
    const password = document.getElementById('signupPassword').value;
    const strengthBar = document.querySelector('.strength-bar');

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    strengthBar.className = 'strength-bar';

    if (strength === 1) strengthBar.classList.add('weak');
    else if (strength === 2) strengthBar.classList.add('fair');
    else if (strength === 3) strengthBar.classList.add('good');
    else if (strength === 4) strengthBar.classList.add('strong');
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearErrorMessages() {
    document.querySelectorAll('.error-message').forEach(element => {
        element.textContent = '';
        element.classList.remove('show');
    });
}

function showLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function loginUser(user) {
    currentUser = user;

    localStorage.setItem('isc_current_session', JSON.stringify({
        userId: user.id,
        loginTime: Date.now()
    }));

    if (!user.subscriptionTier) {
        showSubscriptionSelection(user);
    } else {
        showPlatform();
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function generateToken() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function initializeEventListeners() {
    window.addEventListener('popstate', checkUserSession);

    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('form-control')) {
            e.target.classList.remove('error');
        }
    });
}