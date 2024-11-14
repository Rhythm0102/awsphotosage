let conversationHistory = [];
let uploadedImage = null;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreview = document.getElementById('imagePreview');
const imageUploadAcknowledgement = document.getElementById('imageUploadAcknowledgement');

dropZone.addEventListener('click', () => fileInput.click());

// Allow sending message with Enter key
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
}

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            
            // Check if image needs to be resized
            const MAX_PIXELS = 1700000; // 1.7 million pixels
            if (width * height > MAX_PIXELS) {
                const scale = Math.sqrt(MAX_PIXELS / (width * height));
                width *= scale;
                height *= scale;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            uploadedImage = canvas.toDataURL('image/jpeg', 0.85);
            imagePreview.src = uploadedImage;
            imagePreview.style.display = 'block';
            imageUploadAcknowledgement.style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (message || uploadedImage) {
        displayMessage('user', message, uploadedImage);
        userInput.value = '';

        const aiMessageElement = displayMessage('ai', '', null, true);

        axios.post('/chat', {
            message: message,
            image: uploadedImage ? uploadedImage.split(',')[1] : null,
            conversation_history: conversationHistory
        })
        .then(response => {
            const aiResponse = response.data.output;
            updateAIMessage(aiMessageElement, aiResponse);
            conversationHistory = response.data.conversation_history;

            // Reset image upload
            uploadedImage = null;
            imagePreview.style.display = 'none';
            imageUploadAcknowledgement.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            updateAIMessage(aiMessageElement, 'An error occurred while processing your request.');
        });
    }
}

function displayMessage(role, content, image = null, isWaiting = false) {
  const chatMessages = document.getElementById('chatMessages');
  const messageElement = document.createElement('div');
  messageElement.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;
  
  if (image) {
      const imgElement = document.createElement('img');
      imgElement.src = image;
      imgElement.className = 'chat-image';
      imgElement.alt = 'Uploaded image';
      imgElement.addEventListener('click', () => enlargeImage(image));
      messageElement.appendChild(imgElement);
  }
  
  if (content) {
      const textElement = document.createElement('p');
      textElement.innerText = content;
      messageElement.appendChild(textElement);
  }
  
  if (isWaiting) {
      const waitingElement = document.createElement('div');
      waitingElement.className = 'waiting-animation';
      waitingElement.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
      messageElement.appendChild(waitingElement);
  }
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageElement;
}

function enlargeImage(imageSrc) {
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  
  const enlargedImg = document.createElement('img');
  enlargedImg.src = imageSrc;
  enlargedImg.className = 'enlarged-image';
  
  modal.appendChild(enlargedImg);
  document.body.appendChild(modal);
  
  modal.addEventListener('click', () => {
      document.body.removeChild(modal);
  });
}

