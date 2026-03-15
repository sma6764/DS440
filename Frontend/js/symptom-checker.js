// Specialist metadata for result card display
const specialistDatabase = {
  neurologist: {
    icon: '🧠',
    name: 'Neurologist',
    reason: 'Based on your symptoms related to the nervous system and head, a neurologist can provide specialized care.'
  },
  cardiologist: {
    icon: '❤️',
    name: 'Cardiologist',
    reason: 'Your symptoms suggest a cardiovascular concern. A cardiologist specializes in heart and circulatory system health.'
  },
  dermatologist: {
    icon: '🔬',
    name: 'Dermatologist',
    reason: 'Your skin-related symptoms indicate that a dermatologist would be the best specialist to consult.'
  },
  pediatrician: {
    icon: '👶',
    name: 'Pediatrician',
    reason: 'For children\'s health concerns, a pediatrician is specially trained to provide appropriate care.'
  },
  orthopedic: {
    icon: '🦴',
    name: 'Orthopedic',
    reason: 'Your musculoskeletal symptoms are best addressed by an orthopedic specialist.'
  },
  general: {
    icon: '👨‍⚕️',
    name: 'General Practitioner',
    reason: 'A general practitioner can evaluate your symptoms and provide comprehensive care or refer you to a specialist if needed.'
  }
};

// Map Gemini's returned specialist name → specialistDatabase entry
const specialistMap = {
  'neurologist':          specialistDatabase.neurologist,
  'cardiologist':         specialistDatabase.cardiologist,
  'dermatologist':        specialistDatabase.dermatologist,
  'pediatrician':         specialistDatabase.pediatrician,
  'orthopedic':           specialistDatabase.orthopedic,
  'general practitioner': specialistDatabase.general
};

const API_BASE = '../../Backend/api';
const CLIENT_VERSION = '20260315-3';

// Get DOM elements
const chatWindow   = document.getElementById('chat-window');
const symptomInput = document.getElementById('symptom-input');
const sendBtn      = document.getElementById('send-btn');
const resultCard   = document.getElementById('result-card');

const MAX_CHARS = 300;
let currentRecommendation  = null;
let conversationHistory    = []; // { role: 'user'|'assistant', content: string }[]
let isWaitingForResponse   = false;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  symptomInput.focus();
  createCharacterCounter();

  sendBtn.addEventListener('click', handleSendMessage);

  symptomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  symptomInput.addEventListener('input', updateCharacterCounter);
});

// Create character counter element
function createCharacterCounter() {
  const counter = document.createElement('div');
  counter.id = 'char-counter';
  counter.style.textAlign = 'right';
  counter.style.fontSize = '0.875rem';
  counter.style.color = 'var(--color-text-muted)';
  counter.style.marginTop = '0.5rem';
  counter.textContent = `0 / ${MAX_CHARS}`;
  
  // Insert after the input field
  symptomInput.parentElement.appendChild(counter);
}

// Update character counter
function updateCharacterCounter() {
  const counter = document.getElementById('char-counter');
  const currentLength = symptomInput.value.length;
  
  counter.textContent = `${currentLength} / ${MAX_CHARS}`;
  
  // Change color when approaching limit
  if (currentLength > MAX_CHARS * 0.9) {
    counter.style.color = '#EF4444';
  } else if (currentLength > MAX_CHARS * 0.7) {
    counter.style.color = '#F59E0B';
  } else {
    counter.style.color = 'var(--color-text-muted)';
  }
  
  // Enforce max length
  if (currentLength > MAX_CHARS) {
    symptomInput.value = symptomInput.value.substring(0, MAX_CHARS);
    counter.textContent = `${MAX_CHARS} / ${MAX_CHARS}`;
  }
}

