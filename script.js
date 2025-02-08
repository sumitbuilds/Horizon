// ------------------------- Variables and Setup -------------------------
const API_KEY = "AIzaSyCHXpBJtIXI__FFTJXqasSw2cI4zUn4KBo";
const tabContainer = document.getElementById("tab-container");
const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const newChatButton = document.getElementById("new-chat");
const themeToggleButton = document.getElementById("theme-toggle");
const micToggle = document.getElementById("mic-toggle");

let conversations = {};
let activeTab = null;
let isSpeaking = false;
let speechInstance = null;
let recognition;
let isRecording = false;

// Setup speech recognition if available
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
} else if ('SpeechRecognition' in window) {
  recognition = new SpeechRecognition();
}

if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    userInput.value += transcript;
    isRecording = false;
    micToggle.innerHTML = '<i class="fa-solid fa-microphone"></i>';
  };
  recognition.onerror = function(event) {
    console.error(event.error);
    isRecording = false;
    micToggle.innerHTML = '<i class="fa-solid fa-microphone"></i>';
  };
}

micToggle.addEventListener("click", () => {
  if (recognition) {
    if (!isRecording) {
      isRecording = true;
      micToggle.innerHTML = '<i class="fa-solid fa-stop"></i>';
      recognition.start();
    } else {
      isRecording = false;
      micToggle.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      recognition.stop();
    }
  }
});

themeToggleButton.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  if (document.body.classList.contains("light-mode")) {
    themeToggleButton.innerHTML = '<i class="fa-solid fa-moon"></i>';
  } else {
    themeToggleButton.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }
});

// ------------------------- Conversation Persistence -------------------------
function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

function loadConversations() {
  const saved = localStorage.getItem("conversations");
  if (saved) {
    conversations = JSON.parse(saved);
    Object.keys(conversations).forEach((tabId, index) => {
      createTabElement(tabId, `Chat ${index + 1}`);
    });
    const keys = Object.keys(conversations);
    if (keys.length > 0) {
      activeTab = keys[keys.length - 1];
      switchTab(activeTab);
    }
  }
}

// ------------------------- Tab Functions -------------------------
function createTabElement(tabId, tabName) {
  const tab = document.createElement("div");
  tab.classList.add("tab");
  tab.dataset.id = tabId;

  const titleSpan = document.createElement("span");
  titleSpan.classList.add("tab-title");
  titleSpan.textContent = tabName;

  const menuBtn = document.createElement("button");
  menuBtn.classList.add("tab-menu-btn");
  menuBtn.innerHTML = '<i class="fa-solid fa-ellipsis-v"></i>';
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTabMenu(tab, tabId);
  });

  tab.appendChild(titleSpan);
  tab.appendChild(menuBtn);
  tab.addEventListener("click", () => switchTab(tabId));
  tabContainer.appendChild(tab);
}

function toggleTabMenu(tab, tabId) {
  let dropdown = tab.querySelector(".tab-menu-dropdown");
  if (dropdown) {
    dropdown.remove();
    return;
  }
  dropdown = document.createElement("div");
  dropdown.classList.add("tab-menu-dropdown");

  const renameOption = document.createElement("div");
  renameOption.classList.add("tab-menu-option");
  renameOption.textContent = "Rename Chat";
  renameOption.addEventListener("click", (e) => {
    e.stopPropagation();
    renameTab(tab);
    dropdown.remove();
  });

  const deleteOption = document.createElement("div");
  deleteOption.classList.add("tab-menu-option");
  deleteOption.textContent = "Delete Chat";
  deleteOption.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTab(tab, tabId);
  });

  dropdown.appendChild(renameOption);
  dropdown.appendChild(deleteOption);
  tab.appendChild(dropdown);
}

document.addEventListener("click", (e) => {
  const dropdowns = document.querySelectorAll(".tab-menu-dropdown");
  dropdowns.forEach(dropdown => {
    if (!dropdown.contains(e.target) && !dropdown.parentElement.contains(e.target)) {
      dropdown.remove();
    }
  });
});

function deleteTab(tab, tabId) {
  if (confirm("Are you sure you want to delete this chat?")) {
    tab.remove();
    delete conversations[tabId];
    saveConversations();
    if (activeTab === tabId) {
      const remaining = Object.keys(conversations);
      if (remaining.length > 0) {
        activeTab = remaining[remaining.length - 1];
        switchTab(activeTab);
      } else {
        activeTab = null;
        createNewChat();
      }
    }
  }
}

function renameTab(tab) {
  const titleSpan = tab.querySelector(".tab-title");
  const newName = prompt("Enter a new name for this chat:", titleSpan.textContent);
  if (newName) {
    titleSpan.textContent = newName;
  }
}

function createNewChat() {
  const tabId = `chat-${Date.now()}`;
  conversations[tabId] = [];
  createTabElement(tabId, `Chat ${Object.keys(conversations).length}`);
  switchTab(tabId);
  saveConversations();
}

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  const activeTabElement = document.querySelector(`[data-id='${tabId}']`);
  if (activeTabElement) {
    activeTabElement.classList.add("active");
  }
  chatbox.innerHTML = "";
  if (conversations[tabId]) {
    conversations[tabId].forEach(({ text, sender }) => addMessage(text, sender, false));
  }
}

