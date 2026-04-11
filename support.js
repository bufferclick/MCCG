// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State
let currentUserEmail = null;
let currentUserKey = null;
let isAdmin = false;
let closingTicketKey = null;

// Elements
const displayNameText = document.getElementById('display-name-text');
const displayEmailText = document.getElementById('display-email-text');
const editNameBtn = document.getElementById('edit-name-btn');
const editNameModal = document.getElementById('edit-name-modal');
const editNameBackdrop = document.getElementById('edit-name-backdrop');
const newNameInput = document.getElementById('new-name-input');
const saveNameBtn = document.getElementById('save-name-btn');
const cancelNameBtn = document.getElementById('cancel-name-btn');

const submitTicketBtn = document.getElementById('submit-ticket-btn');
const ticketSubject = document.getElementById('ticket-subject');
const ticketCategory = document.getElementById('ticket-category');
const ticketDescription = document.getElementById('ticket-description');
const ticketSuccessMsg = document.getElementById('ticket-success-msg');
const ticketErrorMsg = document.getElementById('ticket-error-msg');
const myTicketsList = document.getElementById('my-tickets-list');
const myTicketCount = document.getElementById('my-ticket-count');

const closeTicketModal = document.getElementById('close-ticket-modal');
const closeTicketBackdrop = document.getElementById('close-ticket-backdrop');
const closeReasonInput = document.getElementById('close-reason-input');
const confirmCloseBtn = document.getElementById('confirm-close-btn');
const cancelCloseBtn = document.getElementById('cancel-close-btn');

// Load user from firebase based on stored email
window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = sessionStorage.getItem('mccg_email');
    if (storedEmail) {
        loadUserProfile(storedEmail);
    }
});

// Also listen if user came from login
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'user-info') {
        loadUserProfile(event.data.email);
    }
});

async function loadUserProfile(email) {
    currentUserEmail = email;
    displayEmailText.textContent = email;

    // Find user in Firebase logins
    try {
        const snapshot = await database.ref('logins').orderByChild('email').equalTo(email).once('value');
        const data = snapshot.val();
        if (data) {
            const keys = Object.keys(data);
            currentUserKey = keys[0];
            const user = data[keys[0]];

            // Load display name
            if (user.displayName) {
                displayNameText.textContent = user.displayName;
                newNameInput.value = user.displayName;
            }

            isAdmin = user.owner === true;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    loadMyTickets();
}

// Edit Name Modal
editNameBtn.addEventListener('click', () => {
    editNameModal.classList.remove('hidden');
    newNameInput.focus();
});

editNameBackdrop.addEventListener('click', () => {
    editNameModal.classList.add('hidden');
});

cancelNameBtn.addEventListener('click', () => {
    editNameModal.classList.add('hidden');
});

saveNameBtn.addEventListener('click', async () => {
    const name = newNameInput.value.trim();
    if (!name) return;

    displayNameText.textContent = name;
    editNameModal.classList.add('hidden');

    // Save to Firebase
    if (currentUserKey) {
        try {
            await database.ref('logins/' + currentUserKey).update({ displayName: name });
        } catch (error) {
            console.error('Error saving name:', error);
        }
    }
});

newNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveNameBtn.click();
});

// Submit Ticket
submitTicketBtn.addEventListener('click', async () => {
    const subject = ticketSubject.value.trim();
    const category = ticketCategory.value;
    const description = ticketDescription.value.trim();

    ticketSuccessMsg.classList.add('hidden');
    ticketErrorMsg.classList.add('hidden');

    if (!subject || !description) {
        ticketErrorMsg.classList.remove('hidden');
        return;
    }

    try {
        await database.ref('tickets').push({
            subject: subject,
            category: category,
            description: description,
            authorEmail: currentUserEmail || 'anonymous',
            authorName: displayNameText.textContent || 'Anonymous',
            authorKey: currentUserKey || null,
            status: 'open',
            createdAt: new Date().toISOString()
        });

        ticketSubject.value = '';
        ticketDescription.value = '';
        ticketCategory.value = 'login';
        ticketSuccessMsg.classList.remove('hidden');

        setTimeout(() => {
            ticketSuccessMsg.classList.add('hidden');
        }, 5000);

    } catch (error) {
        console.error('Error submitting ticket:', error);
        ticketErrorMsg.textContent = 'Error submitting ticket. Please try again.';
        ticketErrorMsg.classList.remove('hidden');
    }
});

// Load My Tickets
function loadMyTickets() {
    if (!currentUserEmail) {
        myTicketsList.innerHTML = '<p class="empty-state">Please log in to view your tickets.</p>';
        return;
    }

    database.ref('tickets').orderByChild('authorEmail').equalTo(currentUserEmail).on('value', (snapshot) => {
        const tickets = snapshot.val();
        let html = '';
        let count = 0;

        if (tickets) {
            Object.keys(tickets).reverse().forEach(key => {
                const ticket = tickets[key];
                count++;
                const date = new Date(ticket.createdAt).toLocaleString();
                const statusClass = ticket.status || 'open';

                html += `
                    <div class="ticket-card status-${statusClass}">
                        <div class="ticket-header">
                            <span class="ticket-title">${escapeHtml(ticket.subject)}</span>
                            <div class="ticket-meta">
                                <span class="ticket-status ${statusClass}">${statusClass}</span>
                                <span class="ticket-category-badge">${escapeHtml(ticket.category)}</span>
                            </div>
                        </div>
                        <p class="ticket-description">${escapeHtml(ticket.description)}</p>
                        ${ticket.closeReason ? `<div class="ticket-close-reason">Closed: ${escapeHtml(ticket.closeReason)}</div>` : ''}
                        <div class="ticket-footer">
                            <span class="ticket-date">${date}</span>
                        </div>
                    </div>
                `;
            });
        }

        myTicketsList.innerHTML = html || '<p class="empty-state">You have no active tickets.</p>';
        myTicketCount.textContent = count;
    });
}

// Close Ticket Modal (for admin usage on support page)
closeTicketBackdrop.addEventListener('click', () => {
    closeTicketModal.classList.add('hidden');
    closeReasonInput.value = '';
    closingTicketKey = null;
});

cancelCloseBtn.addEventListener('click', () => {
    closeTicketModal.classList.add('hidden');
    closeReasonInput.value = '';
    closingTicketKey = null;
});

confirmCloseBtn.addEventListener('click', async () => {
    const reason = closeReasonInput.value.trim();
    if (!reason) { alert('Please enter a reason.'); return; }

    if (closingTicketKey) {
        try {
            await database.ref('tickets/' + closingTicketKey).update({
                status: 'closed',
                closeReason: reason
            });
        } catch (error) {
            console.error('Error closing ticket:', error);
        }
    }

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