// Handle sending a message
async function handleSendMessage() {
  const message = symptomInput.value.trim();
  if (message === '' || isWaitingForResponse) return;

  // Lock UI while waiting
  isWaitingForResponse = true;
  sendBtn.disabled = true;
  symptomInput.disabled = true;

  displayUserMessage(message);
  symptomInput.value = '';
  updateCharacterCounter();

  // Append to conversation history before sending
  conversationHistory.push({ role: 'user', content: message });

  showTypingIndicator();

  try {
    const response = await fetch(`${API_BASE}/symptom-checker.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    });

    const rawResponse = await response.text();
    let data = null;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Symptom checker returned non-JSON response:', rawResponse);
      throw new Error('The server returned an invalid response format.');
    }

    removeTypingIndicator();

    if (!data.success) {
      if (data.rate_limited) {
        const waitSeconds = Number.isFinite(data.retry_after_seconds)
          ? Math.max(1, Math.round(data.retry_after_seconds))
          : 60;
        displayAIMessage(`I am getting a temporary rate-limit from Gemini. Please wait about ${waitSeconds} seconds, then try again.`);
      } else {
        const upstream = data.upstream_status ? ` (upstream ${data.upstream_status})` : '';
        displayAIMessage((data.error || 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.') + upstream);
      }
    } else {
      // Store assistant reply in history so follow-up turns have context
      conversationHistory.push({ role: 'assistant', content: data.reply });

      displayAIMessage(data.reply);

      if (data.specialist) {
        const specialist = resolveSpecialist(data.specialist);
        showResultCard(specialist);
      }
    }
  } catch (err) {
    removeTypingIndicator();
    console.error('Symptom checker request failed:', err);
    displayAIMessage((err?.message || 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.') + ` [client ${CLIENT_VERSION}]`);
  }

  // Unlock UI
  isWaitingForResponse = false;
  sendBtn.disabled = false;
  symptomInput.disabled = false;
  symptomInput.focus();
}

// Resolve a specialist name returned by Gemini to a specialistDatabase entry
function resolveSpecialist(name) {
  const key = name.toLowerCase().trim();
  return specialistMap[key] || specialistDatabase.general;
}

// Display user message bubble
function displayUserMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message fade-in';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  bubbleDiv.textContent = message;
  
  messageDiv.appendChild(bubbleDiv);
  chatWindow.appendChild(messageDiv);
  
  scrollToBottom();
}

// Display AI message bubble
function displayAIMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message fade-in';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'message-icon';
  iconDiv.textContent = '🤖';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  bubbleDiv.textContent = message;
  
  messageDiv.appendChild(iconDiv);
  messageDiv.appendChild(bubbleDiv);
  chatWindow.appendChild(messageDiv);
  
  scrollToBottom();
}

// Show animated typing indicator
function showTypingIndicator() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ai-message';
  messageDiv.id = 'typing-indicator';
  
  const iconDiv = document.createElement('div');
  iconDiv.className = 'message-icon';
  iconDiv.textContent = '🤖';
  
  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';
  
  bubbleDiv.appendChild(typingDiv);
  messageDiv.appendChild(iconDiv);
  messageDiv.appendChild(bubbleDiv);
  chatWindow.appendChild(messageDiv);
  
  scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.classList.add('fade-out');
    setTimeout(() => indicator.remove(), 400);
  }
}

// Show and populate result card (update if already shown)
function showResultCard(specialist) {
  // Check if result card already exists and is visible
  const isUpdate = resultCard.style.display === 'block';
  
  // Populate the card with specialist info
  document.getElementById('result-icon').textContent = specialist.icon;
  document.getElementById('result-specialist').textContent = specialist.name;
  document.getElementById('result-reason').textContent = specialist.reason;
  
  // Update the book button link with specialist parameter
  const bookBtn = resultCard.querySelector('.book-btn');
  bookBtn.href = `booking.html?specialist=${encodeURIComponent(specialist.name)}`;
  
  if (isUpdate) {
    // Add pulse animation to show it updated
    resultCard.classList.add('fade-in');
    setTimeout(() => resultCard.classList.remove('fade-in'), 500);
  } else {
    // Show the result card for the first time
    resultCard.style.display = 'block';
    resultCard.classList.add('fade-in');
  }
  
  // Smooth scroll to result card
  setTimeout(() => {
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 300);
}

// Auto-scroll chat window to bottom
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

