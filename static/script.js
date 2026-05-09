/* ==================== Global Variables & Functions ==================== */
let currentUser = null;
let currentContact = null;
let allContacts = [];

/* Show/Hide Loading */
function showLoading(message = '加载中...') {
    document.getElementById('loadingText').textContent = message;
    document.getElementById('loadingModal').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingModal').style.display = 'none';
}

/* Show Alert */
function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').style.display = 'flex';
}

function closeAlert() {
    document.getElementById('alertModal').style.display = 'none';
}

/* ==================== Tab Switching ==================== */
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');

    // Add active class to clicked button
    event.target.closest('.tab-button').classList.add('active');

    // Generate QR code when switching to QR tab
    if (tabName === 'qrcode') {
        setTimeout(() => generateQRCode(), 100);
    }
}

/* ==================== QR Code Login ==================== */
function generateQRCode() {
    showLoading('生成二维码中...');

    fetch('/api/qrcode')
        .then(response => response.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            document.getElementById('qrcodeImage').src = url;
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('错误', '生成二维码失败');
            hideLoading();
        });
}

/* ==================== Manual Login ==================== */
function manualLogin(event) {
    event.preventDefault();

    const qqNumber = document.getElementById('qqNumber').value;
    const password = document.getElementById('password').value;

    if (!qqNumber || !password) {
        showAlert('错误', '请输入 QQ 号和密码');
        return;
    }

    showLoading('登录中...');

    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qq_number: qqNumber, password: password })
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                currentUser = data.user;
                showAlert('成功', '登录成功！');
                setTimeout(initializeApp, 1000);
            } else {
                showAlert('错误', data.error || '登录失败');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showAlert('错误', '登录失败，请检查网络连接');
        });
}

/* ==================== Demo Login ==================== */
function demoLogin() {
    showLoading('进入演示模式...');

    fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                currentUser = data.user;
                showAlert('成功', '已进入演示模式');
                setTimeout(initializeApp, 1000);
            } else {
                showAlert('错误', data.error || '进入演示模式失败');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showAlert('错误', '进入演示模式失败');
        });
}

/* ==================== Initialize App ==================== */
function initializeApp() {
    // Hide login section, show app section
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';

    // Update header with user info
    updateHeaderUser();

    // Load contacts
    loadContacts();

    // Update user info in sidebar
    updateUserInfo();
}

function updateHeaderUser() {
    const headerActions = document.getElementById('headerActions');
    if (currentUser && currentUser.is_logged_in) {
        headerActions.innerHTML = `
            <div class="user-badge">
                <span>👤 ${currentUser.nickname || currentUser.qq_number}</span>
            </div>
        `;
    }
}

function updateUserInfo() {
    const userInfoDisplay = document.getElementById('userInfoDisplay');
    if (currentUser) {
        userInfoDisplay.innerHTML = `
            <div class="user-info-item">
                <strong>QQ 号:</strong> ${currentUser.qq_number}
            </div>
            <div class="user-info-item">
                <strong>昵称:</strong> ${currentUser.nickname}
            </div>
            <div class="user-info-item">
                <strong>状态:</strong> <span style="color: #28a745;">在线</span>
            </div>
        `;
    }
}

/* ==================== Load Contacts ==================== */
function loadContacts() {
    showLoading('加载联系人...');

    fetch('/api/contacts')
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                allContacts = data.contacts;
                displayContacts(allContacts);
                populateExportContactsSelect();
            } else {
                showAlert('错误', data.error || '加载联系人失败');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showAlert('错误', '加载联系人失败');
        });
}

function displayContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    contactsList.innerHTML = '';

    if (contacts.length === 0) {
        contactsList.innerHTML = '<div class="empty-state">无联系人</div>';
        return;
    }

    contacts.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = 'contact-item';
        contactEl.onclick = () => selectContact(contact);
        contactEl.innerHTML = `
            <div class="contact-name">${contact.name}</div>
            <div class="contact-last-msg">${contact.last_msg}</div>
        `;
        contactsList.appendChild(contactEl);
    });
}

function selectContact(contact) {
    currentContact = contact;

    // Update active state
    document.querySelectorAll('.contact-item').forEach(el => {
        el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Load messages
    loadMessages(contact.id);

    // Update export contact select
    document.getElementById('exportContact').value = contact.name;
}

function filterContacts() {
    const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
    const filtered = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm) ||
        contact.last_msg.toLowerCase().includes(searchTerm)
    );
    displayContacts(filtered);
}

