// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUserEmail = null;
let currentUserKey = null;
let currentDisplayName = 'Guest';
let isAdminUser = false;
let closingTicketKey = null;

// Elements
const displayNameText = document.getElementById('display-name-text');
const displayEmailText = document.getElementById('display-email-text');
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
const ticketSuccessMsg = document.getElementById('ticket-success-msg');
const ticketErrorMsg = document.getElementById('ticket-error-msg');
const myTicketsList = document.getElementById('my-tickets-list');
const myTicketCount = document.getElementById('my-ticket-count');

window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = sessionStorage.getItem('mccg_email');
    if (storedEmail) {
        loadUserProfile(storedEmail);
    } else {
        notLoggedInBanner.classList.remove('hidden');
        displayEmailText.textContent = 'Not logged in';
        loadMyTickets(null);
    }
});

async function loadUserProfile(email) {
    currentUserEmail = email;
    displayEmailText.textContent = email;
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
                newNameInput.value = user.displayName;
            } else {
                currentDisplayName = email.split('@')[0];
                displayNameText.textContent = currentDisplayName;
            }

            updateAvatarDisplay();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    loadMyTickets(email);
}

function updateAvatarDisplay() {
    const initial = currentDisplayName.charAt(0).toUpperCase();
    profileAvatarEl.textContent = '';
    profileAvatarEl.textContent = initial;
}

// Edit Name Modal
editNameBtn.addEventListener('click', () => {
    newNameInput.value = currentDisplayName;
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

    ticketSuccessMsg.classList.add('hidden');
    ticketErrorMsg.classList.add('hidden');

    if (!subject || !description) {
        ticketErrorMsg.textContent = 'Please fill in all fields before submitting.';
        ticketErrorMsg.classList.remove('hidden');
        return;
    }

    try {
        const ticketData = {
            subject: subject,
            category: category,
            description: description,
            authorEmail: currentUserEmail || 'guest@unknown',
            authorName: currentDisplayName,
            authorKey: currentUserKey || null,
            isAdmin: isAdminUser,
            status: 'open',
            createdAt: new Date().toISOString()
        };

        await database.ref('tickets').push(ticketData);

        ticketSubject.value = '';
        ticketDescription.value = '';
        ticketCategory.value = 'login';
        ticketSuccessMsg.classList.remove('hidden');
        setTimeout(() => { ticketSuccessMsg.classList.add('hidden'); }, 5000);

    } catch (error) {
        console.error('Error submitting ticket:', error);
        ticketErrorMsg.textContent = 'Error submitting ticket. Please try again.';
        ticketErrorMsg.classList.remove('hidden');
    }
});

// Load My Tickets
function loadMyTickets(email) {
    if (!email) {
        myTicketsList.innerHTML = '<p class="empty-state">Please log in to view your tickets.</p>';
        return;
    }

    database.ref('tickets').orderByChild('authorEmail').equalTo(email).on('value', (snapshot) => {
        const tickets = snapshot.val();
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

                const pfpHtml = isAdminUser
                    ? `<img src="https://i.ibb.co/HDxMBCcJ/gpt-image-1-5-high-fidelity-a-Make-the-M-have-a-pu.png" class="ticket-pfp" alt="Admin">`
                    : `<div class="ticket-pfp-default">${initial}</div>`;

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
                            </div>
                        </div>
                        <p class="ticket-description">${escapeHtml(ticket.description)}</p>
                        ${ticket.closeReason ? `<div class="ticket-close-reason">Closed by staff: ${escapeHtml(ticket.closeReason)}</div>` : ''}
                        <div class="ticket-footer">
                            <span class="ticket-date">${date}</span>
                        </div>
                    </div>
                `;
            });
        }

        myTicketsList.innerHTML = html || '<p class="empty-state">You have no tickets yet.</p>';
        myTicketCount.textContent = count;
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