// ------------------------- Chat Functions -------------------------
async function sendMessage() {
  if (!activeTab) createNewChat();
  const userText = userInput.value.trim();
  if (!userText) return;
  addMessage(userText, "user");
  userInput.value = "";
  
  // Build conversation history using raw text (without prefixes)
  const conversationHistory = conversations[activeTab]
    .map(msg => msg.text)
    .join("\n");
  
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("message", "bot", "typing");
  typingDiv.innerHTML = '<div class="loading-spinner"><span></span><span></span><span></span></div>';
  chatbox.appendChild(typingDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: conversationHistory }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.8 }
      })
    });
    const data = await response.json();
    chatbox.removeChild(typingDiv);
    
    let botReply = data.candidates &&
                   data.candidates[0] &&
                   data.candidates[0].content &&
                   data.candidates[0].content.parts &&
                   data.candidates[0].content.parts[0] &&
                   data.candidates[0].content.parts[0].text;
    if (!botReply) {
      botReply = "I couldn't understand that.";
    }
    botReply = formatMessage(botReply);
    // Do NOT prepend "Bot:" here; it will be added only for display
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
  
  // For bot messages, display with a single "Bot:" prefix (without storing the prefix)
  if (sender === "bot") {
    messageDiv.innerHTML = "Bot: " + text;
  } else {
    messageDiv.innerHTML = text;
  }
  
  chatbox.appendChild(messageDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
  
  // Save the raw text (without the "Bot:" prefix) in conversation history
  if (saveToConversation) {
    conversations[activeTab].push({ text, sender });
    saveConversations();
  }
  
  // If the message is from the bot, add action buttons below the message
  if (sender === "bot") {
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("bot-buttons");
    
    const copyBtn = document.createElement("button");
    copyBtn.classList.add("btn", "copy-btn");
    copyBtn.setAttribute("data-tooltip", "Copy");
    copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
    copyBtn.onclick = () => copyToClipboard(text);
    
    const readAloudBtn = document.createElement("button");
    readAloudBtn.classList.add("btn", "read-aloud-btn");
    readAloudBtn.setAttribute("data-tooltip", "Read Aloud");
    readAloudBtn.innerHTML = '<i class="fa-solid fa-volume-up"></i>';
    readAloudBtn.onclick = function () {
      toggleReadAloud(text, readAloudBtn);
    };
    
    const likeBtn = document.createElement("button");
    likeBtn.classList.add("btn", "like-btn");
    likeBtn.setAttribute("data-tooltip", "Like");
    likeBtn.innerHTML = '<i class="fa-solid fa-thumbs-up"></i>';
    likeBtn.onclick = function () {
      likeBtn.classList.toggle("liked");
      if (dislikeBtn.classList.contains("disliked")) {
        dislikeBtn.classList.remove("disliked");
      }
    };
    
    const dislikeBtn = document.createElement("button");
    dislikeBtn.classList.add("btn", "dislike-btn");
    dislikeBtn.setAttribute("data-tooltip", "Dislike");
    dislikeBtn.innerHTML = '<i class="fa-solid fa-thumbs-down"></i>';
    dislikeBtn.onclick = function () {
      dislikeBtn.classList.toggle("disliked");
      if (likeBtn.classList.contains("liked")) {
        likeBtn.classList.remove("liked");
      }
    };
    
    buttonContainer.append(copyBtn, readAloudBtn, likeBtn, dislikeBtn);
    chatbox.appendChild(buttonContainer);
    chatbox.scrollTop = chatbox.scrollHeight;
  }
}

function toggleReadAloud(text, button) {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    button.innerHTML = '<i class="fa-solid fa-volume-up"></i>';
  } else {
    speechInstance = new SpeechSynthesisUtterance(text);
    speechInstance.volume = 1;
    speechInstance.rate = 1;
    speechInstance.pitch = 1;
    const voices = speechSynthesis.getVoices();
    speechInstance.voice = voices.find(voice => voice.name.includes("Google UK English Male")) || voices[0];
    speechInstance.onend = () => {
      isSpeaking = false;
      button.innerHTML = '<i class="fa-solid fa-volume-up"></i>';
    };
    window.speechSynthesis.speak(speechInstance);
    isSpeaking = true;
    button.innerHTML = '<i class="fa-solid fa-stop"></i>';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Copied to clipboard!");
    })
    .catch(err => {
      console.error("Error copying text:", err);
    });
}

function formatMessage(text) {
  // Basic markdown formatting for headers, bold, and italics
  text = text.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
  text = text.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
  text = text.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
  text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/\n{2,}/g, "</p><p>");
  text = "<p>" + text + "</p>";
  return text;
}

// ------------------------- Initialization -------------------------
loadConversations();
if (!activeTab) {
  createNewChat();
}
newChatButton.addEventListener("click", createNewChat);