function playTTS(text) {
    axios.post('/tts', { text: text }, { responseType: 'blob' })
        .then(response => {
            const audioBlob = new Blob([response.data], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => URL.revokeObjectURL(audioUrl);
            audio.play().catch(e => {
                console.error('Error playing audio:', e);
                alert('An error occurred while playing the audio.');
            });
        })
        .catch(error => {
            console.error('Error fetching TTS audio:', error);
            alert('An error occurred while fetching the audio.');
        });
}

function updateAIMessage(messageElement, content) {
    // Remove waiting animation
    const waitingAnimation = messageElement.querySelector('.waiting-animation');
    if (waitingAnimation) {
        messageElement.removeChild(waitingAnimation);
    }

    // Add the AI's response
    const textElement = document.createElement('p');
    textElement.innerText = content;
    messageElement.appendChild(textElement);

    // Add TTS button
    const ttsButton = document.createElement('button');
    ttsButton.innerText = 'Listen';
    ttsButton.className = 'tts-button';
    ttsButton.onclick = () => playTTS(content);
    messageElement.appendChild(ttsButton);

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

//============================================================================================================================================

// Language selection functionality (placeholder)
const languageSelect = document.getElementById('language-select');
languageSelect.addEventListener('change', function(e) {
    console.log('Language changed to:', e.target.value);
    // Implement language change logic here
});

//============================================================================================================================================

// Particle animation functionality
let particles = [];
let lastScrollTop = 0;
let scrollVelocity = 0;

function createParticle(options = {}) {
    const defaults = {
      minSize: 1,
      maxSize: 50,
      minSpeed: 0.1,
      maxSpeed: 0.3,
      minOpacity: 0.2,
      maxOpacity: 0.6,
      color: "rgba(76, 175, 80, 0.6)",
      blurAmount: 1.5,
      gravitational: true,
    };
  
    const settings = { ...defaults, ...options };
  
    const particle = document.createElement("div");
    particle.className = "particle";
    const size =
      Math.random() * (settings.maxSize - settings.minSize) +
      settings.minSize;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
  
    let posX = Math.random() * window.innerWidth;
    let posY = Math.random() * window.innerHeight;
    particle.style.left = `${posX}px`;
    particle.style.top = `${posY}px`;
  
    const opacity =
      Math.random() * (settings.maxOpacity - settings.minOpacity) +
      settings.minOpacity;
    particle.style.backgroundColor = settings.color;
    particle.style.opacity = opacity;
  
    if (settings.blurAmount > 0) {
      particle.style.filter = `blur(${settings.blurAmount}px)`;
    }
  
    document.getElementById('navbar').appendChild(particle); 
  
    let speed = {
      x:
        (Math.random() - 0.5) * (settings.maxSpeed - settings.minSpeed) +
        settings.minSpeed,
      y:
        (Math.random() - 0.5) * (settings.maxSpeed - settings.minSpeed) +
        settings.minSpeed,
    };
  
    let wind = {
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
    };
  
    let gravity = Math.random() * 0.2;
  
    function updatePosition() {
      speed.y += gravity;
      speed.x += wind.x;
      speed.y += wind.y;
  
      speed.y += scrollVelocity * 0.1;
  
      if (speed.x > settings.maxSpeed) speed.x = settings.maxSpeed;
      if (speed.x < -settings.maxSpeed) speed.x = -settings.maxSpeed;
      if (speed.y > settings.maxSpeed) speed.y = settings.maxSpeed;
      if (speed.y < -settings.maxSpeed) speed.y = -settings.maxSpeed;
  
      posX += speed.x;
      posY += speed.y;
  
      if (posX < 0) posX = window.innerWidth;
      if (posX > window.innerWidth) posX = 0;
      if (posY < 0) posY = window.innerHeight;
      if (posY > window.innerHeight) posY = 0;
  
      particle.style.left = `${posX}px`;
      particle.style.top = `${posY}px`;
  
      requestAnimationFrame(updatePosition);
    }
  
    function changeWindAndGravity() {
      wind = {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
      };
      gravity = Math.random() * 0.2;
    }
  
    updatePosition();
    setInterval(changeWindAndGravity, 2000);
  
    particle.addEventListener("mouseenter", () => {
      particle.style.transform = "scale(1.5)";
      particle.style.transition = "transform 0.3s ease-in-out";
    });
  
    particle.addEventListener("mouseleave", () => {
      particle.style.transform = "scale(1)";
    });
  
    return {
      element: particle,
      posX: posX,
      posY: posY,
      speed: speed,
    };
  }

  function animateBackground() {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
  
    document.addEventListener("mousemove", (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
  
      particles.forEach((particle) => {
        const rect = particle.element.getBoundingClientRect();
        const particleX = rect.left + rect.width / 2;
        const particleY = rect.top + rect.height / 2;
  
        const dx = mouseX - particleX;
        const dy = mouseY - particleY;
        const distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < 100) {
          const angle = Math.atan2(dy, dx);
          const force = (100 - distance) / 10;
          particle.element.style.transform = `translate(${Math.cos(angle) * force
            }px, ${Math.sin(angle) * force}px)`;
        } else {
          particle.element.style.transform = "translate(0, 0)";
        }
      });
    });
  
    window.addEventListener("scroll", () => {
      const st = window.pageYOffset || document.documentElement.scrollTop;
      if (st > lastScrollTop) {
        // downscroll code
        scrollVelocity = st - lastScrollTop;
      } else {
        // upscroll code
        scrollVelocity = st - lastScrollTop;
      }
      lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    });
  }
  
  window.addEventListener('load', animateBackground);