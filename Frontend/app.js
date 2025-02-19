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
async function sendSOSMessage() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            try {
                // Fetch location name
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                const locationName = data.display_name || `Lat: ${latitude}, Lng: ${longitude}`;

                const message = {
                    sender: user.full_name, // ✅ Fix: Use user.full_name instead of username
                    text: `🚨 SOS! Emergency at: ${locationName}`,
                    timestamp: new Date().toLocaleTimeString(),
                };

                // ✅ Fix: Use chatMessages array instead of getChatMessages()
                chatMessages.push(message);
                saveChatMessages(chatMessages);

                // Update chat UI
                updateChat();

                // Speak the message if voice is enabled
                if (isVoiceEnabled) {
                    speakMessage(`Emergency alert sent by ${message.sender} at ${locationName}.`);
                }
            } catch (error) {
                console.error("Error fetching location name:", error);
                alert("Failed to get the exact location name. Sending location coordinates instead.");
            }
        }, () => {
            alert('Unable to retrieve location. Please check your settings.');
        });
    } else {
        alert('Geolocation is not supported by your browser.');
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
            showProfile();
            document.getElementById("profileContainer").classList.remove("hidden");
            if (isVoiceEnabled) speakMessage("This is your profile section.");
            break;
        default:
            document.getElementById("welcomeContainer").classList.remove("hidden");
    }
}

function showProfile() {
    if (!user) return;

    document.getElementById("profileName").textContent = user.full_name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileSinceDate").textContent = user.joined_date || "N/A";
    document.getElementById("profileLocation").textContent = user.location || "Unknown";

    const profilePic = document.getElementById("profilePic");
    
    // Use a valid placeholder image if the user's picture is missing
    const defaultPic = "https://www.w3schools.com/howto/img_avatar.png"; 
    profilePic.src = user.profile_picture && user.profile_picture.trim() ? user.profile_picture : defaultPic;
}

// ✅ Update profile picture
function updateProfilePicture() {
    const newPicUrl = prompt("Enter the URL of your new profile picture:");
    if (newPicUrl) {
        user.profile_picture = newPicUrl;
        localStorage.setItem("user", JSON.stringify(user));
        showProfile();
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

// ✅ Fetch messages and order them correctly
function fetchMessages() {
    fetch("http://127.0.0.1:5000/messages", {
        headers: { "Authorization": localStorage.getItem("token") }
    })
    .then(response => response.json())
    .then(data => {
        chatMessages = data.reverse(); // Oldest messages first
        updateChat();
    })
    .catch(error => console.error("Error fetching messages:", error));
}

// ✅ Send message with authorization
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
            "Authorization": localStorage.getItem("token")
        },
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
        input.value = "";
        fetchMessages();
    })
    .catch(error => console.error("Error sending message:", error));
}

// ✅ Update chat UI and include timestamps
function updateChat() {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = ""; // Clear previous messages

    chatMessages.forEach(msg => {
        const messageClass = msg.user_id === user.id ? "sent" : "received";
        const timeAgo = timeSince(new Date(msg.created_at)); // ✅ Convert timestamp

        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-message", messageClass);
        messageElement.innerHTML = `
            <strong>${msg.full_name}:</strong> ${msg.message}
            <div class="timestamp">${timeAgo}</div> <!-- ✅ Display timestamp -->
        `;

        chatBox.appendChild(messageElement);
    });

    // ✅ Auto-scroll to the latest message
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✅ Convert timestamp to "X minutes ago"
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) return `${interval} years ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} months ago`;
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} days ago`;
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} hours ago`;
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} minutes ago`;
    
    return "Just now";
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
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            alert("Login successful!");
            window.location.reload();
        } else {
            alert("Login failed!");
        }
    } catch (error) {
        console.error("Error logging in:", error);
    }
}
function openCamera() {
    const cameraContainer = document.getElementById("cameraContainer");
    const video = document.getElementById("cameraFeed");

    cameraContainer.classList.remove("hidden");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Camera access denied:", err);
            alert("Please allow camera access.");
        });
}

function closeCamera() {
    const video = document.getElementById("cameraFeed");

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    document.getElementById("cameraContainer").classList.add("hidden");
}

function captureImage() {
    const video = document.getElementById("cameraFeed");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL("image/png");

    closeCamera();

    sendImageToChat(imageDataUrl);
}

function sendImageToChat(imageUrl) {
    const messageData = { 
        sender: username, 
        type: "image", 
        content: imageUrl, 
        timestamp: new Date().toLocaleTimeString() 
    };
    const messages = getChatMessages();
    messages.push(messageData);
    saveChatMessages(messages);
    updateChat();
}