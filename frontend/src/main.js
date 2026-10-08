/**
 * Quote Studio - Main Application Logic
 * Integrates live preview, avatar processing, Hugging Face Space API calls, and code exports.
 */

// API Configuration
const API_BASE_URL = 'https://ilhamdev-quote-api.hf.space';
const PROXY_URL = '/api/generate';
const STATUS_URL = '/api/status';

// DOM Elements
const form = document.getElementById('quoteForm');
const senderNameInput = document.getElementById('senderName');
const senderTitleInput = document.getElementById('senderTitle');
const avatarUrlInput = document.getElementById('avatarUrl');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const messageTextInput = document.getElementById('messageText');
const replyToggle = document.getElementById('replyToggle');
const replyFields = document.getElementById('replyFields');
const replyNameInput = document.getElementById('replyName');
const replyTextInput = document.getElementById('replyText');
const mediaToggle = document.getElementById('mediaToggle');
const mediaFields = document.getElementById('mediaFields');
const mediaUrlInput = document.getElementById('mediaUrl');
const quoteTypeSelect = document.getElementById('quoteType');
const imageFormatSelect = document.getElementById('imageFormat');
const bgColorInput = document.getElementById('bgColor');
const bgColorTextInput = document.getElementById('bgColorText');
const watermarkInput = document.getElementById('watermark');
const watermarkGroup = document.getElementById('watermarkGroup');

// Preview Elements
const prevAvatar = document.getElementById('prevAvatar');
const prevSenderName = document.getElementById('prevSenderName');
const prevSenderTitle = document.getElementById('prevSenderTitle');
const prevReplyBox = document.getElementById('prevReplyBox');
const prevReplyName = document.getElementById('prevReplyName');
const prevReplyText = document.getElementById('prevReplyText');
const prevMediaBox = document.getElementById('prevMediaBox');
const prevMediaImg = document.getElementById('prevMediaImg');
const prevMessageText = document.getElementById('prevMessageText');
const prevTimestamp = document.getElementById('prevTimestamp');
const simulatedBubble = document.getElementById('simulatedBubble');
const previewModeTag = document.getElementById('previewModeTag');
const previewStage = document.getElementById('previewStage');

// Action & Result Elements
const generateBtn = document.getElementById('generateBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const generatedResultBox = document.getElementById('generatedResultBox');
const renderedImage = document.getElementById('renderedImage');
const resultMeta = document.getElementById('resultMeta');
const downloadBtn = document.getElementById('downloadBtn');
const copyImageBtn = document.getElementById('copyImageBtn');
const apiStatusBadge = document.getElementById('apiStatusBadge');
const apiStatusText = document.getElementById('apiStatusText');
const toastEl = document.getElementById('toast');

// Code Playground Elements
const codeSnippet = document.getElementById('codeSnippet');
const copySnippetBtn = document.getElementById('copySnippetBtn');
const tabButtons = document.querySelectorAll('.tab-btn');

let currentTab = 'curl';
let currentGeneratedBlob = null;

// Initialize Timestamp
function updateTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  if (prevTimestamp) prevTimestamp.textContent = `${hours}:${minutes}`;
}

// Show Toast Notification
function showToast(message, type = 'info', duration = 3500) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  setTimeout(() => {
    toastEl.className = 'toast hidden';
  }, duration);
}

