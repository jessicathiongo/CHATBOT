const sendButton = document.getElementById("send-button");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
let isProcessing = false;
let currentStreamingId = null;

// Add event listeners
sendButton.addEventListener("click", handleUserMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !isProcessing) handleUserMessage();
});


async function handleUserMessage() {
  if (isProcessing) return;
  const message = userInput.value.trim();
  if (!message) return;

  isProcessing = true;
  sendButton.disabled = true;

  displayMessage(message, "user");
  userInput.value = "";

  showTypingIndicator();

  try {
    const response = await fetch("https://thera-ezac.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let botResponse = "";

    const streamingId = Date.now().toString();
    currentStreamingId = streamingId;
    createStreamingMessage(streamingId);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (currentStreamingId !== streamingId) {
        reader.cancel();
        break;
      }
      botResponse += decoder.decode(value, { stream: true });
      updateStreamingMessage(streamingId, botResponse);
    }

    finalizeStreamingMessage(streamingId, botResponse);
  } catch (error) {
    console.error("Error:", error);
    displayMessage(
      "Sorry, I'm having trouble responding. Please try again.",
      "bot"
    );
  } finally {
    hideTypingIndicator();
    isProcessing = false;
    sendButton.disabled = false;
    currentStreamingId = null;
  }
}

function displayMessage(content, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.innerHTML = `
        <div class="message-timestamp">${timestamp}</div>
        <div class="message-content">${content}</div>
    `;

  chatBox.appendChild(messageDiv);
  scrollToBottom();
}

function createStreamingMessage(id) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message bot-message streaming";
  messageDiv.setAttribute("data-stream-id", id);
  messageDiv.innerHTML = `
        <div class="message-timestamp">
            ${new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
        </div>
        <div class="message-content" data-stream-content="${id}"></div>
    `;
  chatBox.appendChild(messageDiv);
  scrollToBottom();
}

function updateStreamingMessage(id, content) {
  const contentDiv = document.querySelector(`[data-stream-content="${id}"]`);
  if (contentDiv) contentDiv.textContent = content;
}

function finalizeStreamingMessage(id, content) {
  const streamingDiv = document.querySelector(`[data-stream-id="${id}"]`);
  if (streamingDiv) {
    streamingDiv.classList.remove("streaming");
    streamingDiv.querySelector(".message-content").textContent = content;
    streamingDiv.removeAttribute("data-stream-id");
  }
}

function showTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  indicator.style.display = "flex";
  scrollToBottom();
}

function hideTypingIndicator() {
  document.getElementById("typing-indicator").style.display = "none";
}

function scrollToBottom() {
  setTimeout(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 50);
}
