// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/",
    storageBucket: "kom-tm.appspot.com"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

let currentUserEmail = null;
let currentUserKey = null;
let currentDisplayName = 'Anonymous';
let isAdminUser = false;

// Elements
const displayNameText = document.getElementById('display-name-text');
const profileSubText = document.getElementById('profile-sub-text');
const profileAvatarEl = document.getElementById('profile-avatar-el');
const editNameBtn = document.getElementById('edit-name-btn');
const editNameModal = document.getElementById('edit-name-modal');
const editNameBackdrop = document.getElementById('edit-name-backdrop');
const newNameInput = document.getElementById('new-name-input');
const saveNameBtn = document.getElementById('save-name-btn');
const cancelNameBtn = document.getElementById('cancel-name-btn');
const notLoggedInBanner = document.getElementById('not-logged-in-banner');
const submitTicketBtn = document.getElementById('submit-ticket-btn');
const ticketSubject = document.getElementById('ticket-subject');
const ticketCategory = document.getElementById('ticket-category');
const ticketDescription = document.getElementById('ticket-description');
const ticketFile = document.getElementById('ticket-file');
const ticketSuccessMsg = document.getElementById('ticket-success-msg');
const ticketErrorMsg = document.getElementById('ticket-error-msg');
const myTicketsList = document.getElementById('my-tickets-list');
const myTicketCount = document.getElementById('my-ticket-count');
const ticketsSectionTitle = document.getElementById('tickets-section-title');
const uploadProgress = document.getElementById('ticket-upload-progress');
const uploadFill = document.getElementById('upload-fill');

// Default grey silhouette SVG as HTML
const defaultPfpSVG = `<svg viewBox="0 0 24 24" width="36" height="36" fill="#8e9297">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
</svg>`;

const adminPfpURL = 'https://i.ibb.co/HDxMBCcJ/gpt-image-1-5-high-fidelity-a-Make-the-M-have-a-pu.png';

window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = sessionStorage.getItem('mccg_email');
    if (storedEmail) {
        loadUserProfile(storedEmail);
    } else {
        notLoggedInBanner.classList.remove('hidden');
        // Still load all tickets so guests can see them
        loadAllTickets();
    }
});

