const API_KEY = "AIzaSyCHXpBJtIXI__FFTJXqasSw2cI4zUn4KBo";

const tabContainer = document.getElementById("tab-container");
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const newChatButton = document.getElementById("new-chat");

let conversations = {};
let activeTab = null;
let isSpeaking = false;
let speechInstance = null;

function createNewChat() {
    const tabId = `chat-${Date.now()}`;
    conversations[tabId] = [];

    const tab = document.createElement("div");
    tab.classList.add("tab");
    tab.textContent = `Chat ${Object.keys(conversations).length}`;
    tab.dataset.id = tabId;

    // Allow renaming tab on double-click
    tab.addEventListener("dblclick", () => renameTab(tab));

    tab.addEventListener("click", () => switchTab(tabId));
    tabContainer.appendChild(tab);
    switchTab(tabId);
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelector(`[data-id='${tabId}']`).classList.add("active");
    chatbox.innerHTML = "";
    conversations[tabId].forEach(({ text, sender }) => addMessage(text, sender, false));
}

async function sendMessage() {
    if (!activeTab) createNewChat();

    const userText = userInput.value.trim();
    if (!userText) return;

    addMessage(userText, "user");
    userInput.value = "";

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot", "typing");
    typingDiv.textContent = "Typing...";
    chatbox.appendChild(typingDiv);
    chatbox.scrollTop = chatbox.scrollHeight;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userText }] }],
                generationConfig: { maxOutputTokens: 400, temperature: 0.8 }
            })
        });

        const data = await response.json();
        chatbox.removeChild(typingDiv);

        let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't understand that.";
        botReply = formatMessage(botReply);
        addMessage(botReply, "bot");
    } catch (error) {
        console.error("Error:", error);
        chatbox.removeChild(typingDiv);
        addMessage("Error: Unable to connect to AI.", "bot");
    }
}

function addMessage(text, sender, saveToConversation = true) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    messageDiv.innerHTML = text;

    if (sender === "bot") {
        // Copy Button
        const copyIcon = document.createElement("button");
        copyIcon.textContent = "📋 Copy";
        copyIcon.classList.add("btn");
        copyIcon.onclick = () => copyToClipboard(text);
        
        // Read Aloud Button
        const readAloudBtn = document.createElement("button");
        readAloudBtn.textContent = "🔊 Read Aloud";
        readAloudBtn.classList.add("btn");
        readAloudBtn.onclick = function () {
            toggleReadAloud(text, readAloudBtn);
        };

        // Like & Dislike Buttons
        const likeBtn = document.createElement("button");
        likeBtn.textContent = "👍";
        likeBtn.classList.add("btn");
        likeBtn.onclick = function () {
            likeBtn.classList.toggle("liked");
            dislikeBtn.classList.remove("disliked");
        };

        const dislikeBtn = document.createElement("button");
        dislikeBtn.textContent = "👎";
        dislikeBtn.classList.add("btn");
        dislikeBtn.onclick = function () {
            dislikeBtn.classList.toggle("disliked");
            likeBtn.classList.remove("liked");
        };

        // Append Buttons
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");
        buttonContainer.append(copyIcon, readAloudBtn, likeBtn, dislikeBtn);

        messageDiv.appendChild(buttonContainer);
    }

    chatbox.appendChild(messageDiv);
    chatbox.scrollTop = chatbox.scrollHeight;

    if (saveToConversation) {
        conversations[activeTab].push({ text, sender });
    }
}

function toggleReadAloud(text, button) {
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        button.textContent = "🔊 Read Aloud";
    } else {
        speechInstance = new SpeechSynthesisUtterance(text);
        speechInstance.volume = 1;
        speechInstance.rate = 1;
        speechInstance.pitch = 1;
        speechInstance.voice = speechSynthesis.getVoices().find(voice => voice.name.includes("Google UK English Male")) || speechSynthesis.getVoices()[0];

        speechInstance.onend = () => {
            isSpeaking = false;
            button.textContent = "🔊 Read Aloud";
        };

        window.speechSynthesis.speak(speechInstance);
        isSpeaking = true;
        button.textContent = "⏹ Stop Reading";
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error("Error copying text:", err);
    });
}

function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
        .replace(/\*(.*?)\*/g, '<i>$1</i>') // Italic
        .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline Code
        .replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>') // Code Block
        .replace(/- (.*?)\n/g, '<li>$1</li>'); // Lists
}

function renameTab(tab) {
    const newName = prompt("Enter a new name for this chat:", tab.textContent);
    if (newName) {
        tab.textContent = newName;
    }
}

createNewChat();
newChatButton.addEventListener("click", createNewChat);
