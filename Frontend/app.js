let map = null;
let chatMessages = [];
let isVoiceEnabled = false;
const synth = window.speechSynthesis;

// ✅ Get user from localStorage
let user = JSON.parse(localStorage.getItem("user"));
if (!user) {
    window.location.href = "index.html"; // Redirect to login if not logged in
}

document.addEventListener("DOMContentLoaded", async function () {
    document.getElementById("usernameDisplay").textContent = user.full_name;

    // Voice toggle button
    const voiceToggle = document.getElementById("voiceToggle");
    voiceToggle.addEventListener("click", toggleVoice);

    if (isVoiceEnabled) {
        speakMessage(`Welcome to the community app, ${user.full_name}!`);
    }

    await fetchMessages();
});

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const voiceToggle = document.getElementById("voiceToggle");
    voiceToggle.innerHTML = isVoiceEnabled ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';

    if (isVoiceEnabled) {
        speakMessage("Voice feature is now enabled.");
    } else {
        synth.cancel();
    }
}

function speakMessage(message) {
    if (isVoiceEnabled && synth) {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1;
        utterance.pitch = 1;
        synth.speak(utterance);
    }
}

function showSection(section) {
    document.querySelectorAll(".content > div").forEach((div) => {
        div.classList.add("hidden");
    });

    switch (section) {
        case "map":
            document.getElementById("mapContainer").classList.remove("hidden");
            initMap();
            break;
        case "chat":
            document.getElementById("chatContainer").classList.remove("hidden");
            updateChat();
            break;
        case "features":
            document.getElementById("featuresContainer").classList.remove("hidden");
            if (isVoiceEnabled) speakMessage("Here are the community features.");
            break;
        case "profile":
            showProfile(); // Load profile dynamically
            document.getElementById("profileContainer").classList.remove("hidden");
            if (isVoiceEnabled) speakMessage("This is your profile section.");
            break;
        default:
            document.getElementById("welcomeContainer").classList.remove("hidden");
    }
}

// ✅ Display user profile
function showProfile() {
    if (!user) return;

    document.getElementById("profileName").textContent = user.full_name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileSinceDate").textContent = user.joined_date || "N/A";
    document.getElementById("profileLocation").textContent = user.location || "Unknown";

    // Set profile picture (default if not available)
    const profilePic = document.getElementById("profilePic");
    profilePic.src = user.profile_picture || "https://via.placeholder.com/150";
}

// ✅ Update profile picture on click
function updateProfilePicture() {
    const newPicUrl = prompt("Enter the URL of your new profile picture:");
    if (newPicUrl) {
        user.profile_picture = newPicUrl;
        localStorage.setItem("user", JSON.stringify(user)); // Update localStorage
        showProfile(); // Refresh profile section
    }
}

// ✅ Initialize map
function initMap() {
    if (!map) {
        map = L.map("map").setView([0, 0], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            map.setView([position.coords.latitude, position.coords.longitude], 13);
            L.marker([position.coords.latitude, position.coords.longitude]).addTo(map);
        });
    }
}

// ✅ Fetch Messages with Authorization
function fetchMessages() {
    fetch("http://127.0.0.1:5000/messages", {
        headers: { "Authorization": localStorage.getItem("token") }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        chatMessages = data;
        updateChat();
    })
    .catch(error => console.error("Error fetching messages:", error));
}

// ✅ Send Message with Authorization
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    if (!user) {
        alert("Please log in first!");
        window.location.href = "index.html";
        return;
    }

    fetch("http://localhost:5000/messages", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": localStorage.getItem("token") // Send JWT token
        },
        body: JSON.stringify({ message }) // Remove user_id (backend gets it from JWT)
    })
    .then(response => response.json())
    .then(data => {
        input.value = "";
        fetchMessages(); // Refresh chat
    })
    .catch(error => console.error("Error sending message:", error));
}

// ✅ Update chat messages
function updateChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = chatMessages.map(msg => {
        const messageClass = msg.user_id === user.id ? "sent" : "received";
        return `<div class="chat-message ${messageClass}"><strong>${msg.full_name}:</strong> ${msg.message}</div>`;
    }).join('');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ Store user data on login
async function login() {
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem("token", data.token); // Store JWT token
            localStorage.setItem("user", JSON.stringify(data.user)); // Store user object
            alert("Login successful!");
            window.location.reload();
        } else {
            alert("Login failed!");
        }
    } catch (error) {
        console.error("Error logging in:", error);
    }
}
