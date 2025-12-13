const socket = io();

let myName = localStorage.getItem("chatName");

const nameModal = document.getElementById("nameModal");
const modalNameInput = document.getElementById("modalNameInput");
const modalSaveBtn = document.getElementById("modalSaveBtn");

if (myName && myName.trim() !== "") {
  socket.emit("setName", myName);
  document.getElementById("name").value = myName;
} else {
  openNameModal();
}

function openNameModal(initialName = "") {
  nameModal.style.display = "flex";
  modalNameInput.value = initialName;
  modalNameInput.focus();
}

function closeNameModal(name) {
  nameModal.style.display = "none";
  myName = name || "Anonymous";
  localStorage.setItem("chatName", myName);
  socket.emit("setName", myName);
  document.getElementById("name").value = myName;
}

// Save button click
modalSaveBtn.addEventListener("click", () => {
  const name = modalNameInput.value.trim();
  if (name) closeNameModal(name);
});

// Enter key in input
modalNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const name = modalNameInput.value.trim();
    if (name) closeNameModal(name);
  }
});


document.getElementById("changeNameBtn").addEventListener("click", () => {
  openNameModal();
});

// DOM Elements
const userListEl = document.getElementById("userList");
const messagesEl = document.getElementById("messages");
const nameEl = document.getElementById("name");
const textEl = document.getElementById("text");
const sendBtn = document.getElementById("send");
const fileBtn = document.getElementById("fileBtn");
const fileInput = document.getElementById("fileInput");
const chatAreaEl = document.getElementById("chat-area");
const welcomeScreenEl = document.getElementById("welcome-screen");
const chatContentEl = chatAreaEl.querySelector(".chat-content");
const chatHeaderEl = document.getElementById("chat-header");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const chatInput = document.getElementById("text");

emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

// Insert emoji on click
emojiPicker.addEventListener("emoji-click", event => {
  chatInput.value += event.detail.unicode;
  chatInput.focus();
  emojiPicker.style.display = "none"; // auto close
});

// State
let selectedUser = null;
const chatCache = {};
const unreadCount = {};
const typingUsers = {};
const messagesMap = {};


// Append a message to UI
function appendMessage(msg) {
  const messageContainer = document.createElement("div");
  messageContainer.classList.add(
    "message",
    msg.from === socket.id ? "self" : "other"
  );
  messageContainer.dataset.msgId = msg.id;
  messagesMap[msg.id] = msg;

  if (msg.file) {
    // File message
    const fileLink = document.createElement("a");
    fileLink.href = msg.file.url;
    fileLink.download = msg.file.name; // force download
    fileLink.textContent = `📄 ${msg.fromName}: ${msg.file.name}`;
    fileLink.target = "_blank";
    messageContainer.appendChild(fileLink);
  }
  else {
    // Text message
    const textDiv = document.createElement("div");
    textDiv.classList.add("message-text");
    textDiv.textContent = msg.text;
    messageContainer.appendChild(textDiv);
  }

  const timeDiv = document.createElement("div");
  timeDiv.classList.add("timestamp");
  timeDiv.textContent = new Date(msg.ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }).replace(":", ".");

  messageContainer.appendChild(timeDiv);

  messagesEl.appendChild(messageContainer);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.style.display = "none";
    }, 300);
  }, 3000);
}

// Send text message
function sendMessage() {
  if (!selectedUser) {
    showToast("Please select a user to chat with!");
    return;
  }
  const text = textEl.value.trim();
  if (!text) return;

  const msg = {
    from: socket.id,
    fromName: myName,
    text,
    ts: Date.now(),
    to: selectedUser,
  };

  appendMessage(msg);
  if (!chatCache[selectedUser]) chatCache[selectedUser] = [];
  chatCache[selectedUser].push(msg);

  socket.emit("private.message", { to: selectedUser, text });
  textEl.value = "";
  unreadCount[selectedUser] = 0;
  renderUserList();
}

sendBtn.onclick = sendMessage;

textEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  } else {
    if (selectedUser) {
      socket.emit("typing", selectedUser);
    }
  }
});

