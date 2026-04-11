const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ImgBB API key
const IMGBB_API_KEY = 'bc1c7edb270f7c38725b31c47680d9bb';

let currentUserEmail = null;
let currentUserKey = null;
let currentDisplayName = 'Anonymous';
let isAdminUser = false;
let currentTicketKey = null;
let pendingImageURL = null;
let chatListener = null;

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
const ticketSuccessMsg = document.getElementById('ticket-success-msg');
const ticketErrorMsg = document.getElementById('ticket-error-msg');
const myTicketsList = document.getElementById('my-tickets-list');
const myTicketCount = document.getElementById('my-ticket-count');
const ticketsSectionTitle = document.getElementById('tickets-section-title');
const ticketsListView = document.getElementById('tickets-list-view');
const chatView = document.getElementById('chat-view');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg-btn');
const backBtn = document.getElementById('back-to-tickets-btn');
const chatTicketTitle = document.getElementById('chat-ticket-title');
const chatTicketStatus = document.getElementById('chat-ticket-status');
const attachBtn = document.getElementById('attach-btn');
const imagePreviewArea = document.getElementById('image-preview-area');
const previewImg = document.getElementById('preview-img');
const removePreviewBtn = document.getElementById('remove-preview-btn');

const defaultPfpSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="#8e9297">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
</svg>`;

const adminPfpURL = 'https://i.ibb.co/HDxMBCcJ/gpt-image-1-5-high-fidelity-a-Make-the-M-have-a-pu.png';

window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = sessionStorage.getItem('mccg_email');
    if (storedEmail) {
        loadUserProfile(storedEmail);
    } else {
        notLoggedInBanner.classList.remove('hidden');
        loadTickets();
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
                newNameInput.value = user.displayName;
            } else {
                displayNameText.textContent = 'Anonymous';
            }

            profileSubText.textContent = isAdminUser ? 'Admin' : 'Press "Edit Display Name" to set your name';
            updateAvatarDisplay();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }

    if (isAdminUser) {
        ticketsSectionTitle.textContent = 'All Tickets';
    } else {
        ticketsSectionTitle.textContent = 'My Tickets';
    }

    loadTickets();
}

function updateAvatarDisplay() {
    profileAvatarEl.style.background = 'transparent';
    if (isAdminUser) {
        profileAvatarEl.innerHTML = `<img src="${adminPfpURL}" alt="Admin" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`;
    } else if (currentDisplayName !== 'Anonymous') {
        const initial = currentDisplayName.charAt(0).toUpperCase();
        profileAvatarEl.innerHTML = `<span style="font-size:18px;font-weight:700;color:white;">${initial}</span>`;
        profileAvatarEl.style.background = 'var(--accent-primary)';
        profileAvatarEl.style.borderRadius = '50%';
        profileAvatarEl.style.width = '36px';
        profileAvatarEl.style.height = '36px';
        profileAvatarEl.style.display = 'flex';
        profileAvatarEl.style.alignItems = 'center';
        profileAvatarEl.style.justifyContent = 'center';
    } else {
        profileAvatarEl.innerHTML = defaultPfpSVG;
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

    ticketSuccessMsg.classList.add('hidden');
    ticketErrorMsg.classList.add('hidden');

    if (!subject || !description) {
        ticketErrorMsg.textContent = 'Please fill in the subject and description.';
        ticketErrorMsg.classList.remove('hidden');
        return;
    }

    submitTicketBtn.disabled = true;
    submitTicketBtn.textContent = 'Submitting...';

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
            createdAt: new Date().toISOString()
        };

        const ref = await database.ref('tickets').push(ticketData);

        // Add first message as the description
        await database.ref('ticket_messages/' + ref.key).push({
            text: description,
            author: currentDisplayName,
            authorEmail: currentUserEmail || 'anonymous',
            isAdmin: isAdminUser,
            timestamp: new Date().toISOString(),
            type: 'text'
        });

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

    submitTicketBtn.disabled = false;
    submitTicketBtn.textContent = 'Submit Ticket';
});

// Load tickets
function loadTickets() {
    let query;
    if (isAdminUser) {
        query = database.ref('tickets');
    } else if (currentUserEmail) {
        query = database.ref('tickets').orderByChild('authorEmail').equalTo(currentUserEmail);
    } else {
        myTicketsList.innerHTML = '<p class="empty-state">Login to view your tickets.</p>';
        return;
    }

    query.on('value', (snapshot) => {
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

                html += `
                    <div class="ticket-card status-${statusClass}" data-key="${key}">
                        <div class="ticket-header">
                            <span class="ticket-title">${escapeHtml(ticket.subject)}</span>
                            <div class="ticket-meta">
                                <span class="ticket-status ${statusClass}">${statusClass}</span>
                                <span class="ticket-category-badge">${escapeHtml(ticket.category)}</span>
                            </div>
                        </div>
                        <p class="ticket-description" style="margin-bottom:12px;">${escapeHtml(ticket.description)}</p>
                        <div class="ticket-footer">
                            <span class="ticket-date">By ${escapeHtml(authorName)} — ${date}</span>
                            <button class="open-chat-btn primary-btn" data-key="${key}" data-title="${escapeHtml(ticket.subject)}" data-status="${statusClass}">
                                Open Chat
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        myTicketsList.innerHTML = html || '<p class="empty-state">No tickets yet.</p>';
        myTicketCount.textContent = count;

        document.querySelectorAll('.open-chat-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                openChat(this.dataset.key, this.dataset.title, this.dataset.status);
            });
        });
    });
}

