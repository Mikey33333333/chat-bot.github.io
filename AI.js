const promptForm = document.querySelector(".prompt-form");
const container = document.querySelector(".contianer");
const chatContainer = document.querySelector(".chats-container");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadwrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn")

const API_KEY = "AIzaSyClQ21QAhDA1-ZAi6ENXsu2GWEIzQHUL8E";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const userData = { message: "", file: {}};
const chatHistory = [];

const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const scrollToBottom = () => container.scrollTo({top: container.scrollHeight, behavior: "smooth"});

const typingEffect = (text, textElement, botMsgDiv) =>{
    textElement.textContent = "";
    const words = text.split("");
    let wordIndex = 0;

    typingInterval = setInterval(() =>{
        if(wordIndex < words.length){
            textElement.textContent += (wordIndex === 0 ? "": "") + words[wordIndex++];
            botMsgDiv.classList.remove("loading");
            
            scrollToBottom();
        }else{
            document.body.classList.remove("bot-responding");
            botMsgDiv.classList.remove("loading");
            clearInterval(typingInterval);
        }
    }, 40);
}

const generateResponse = async (botMsgDiv, userMessage) => {
    const textElement = botMsgDiv.querySelector('.message-text');
    controller = new AbortController();
    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({ role: "model", parts: [{ text: responseText }] });
    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
        document.body.classList.remove("bot-responding");
        botMsgDiv.classList.remove("bot-responding");
    } finally{
        userData.file = {};
    }
};


const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.message = userMessage; // Fix typo
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadwrapper.classList.remove("active", "img-attached", "file-attached")
    // Create user message
    const userMsgHTML = `
    <p class="message-text"></p>
        ${userData.file.data ? (userData.file.isImage ? `<img scr="data: ${userData.file.mime_type} base64, ${userData.file.data}" class="img-attachment"/>` : `<p class="file-attachment"><span class="material-symbols-rounded"> description </span> ${userData.file.fileName}</p>`) : ""}
    `;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;

    chatContainer.appendChild(userMsgDiv);
    scrollToBottom();

    // Simulate bot response
    setTimeout(() => {
        const botMsgHTML = `
            <img src="img/images-removebg-preview.png" alt="Bot Avatar" class="avatar">
            <p class="message-text">Just a sec...</p>
        `;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");

        chatContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv, userMessage); // Pass userMessage
    }, 600);
};


fileInput.addEventListener("change", () =>{
    const file = fileInput.files[0];
    if(!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) =>{
        fileInput.value = "";
        const base64Sting = e.target.result.split(",")[1];
        fileUploadwrapper.querySelector('.file-preview').src = e.target.result;
        fileUploadwrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
        userData.file = { fileName: file.name, data: base64Sting, mime_type: file.type, isImage};
    }

    
});

document.querySelectorAll(".suggestion-item").forEach(item =>{
    item.addEventListener("click", () =>{
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    })
})

document.querySelector("#cancel-file-btn").addEventListener("click", () =>{
    userData.file = {};
    fileUploadwrapper.classList.remove("active", "img-attached", "file-attached");
})

document.querySelector("#stop-response-btn").addEventListener("click", () =>{
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);

    // Ensure bot message exists before modifying
    const botMessage = chatContainer.querySelector(".bot-message.loading");
    if (botMessage) botMessage.classList.remove("loading");

    document.body.classList.remove("bot-responding"); // Corrected class removal
});


document.querySelector("#delete-chat-btn").addEventListener("click", () =>{
   chatHistory.length = 0;
   chatContainer.innerHTML = "";
   document.body.classList.remove("bot-responding", "chats-active");
})
 
themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");

    if (!wrapper) return; // Ensure wrapper exists before proceeding

    const shouldHide = target.classList.contains("prompt-input") || 
        (wrapper.classList.contains("hide-controls") && target.id === "add-file-btn");

    wrapper.classList.toggle("hide-controls", shouldHide);
});

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";


promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