// Handle file upload
fileBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
  if (!selectedUser) {
    showToast("Select a user first!");
    return;
  }
  const file = fileInput.files[0];
  if (!file) return;

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showToast("File size exceeds 10MB limit.");
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    const msg = {
      from: socket.id,
      fromName: myName,
      file: { name: data.name, url: data.url },
      ts: Date.now(),
      to: selectedUser,
    };
    appendMessage(msg);
    if (!chatCache[selectedUser]) chatCache[selectedUser] = [];
    chatCache[selectedUser].push(msg);

    socket.emit("private.file", { to: selectedUser, file: msg.file });
   } catch (error) {
     console.error('File upload failed:', error);
     showToast('File upload failed. Please try again.');
   }
};

// Render user list
function renderUserList(users = null) {
  const currentUsers =
    users ||
    Object.fromEntries(
      Array.from(userListEl.children).map((li) => {
        const id = li.dataset.id;
        const name = li
          .querySelector(".nameSpan")
          .textContent.replace(/\s*\(You\)$/, "");
        return [id, name];
      })
    );

  userListEl.innerHTML = "";

  Object.entries(currentUsers).forEach(([id, name]) => {
    if (id === socket.id) return;

    const li = document.createElement("li");
    li.dataset.id = id;
    if (id === selectedUser) li.classList.add("selected");

    const avatar = document.createElement("div");
    avatar.className = "avatar-placeholder";
    avatar.textContent = name.charAt(0).toUpperCase();
    li.appendChild(avatar);

    const chatInfo = document.createElement("div");
    chatInfo.className = "chat-info";

    const nameSpan = document.createElement("span");
    nameSpan.className = "nameSpan";
    nameSpan.textContent = name;
    chatInfo.appendChild(nameSpan);

    const typingSpan = document.createElement("span");
    typingSpan.className = "typingIndicator";
    typingSpan.textContent = typingUsers[id] ? "typing..." : "";
    chatInfo.appendChild(typingSpan);

    li.appendChild(chatInfo);

    if (unreadCount[id] > 0 && id !== selectedUser) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = unreadCount[id];
      li.appendChild(badge);
    }

    li.onclick = () => {
      selectedUser = id;
      unreadCount[id] = 0;

      welcomeScreenEl.style.display = "none";
      chatContentEl.style.display = "flex";

      chatHeaderEl.innerHTML = `
        <div class="avatar-placeholder">${name.charAt(0).toUpperCase()}</div>
        <span class="nameSpan">${name}</span>
      `;

       messagesEl.innerHTML = "";
       if (chatCache[selectedUser]) {
         chatCache[selectedUser].forEach(appendMessage);
       } else {
         socket.emit("getHistory", selectedUser);
       }
       renderUserList();
    };

    userListEl.appendChild(li);
  });
}

// Socket events
socket.on("userList", (users) => renderUserList(users));

socket.on("private.message", (msg) => {
  if (msg.from === socket.id) return;
  messagesMap[msg.id] = msg;
  const otherId = msg.from;
  if (!chatCache[otherId]) chatCache[otherId] = [];
  chatCache[otherId].push(msg);

  if (selectedUser === otherId) {
    appendMessage(msg);
  } else {
    unreadCount[otherId] = (unreadCount[otherId] || 0) + 1;
    renderUserList();
  }
});

socket.on("private.file", (msg) => {
  if (msg.from === socket.id) return;
  messagesMap[msg.id] = msg;
  const otherId = msg.from;
  if (!chatCache[otherId]) chatCache[otherId] = [];
  chatCache[otherId].push(msg);

  if (selectedUser === otherId) {
    appendMessage(msg);
  } else {
    unreadCount[otherId] = (unreadCount[otherId] || 0) + 1;
    renderUserList();
  }
});

socket.on("chatHistory", ({ with: userId, messages }) => {
  chatCache[userId] = messages;
  messages.forEach(m => messagesMap[m.id] = m);
  if (selectedUser === userId) {
    messagesEl.innerHTML = "";
    messages.forEach(appendMessage);
  }
});

socket.on("typing", (userId) => {
  if (typingUsers[userId]) return;
  typingUsers[userId] = true;
  renderUserList();
  setTimeout(() => {
    typingUsers[userId] = false;
    renderUserList();
  }, 1500);
});

socket.on("connect", () => {
  if (myName) socket.emit("setName", myName);
});

socket.on("disconnect", () => {
});