// Check Hugging Face API Status
async function checkApiStatus() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    
    // Try direct HF Space first (CORS enabled), then proxy
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/status`, { signal: controller.signal });
    } catch {
      // direct failed, attempt proxy
    }

    if (!res || !res.ok) {
      try {
        res = await fetch(STATUS_URL, { signal: controller.signal });
      } catch {
        // proxy failed as well
      }
    }
    clearTimeout(timeout);

    if (res && res.ok) {
      const data = await res.json();
      apiStatusBadge.className = 'status-badge online';
      apiStatusText.textContent = 'API Space Online';
    } else {
      throw new Error('Non-200 status');
    }
  } catch (err) {
    apiStatusBadge.className = 'status-badge checking';
    apiStatusText.textContent = 'HF Space Sleeping / Ready';
  }
}

// Synchronize Live Preview with Form
function updateLivePreview() {
  const name = senderNameInput.value.trim() || 'Anonymous';
  const title = senderTitleInput.value.trim();
  const avatar = avatarUrlInput.value.trim();
  const text = messageTextInput.value.trim() || '...';
  const isReply = replyToggle.checked;
  const replyName = replyNameInput.value.trim() || 'Someone';
  const replyText = replyTextInput.value.trim() || '';
  const isMedia = mediaToggle.checked;
  const mediaUrl = mediaUrlInput.value.trim();
  const type = quoteTypeSelect.value;
  const bgColor = bgColorInput.value;

  // Sender Name & Tag
  prevSenderName.textContent = name;
  if (title) {
    prevSenderTitle.textContent = title;
    prevSenderTitle.style.display = 'inline-block';
  } else {
    prevSenderTitle.style.display = 'none';
  }

  // Avatar
  if (avatar) {
    prevAvatar.src = avatar;
  }

  // Bubble Background
  simulatedBubble.querySelector('.tg-bubble-col').style.backgroundColor = bgColor;

  // Quoted Reply Box
  if (isReply) {
    prevReplyBox.classList.remove('hidden');
    prevReplyName.textContent = replyName;
    prevReplyText.textContent = replyText;
    replyFields.classList.remove('hidden');
  } else {
    prevReplyBox.classList.add('hidden');
    replyFields.classList.add('hidden');
  }

  // Media Box
  if (isMedia && mediaUrl) {
    prevMediaBox.classList.remove('hidden');
    prevMediaImg.src = mediaUrl;
    mediaFields.classList.remove('hidden');
  } else {
    prevMediaBox.classList.add('hidden');
    if (!isMedia) mediaFields.classList.add('hidden');
  }

  // Text
  prevMessageText.textContent = text;

  // Mode Tag & Watermark visibility
  if (type === 'stories') {
    previewModeTag.textContent = 'Stories Mode (9:16)';
    watermarkGroup.style.display = 'flex';
    previewStage.style.minHeight = '320px';
  } else if (type === 'image') {
    previewModeTag.textContent = 'Image Mode';
    watermarkGroup.style.display = 'flex';
    previewStage.style.minHeight = '240px';
  } else {
    previewModeTag.textContent = 'Quote Mode';
    watermarkGroup.style.display = 'none';
    previewStage.style.minHeight = '200px';
  }

  // Update Code Snippets
  updateCodeSnippets();
}

// Build JSON Payload for API
function buildApiPayload() {
  const type = quoteTypeSelect.value;
  const format = imageFormatSelect.value;
  const bgColor = bgColorInput.value;
  const watermark = watermarkInput.value.trim();

  const isReply = replyToggle.checked;
  const isMedia = mediaToggle.checked;
  const mediaUrl = mediaUrlInput.value.trim();

  const messageObj = {
    entities: 'auto',
    avatar: true,
    from: {
      id: 1,
      name: senderNameInput.value.trim() || 'Mang Rusdi',
      title: senderTitleInput.value.trim() || undefined,
      photo: {
        url: avatarUrlInput.value.trim() || undefined,
      },
    },
    text: messageTextInput.value.trim() || 'Hello world',
  };

  if (isReply) {
    messageObj.replyMessage = {
      name: replyNameInput.value.trim() || 'Someone',
      text: replyTextInput.value.trim() || 'Quoted text',
      entities: 'auto',
    };
  }

  if (isMedia && mediaUrl) {
    messageObj.media = {
      url: mediaUrl,
    };
  }

  const payload = {
    type: type === 'quote' ? '' : type,
    format: format,
    backgroundColor: bgColor,
    width: 512,
    height: type === 'stories' ? 1280 : 720,
    scale: type === 'stories' ? 4 : 2,
    messages: [messageObj],
  };

  if (watermark && (type === 'stories' || type === 'image')) {
    payload.watermark = watermark;
  }

  return payload;
}

// Update Developer Code Snippets
function updateCodeSnippets() {
  const payload = buildApiPayload();
  const jsonString = JSON.stringify(payload, null, 2);

  if (currentTab === 'curl') {
    codeSnippet.textContent = `curl -X POST "${API_BASE_URL}/" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;
  } else if (currentTab === 'js') {
    codeSnippet.textContent = `const response = await fetch('${API_BASE_URL}/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${jsonString})
});

const data = await response.json();
const imageBase64 = data.image; // data:image/png;base64,...`;
  } else if (currentTab === 'py') {
    codeSnippet.textContent = `import requests

url = "${API_BASE_URL}/"
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, json=payload)
data = response.json()
image_base64 = data["image"]`;
  }
}