// Open Chat
function openChat(ticketKey, title, status) {
    currentTicketKey = ticketKey;
    chatTicketTitle.textContent = title;
    chatTicketStatus.textContent = status;
    chatTicketStatus.className = 'ticket-status ' + status;

    ticketsListView.classList.add('hidden');
    chatView.classList.remove('hidden');
    chatMessages.innerHTML = '';

    // Remove previous listener
    if (chatListener) {
        database.ref('ticket_messages/' + chatListener).off();
    }
    chatListener = ticketKey;

    database.ref('ticket_messages/' + ticketKey).on('value', (snapshot) => {
        const messages = snapshot.val();
        chatMessages.innerHTML = '';

        if (messages) {
            Object.keys(messages).forEach(key => {
                const msg = messages[key];
                renderMessage(msg);
            });
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function renderMessage(msg) {
    const isMine = msg.authorEmail === currentUserEmail;
    const isAdminMsg = msg.isAdmin || false;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let pfpHtml;
    if (isAdminMsg) {
        pfpHtml = `<img src="${adminPfpURL}" class="msg-pfp" alt="Admin">`;
    } else if (msg.author && msg.author !== 'Anonymous') {
        const initial = msg.author.charAt(0).toUpperCase();
        pfpHtml = `<div class="msg-pfp msg-pfp-initial">${initial}</div>`;
    } else {
        pfpHtml = `<div class="msg-pfp msg-pfp-grey">${defaultPfpSVG}</div>`;
    }

    let contentHtml = '';
    if (msg.type === 'image') {
        contentHtml = `<img src="${escapeHtml(msg.imageURL)}" class="chat-image" alt="image" onclick="window.open('${escapeHtml(msg.imageURL)}','_blank')">`;
    } else if (msg.type === 'video') {
        contentHtml = `<video controls class="chat-video" src="${escapeHtml(msg.imageURL)}"></video>`;
    } else {
        contentHtml = `<p class="msg-text">${escapeHtml(msg.text)}</p>`;
    }

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${isMine ? 'mine' : 'theirs'}`;
    msgEl.innerHTML = `
        <div class="msg-pfp-wrap">${pfpHtml}</div>
        <div class="msg-body">
            <div class="msg-meta">
                <span class="msg-author">${escapeHtml(msg.author || 'Anonymous')}</span>
                <span class="msg-time">${time}</span>
            </div>
            ${contentHtml}
        </div>
    `;

    chatMessages.appendChild(msgEl);
}

// Send message
sendMsgBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !pendingImageURL) return;
    if (!currentTicketKey) return;

    const msgData = {
        author: currentDisplayName,
        authorEmail: currentUserEmail || 'anonymous',
        isAdmin: isAdminUser,
        timestamp: new Date().toISOString()
    };

    if (pendingImageURL) {
        const ext = pendingImageURL.toLowerCase();
        if (ext.includes('.mp4') || ext.includes('.webm')) {
            msgData.type = 'video';
        } else {
            msgData.type = 'image';
        }
        msgData.imageURL = pendingImageURL;
        msgData.text = text || '';
    } else {
        msgData.type = 'text';
        msgData.text = text;
    }

    try {
        await database.ref('ticket_messages/' + currentTicketKey).push(msgData);
        chatInput.value = '';
        pendingImageURL = null;
        imagePreviewArea.classList.add('hidden');
        previewImg.src = '';
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Attach button - uses ImgBB upload
attachBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/mp4,video/webm';
    input.click();

    input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
            // For video, create object URL for preview and upload differently
            const objectURL = URL.createObjectURL(file);
            // Videos can't be uploaded to ImgBB, store as data URL or skip preview
            // Show preview
            previewImg.src = '';
            previewImg.style.display = 'none';
            imagePreviewArea.classList.remove('hidden');

            // Upload video to ImgBB is not supported, so we read as base64 and note URL
            // Actually just create a blob URL for now (works within session)
            pendingImageURL = objectURL;

            const videoPreview = document.createElement('video');
            videoPreview.src = objectURL;
            videoPreview.controls = true;
            videoPreview.style.cssText = 'max-width:100%;max-height:120px;border-radius:8px;';
            const inner = document.querySelector('.image-preview-inner');
            // Remove old video if any
            const oldVideo = inner.querySelector('video');
            if (oldVideo) oldVideo.remove();
            inner.insertBefore(videoPreview, inner.querySelector('button'));
            return;
        }

        // Image - upload to ImgBB
        attachBtn.disabled = true;
        attachBtn.style.opacity = '0.5';

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];

            try {
                const formData = new FormData();
                formData.append('key', IMGBB_API_KEY);
                formData.append('image', base64);

                const response = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    pendingImageURL = data.data.url;
                    previewImg.src = pendingImageURL;
                    previewImg.style.display = 'block';
                    imagePreviewArea.classList.remove('hidden');
                } else {
                    alert('Image upload failed. Please try again.');
                }
            } catch (error) {
                console.error('ImgBB upload error:', error);
                alert('Image upload failed. Please try again.');
            }

            attachBtn.disabled = false;
            attachBtn.style.opacity = '1';
        };

        reader.readAsDataURL(file);
    });
});

removePreviewBtn.addEventListener('click', () => {
    pendingImageURL = null;
    previewImg.src = '';
    previewImg.style.display = 'none';
    imagePreviewArea.classList.add('hidden');
    const inner = document.querySelector('.image-preview-inner');
    const oldVideo = inner.querySelector('video');
    if (oldVideo) oldVideo.remove();
});

// Back to tickets
backBtn.addEventListener('click', () => {
    if (chatListener) {
        database.ref('ticket_messages/' + chatListener).off();
        chatListener = null;
    }
    currentTicketKey = null;
    pendingImageURL = null;
    imagePreviewArea.classList.add('hidden');
    chatView.classList.add('hidden');
    ticketsListView.classList.remove('hidden');
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
