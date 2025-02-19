// Check if the browser supports the Web Speech API
if (!('speechSynthesis' in window)) {
    alert("Your browser does not support the Web Speech API. Please use Chrome or Edge.");
}

let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;

// Speak function
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find(voice => voice.name === "Google US English"); // Choose a voice
    utterance.pitch = 1; // Range: 0 to 2
    utterance.rate = 1;   // Range: 0.1 to 10
    utterance.volume = 1; // Range: 0 to 1
    speechSynthesis.speak(utterance);
}

// Schedule speech function
function scheduleSpeech(text, time) {
    const now = new Date();
    const [hours, minutes] = time.split(":");
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    const delay = scheduledTime - now;

    if (delay < 0) {
        console.log("The specified time has already passed today.");
        return;
    }

    setTimeout(() => {
        speak(text);
    }, delay);
}

// Wake word detection
function startWakeWordDetection() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            if (transcript.includes("hey assistant")) {
                speak("Hello! How can I help you?");
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
        };
    } else {
        console.log("Speech recognition is not supported in this browser.");
    }
}

// Start the assistant when the button is clicked
document.getElementById("start-btn").addEventListener("click", () => {
    console.log("Assistant is running...");

    // Schedule a greeting at a specific time
    scheduleSpeech("Good morning! It's time to start your day.", "08:00");

    // Start wake word detection
    startWakeWordDetection();
});