// Generate Quote via Backend API
async function generateQuote() {
  const text = messageTextInput.value.trim();
  const name = senderNameInput.value.trim();

  if (!text) {
    showToast('Pesan chat tidak boleh kosong!', 'error');
    messageTextInput.focus();
    return;
  }

  if (!name) {
    showToast('Nama pengirim tidak boleh kosong!', 'error');
    senderNameInput.focus();
    return;
  }

  // Set Loading State
  generateBtn.disabled = true;
  const originalContent = generateBtn.innerHTML;
  generateBtn.innerHTML = `
    <span class="btn-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
    </span>
    <span>Generating via Hugging Face Space...</span>
  `;

  const payload = buildApiPayload();

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), 30000);

  try {
    let response;
    // Attempt request to direct HF endpoint first (with CORS), fallback to proxy
    try {
      response = await fetch(`${API_BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (directErr) {
      if (directErr.name === 'AbortError') {
        throw new Error('Request timeout setelah 30 detik');
      }
      response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutTimer);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.image) {
      throw new Error(data?.message || 'API did not return image data');
    }

    // Process Base64 Image
    const format = imageFormatSelect.value || 'png';
    const base64Data = data.image.startsWith('data:')
      ? data.image
      : `data:image/${format};base64,${data.image}`;

    renderedImage.src = base64Data;
    resultMeta.textContent = `${format.toUpperCase()} • ${data.width || 512}x${data.height || 'auto'}`;
    downloadBtn.href = base64Data;
    downloadBtn.download = `quote-${Date.now()}.${format}`;

    // Convert to Blob for Clipboard
    try {
      const fetchBlob = await fetch(base64Data);
      currentGeneratedBlob = await fetchBlob.blob();
    } catch (e) {
      console.warn('Could not cache blob for clipboard', e);
    }

    generatedResultBox.classList.remove('hidden');
    generatedResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('Quote berhasil digenerate!', 'success');
  } catch (err) {
    console.error('Generate Error:', err);
    showToast(`Gagal: ${err.message}. Backend HF mungkin sedang cold-start (tunggu ~15 detik).`, 'error', 6000);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalContent;
  }
}

// Copy Image to Clipboard
async function copyImageToClipboard() {
  if (!currentGeneratedBlob) {
    showToast('Gambar belum tersedia untuk disalin', 'error');
    return;
  }

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      // Browsers often require PNG for image clipboard items
      const item = new ClipboardItem({ [currentGeneratedBlob.type]: currentGeneratedBlob });
      await navigator.clipboard.write([item]);
      showToast('Gambar berhasil disalin ke clipboard!', 'success');
    } else {
      throw new Error('ClipboardItem API not supported');
    }
  } catch (err) {
    console.warn('Clipboard write failed, trying fallback', err);
    showToast('Gunakan klik kanan "Copy Image" atau tombol Download Image', 'info');
  }
}

// Copy Code Snippet
function copyCodeSnippet() {
  const code = codeSnippet.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Kode snippet disalin!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin snippet', 'error');
  });
}

// Setup Event Listeners
function setupEvents() {
  // Real-time input updates
  const inputs = [
    senderNameInput,
    senderTitleInput,
    avatarUrlInput,
    messageTextInput,
    replyNameInput,
    replyTextInput,
    mediaUrlInput,
    watermarkInput,
  ];
  inputs.forEach(input => input.addEventListener('input', updateLivePreview));

  // Selects & Toggles
  replyToggle.addEventListener('change', updateLivePreview);
  mediaToggle.addEventListener('change', updateLivePreview);
  quoteTypeSelect.addEventListener('change', updateLivePreview);
  imageFormatSelect.addEventListener('change', updateLivePreview);

  // Background Color Sync
  bgColorInput.addEventListener('input', () => {
    bgColorTextInput.value = bgColorInput.value;
    updateLivePreview();
  });

  bgColorTextInput.addEventListener('input', () => {
    const val = bgColorTextInput.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      bgColorInput.value = val;
      updateLivePreview();
    }
  });

  // Preset Avatars
  document.querySelectorAll('.preset-avatar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        avatarUrlInput.value = url;
        updateLivePreview();
      }
    });
  });

  // Preset Colors
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      if (color) {
        bgColorInput.value = color;
        bgColorTextInput.value = color;
        updateLivePreview();
      }
    });
  });

  // Avatar Upload Local File
  avatarUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar yang valid', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      avatarUrlInput.value = base64Data;
      updateLivePreview();
      showToast('Avatar lokal berhasil dimuat!', 'success');
    };
    reader.readAsDataURL(file);
  });

  // Form Reset
  resetFormBtn.addEventListener('click', () => {
    senderNameInput.value = 'Mang Rusdi';
    senderTitleInput.value = 'Owner';
    avatarUrlInput.value = 'https://avatars.githubusercontent.com/u/108991206?v=4';
    messageTextInput.value = 'Halo semuanya! Quote API Telegram sekarang sudah live dan siap digunakan 🚀';
    replyToggle.checked = true;
    replyNameInput.value = 'Dika Ardnt';
    replyTextInput.value = 'Kapan Quote API selesai dideploy?';
    mediaToggle.checked = false;
    mediaUrlInput.value = '';
    quoteTypeSelect.value = 'quote';
    imageFormatSelect.value = 'png';
    bgColorInput.value = '#1b1e23';
    bgColorTextInput.value = '#1b1e23';
    watermarkInput.value = 'qc.mangrusdi.my.id';
    generatedResultBox.classList.add('hidden');
    updateLivePreview();
    showToast('Form direset ke default', 'info');
  });

  // Generate Button
  generateBtn.addEventListener('click', generateQuote);

  // Copy Image Button
  copyImageBtn.addEventListener('click', copyImageToClipboard);

  // Copy Snippet Button
  copySnippetBtn.addEventListener('click', copyCodeSnippet);

  // Playground Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      updateCodeSnippets();
    });
  });
}

// App Initialization
function init() {
  updateTimestamp();
  updateLivePreview();
  setupEvents();
  checkApiStatus();
}

// Run on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