async function loadUserProfile(email) {
    currentUserEmail = email;
    notLoggedInBanner.classList.add('hidden');

    try {
        const snapshot = await database.ref('logins').orderByChild('email').equalTo(email).once('value');
        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            currentUserKey = keys[0];
            const user = data[keys[0]];
            isAdminUser = user.owner === true;

            if (user.displayName) {
                currentDisplayName = user.displayName;
                displayNameText.textContent = user.displayName;
                profileSubText.textContent = isAdminUser ? 'Admin' : '';
                newNameInput.value = user.displayName;
            } else {
                displayNameText.textContent = 'Anonymous';
                profileSubText.textContent = 'Press "Edit Display Name" to set your name';
            }

            updateAvatarDisplay();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    // Show title based on admin
    if (isAdminUser) {
        ticketsSectionTitle.textContent = 'All Tickets';
        loadAllTickets();
    } else {
        ticketsSectionTitle.textContent = 'My Tickets';
        loadMyTickets(email);
    }
}

function updateAvatarDisplay() {
    if (isAdminUser) {
        // Admin gets logo with background
        profileAvatarEl.innerHTML = `<img src="${adminPfpURL}" alt="Admin" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
    } else if (currentDisplayName !== 'Anonymous') {
        // Named user gets initial
        const initial = currentDisplayName.charAt(0).toUpperCase();
        profileAvatarEl.innerHTML = `<span style="font-size:18px;font-weight:700;color:white;">${initial}</span>`;
        profileAvatarEl.style.background = 'var(--accent-primary)';
        profileAvatarEl.style.borderRadius = '50%';
    } else {
        // Default grey silhouette
        profileAvatarEl.innerHTML = defaultPfpSVG;
        profileAvatarEl.style.background = 'transparent';
    }
}

// Edit Name Modal
editNameBtn.addEventListener('click', () => {
    newNameInput.value = currentDisplayName === 'Anonymous' ? '' : currentDisplayName;
    editNameModal.classList.remove('hidden');
    newNameInput.focus();
});

editNameBackdrop.addEventListener('click', () => { editNameModal.classList.add('hidden'); });
cancelNameBtn.addEventListener('click', () => { editNameModal.classList.add('hidden'); });

saveNameBtn.addEventListener('click', async () => {
    const name = newNameInput.value.trim();
    if (!name) return;

    currentDisplayName = name;
    displayNameText.textContent = name;
    profileSubText.textContent = isAdminUser ? 'Admin' : '';
    updateAvatarDisplay();
    editNameModal.classList.add('hidden');

    if (currentUserKey) {
        try {
            await database.ref('logins/' + currentUserKey).update({ displayName: name });
        } catch (error) {
            console.error('Error saving name:', error);
        }
    }
});

newNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveNameBtn.click(); });

// Submit Ticket
submitTicketBtn.addEventListener('click', async () => {
    const subject = ticketSubject.value.trim();
    const category = ticketCategory.value;
    const description = ticketDescription.value.trim();
    const file = ticketFile.files[0];

    ticketSuccessMsg.classList.add('hidden');
    ticketErrorMsg.classList.add('hidden');

    if (!subject || !description) {
        ticketErrorMsg.textContent = 'Please fill in the subject and description.';
        ticketErrorMsg.classList.remove('hidden');
        return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
        ticketErrorMsg.textContent = 'File is too large. Maximum size is 5MB.';
        ticketErrorMsg.classList.remove('hidden');
        return;
    }

    submitTicketBtn.disabled = true;
    submitTicketBtn.textContent = 'Submitting...';

    let fileURL = null;
    let fileName = null;

    // Upload file if provided
    if (file) {
        try {
            uploadProgress.classList.remove('hidden');
            const fileRef = storage.ref(`ticket-files/${Date.now()}_${file.name}`);
            const uploadTask = fileRef.put(file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        uploadFill.style.width = progress + '%';
                    },
                    reject,
                    async () => {
                        fileURL = await uploadTask.snapshot.ref.getDownloadURL();
                        fileName = file.name;
                        resolve();
                    }
                );
            });

            uploadProgress.classList.add('hidden');
        } catch (error) {
            console.error('File upload error:', error);
            ticketErrorMsg.textContent = 'File upload failed. Please try again.';
            ticketErrorMsg.classList.remove('hidden');
            submitTicketBtn.disabled = false;
            submitTicketBtn.textContent = 'Submit Ticket';
            uploadProgress.classList.add('hidden');
            return;
        }
    }

    try {
        const ticketData = {
            subject: subject,
            category: category,
            description: description,
            authorEmail: currentUserEmail || 'anonymous',
            authorName: currentDisplayName,
            authorKey: currentUserKey || null,
            isAdmin: isAdminUser,
            status: 'open',
            createdAt: new Date().toISOString(),
            fileURL: fileURL,
            fileName: fileName
        };

        await database.ref('tickets').push(ticketData);

        ticketSubject.value = '';
        ticketDescription.value = '';
        ticketCategory.value = 'login';
        ticketFile.value = '';
        ticketSuccessMsg.classList.remove('hidden');
        setTimeout(() => { ticketSuccessMsg.classList.add('hidden'); }, 5000);

    } catch (error) {
        console.error('Error submitting ticket:', error);
        ticketErrorMsg.textContent = 'Error submitting ticket. Please try again.';
        ticketErrorMsg.classList.remove('hidden');
    }

    submitTicketBtn.disabled = false;
    submitTicketBtn.textContent = 'Submit Ticket';
});

// Load ALL tickets (for admins and the shared ticket board)
function loadAllTickets() {
    database.ref('tickets').on('value', (snapshot) => {
        renderTickets(snapshot.val());
    });
}

// Load tickets for a specific user
function loadMyTickets(email) {
    database.ref('tickets').orderByChild('authorEmail').equalTo(email).on('value', (snapshot) => {
        renderTickets(snapshot.val());
    });
}

function renderTickets(tickets) {
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
            const isAuthorAdmin = ticket.isAdmin || false;

            // Determine pfp
            let pfpHtml;
            if (isAuthorAdmin) {
                pfpHtml = `<img src="${adminPfpURL}" class="ticket-pfp" alt="Admin">`;
            } else if (authorName !== 'Anonymous') {
                pfpHtml = `<div class="ticket-pfp-default ticket-pfp-initial">${initial}</div>`;
            } else {
                pfpHtml = `<div class="ticket-pfp-default ticket-pfp-grey">${defaultPfpSVG}</div>`;
            }

            // File attachment
            const fileHtml = ticket.fileURL
                ? `<div class="ticket-attachment">
                     <a href="${escapeHtml(ticket.fileURL)}" target="_blank" class="attachment-link">
                         <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                         ${escapeHtml(ticket.fileName || 'Attachment')}
                     </a>
                   </div>`
                : '';

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
                            <div class="ticket-date-small">${date}</div>
                        </div>
                    </div>
                    <p class="ticket-description">${escapeHtml(ticket.description)}</p>
                    ${fileHtml}
                    ${ticket.closeReason ? `<div class="ticket-close-reason">Closed by staff: ${escapeHtml(ticket.closeReason)}</div>` : ''}
                    <div class="ticket-footer">
                        <span class="ticket-date">${date}</span>
                    </div>
                </div>
            `;
        });
    }

    myTicketsList.innerHTML = html || '<p class="empty-state">No tickets yet.</p>';
    myTicketCount.textContent = count;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