function refreshContacts() {
    loadContacts();
}

function populateExportContactsSelect() {
    const select = document.getElementById('exportContact');
    select.innerHTML = '<option value="">-- 请选择 --</option>';
    allContacts.forEach(contact => {
        const option = document.createElement('option');
        option.value = contact.name;
        option.textContent = contact.name;
        select.appendChild(option);
    });
}

/* ==================== Load Messages ==================== */
function loadMessages(contactId) {
    showLoading('加载消息...');

    fetch(`/api/messages/${contactId}`)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                displayMessages(data.messages);
            } else {
                showAlert('错误', data.error || '加载消息失败');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showAlert('错误', '加载消息失败');
        });
}

function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    // Update message count
    document.getElementById('messageCount').textContent = messages.length;

    if (messages.length === 0) {
        container.innerHTML = '<div class="empty-state">无消息</div>';
        return;
    }

    messages.forEach(msg => {
        const msgEl = document.createElement('div');
        const isFromCurrentUser = msg.sender === '我';
        msgEl.className = `message ${isFromCurrentUser ? 'self' : 'other'}`;
        msgEl.innerHTML = `
            ${!isFromCurrentUser ? `<div class="message-sender">${msg.sender}</div>` : ''}
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${msg.timestamp}</div>
        `;
        container.appendChild(msgEl);
    });

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ==================== Export Functionality ==================== */
function startExport() {
    const contact = document.getElementById('exportContact').value;
    const format = document.getElementById('exportFormat').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const keywords = document.getElementById('keywords').value
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
    const includeSystem = document.getElementById('includeSystem').checked;

    if (!contact) {
        showAlert('错误', '请选择联系人');
        return;
    }

    showLoading('导出中...');

    fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contact_name: contact,
            format: format,
            start_date: startDate,
            end_date: endDate,
            keywords: keywords,
            include_system_messages: includeSystem
        })
    })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                showAlert('成功', '导出成功！');
                loadExportHistory();
            } else {
                showAlert('错误', data.error || '导出失败');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Error:', error);
            showAlert('错误', '导出失败');
        });
}

function loadExportHistory() {
    fetch('/api/export-history')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayExportHistory(data.history);
            }
        })
        .catch(error => console.error('Error:', error));
}

function displayExportHistory(history) {
    const container = document.getElementById('exportHistoryContainer');
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 暂无导出记录</div>';
        return;
    }

    history.slice().reverse().forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'export-item';
        const date = new Date(item.timestamp).toLocaleString('zh-CN');
        itemEl.innerHTML = `
            <div class="export-item-info">
                <div class="export-filename">${item.filename}</div>
                <div class="export-meta">
                    📊 ${item.format.toUpperCase()} | 💾 ${formatFileSize(item.size)} | 🕐 ${date}
                </div>
            </div>
            <div class="export-actions">
                <button class="btn-small" onclick="downloadFile('${item.filename}')">⬇️ 下载</button>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

function downloadFile(filename) {
    window.location.href = `/api/download/${filename}`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function refreshHistory() {
    loadExportHistory();
}

/* ==================== Logout ==================== */
function logout() {
    if (confirm('确定要登出吗？')) {
        showLoading('登出中...');

        fetch('/api/logout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                hideLoading();
                if (data.success) {
                    currentUser = null;
                    currentContact = null;
                    allContacts = [];
                    document.getElementById('appSection').style.display = 'none';
                    document.getElementById('loginSection').style.display = 'block';
                    document.getElementById('qqNumber').value = '';
                    document.getElementById('password').value = '';
                }
            })
            .catch(error => {
                hideLoading();
                console.error('Error:', error);
            });
    }
}

/* ==================== Initialize on Page Load ==================== */
document.addEventListener('DOMContentLoaded', () => {
    // Load QR code on page load
    generateQRCode();

    // Add enter key support for login form
    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.querySelector('.login-form')?.dispatchEvent(new Event('submit'));
        }
    });

    // Close modals on outside click
    document.getElementById('alertModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeAlert();
    });
});

/* ==================== Utility Functions ==================== */
function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN');
}
