// ============================================================
//  gw-check.js — Логика полноэкранной проверки розыгрышей
// ============================================================

let gwCheckState = {
    giveawayId: null,
    attempts: 5,
    targetName: '',
    emojis: []
};

// 1. Инициализация проверки (перехватывает start_param)
window.checkGiveawayInvite = async function() {
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('gw_')) {
        gwCheckState.giveawayId = startParam.replace('gw_', '');
        gwCheckState.attempts = 5; // Сбрасываем попытки
        
        openGwCheckModal();
        renderGwCheckLoading();

        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        const usernameParam = tgUser?.username ? `?username=${encodeURIComponent(tgUser.username)}` : '';

        const capRes = await apiCall(`/webapp/giveaways/${gwCheckState.giveawayId}/captcha${usernameParam}`);
        if (capRes && capRes.Success) {
            gwCheckState.targetName = capRes.TargetName;
            gwCheckState.emojis = capRes.Emojis;
            renderGwCheckCaptcha();
        } else {
            renderGwCheckFatalError(capRes?.Error || "Ошибка загрузки данных розыгрыша");
        }
    }
}
// Запускаем через секунду после загрузки
setTimeout(checkGiveawayInvite, 1000);

// 2. Открытие контейнера
function openGwCheckModal() {
    let modal = document.getElementById('gwCheckModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gwCheckModal';
        modal.className = 'gw-check-overlay';
        modal.innerHTML = `<div class="gw-check-container" id="gwCheckContainer"></div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function closeGwCheckModal() {
    const modal = document.getElementById('gwCheckModal');
    if (modal) modal.style.display = 'none';
    // Важно: При закрытии мы НЕ перекидываем пользователя на вкладку розыгрышей.
    // Он остается там, где был (на главной).
}

// 3. Отправка ответа (Эмодзи)
window.submitGwCheckCaptcha = async function(emoji) {
    if (gwCheckState.attempts <= 0) return;

    renderGwCheckLoading("Проверяем...");

    const res = await apiCall(`/webapp/giveaways/${gwCheckState.giveawayId}/join?emoji=${encodeURIComponent(emoji)}`);
    
    if (res && res.Success) {
        // === УСПЕХ ===
        closeGwCheckModal();
        Telegram.WebApp.showAlert("✅ " + res.Message);
        
        // ТОЛЬКО ТЕПЕРЬ перекидываем на вкладку розыгрышей
        switchTab('giveaways', document.querySelector('.nav-item[onclick*="giveaways"]'));
        switchGiveawayTab('participating', document.querySelector('#page-giveaways .ptab:nth-child(2)'));
        if (typeof loadGiveawaysList === 'function') loadGiveawaysList('participating', false);
        
    } else {
        // === ОШИБКА ===
        const errorMsg = res?.Error || res?.Message || "Неверный выбор";
        
        // Проверяем, это ошибка подписки или неверная капча?
        if (errorMsg.includes("подписанным на канал")) {
            // Вытаскиваем юзернейм канала из ошибки бэкенда (например, @mychannel)
            const match = errorMsg.match(/канал\s+(@[\w_]+|-100\d+)/i);
            const channel = match ? match[1] : null;
            renderGwCheckSubError(channel, errorMsg);
        } else {
            // Ошибка капчи (не тот эмодзи)
            gwCheckState.attempts--;
            if (gwCheckState.attempts <= 0) {
                renderGwCheckFatalError("Вы исчерпали все попытки. Попробуйте перезапустить приложение.");
            } else {
                renderGwCheckCaptcha(errorMsg); // Возвращаем капчу с текстом ошибки
            }
        }
    }
}

// ============================================================
// РЕНДЕРЫ СОСТОЯНИЙ (VIEWS)
// ============================================================

function renderGwCheckLoading(text = "Загрузка...") {
    document.getElementById('gwCheckContainer').innerHTML = `
        <div class="loader-spinner" style="display:block; margin: 0 auto 20px; width: 40px; height: 40px; border: 4px solid var(--border-strong); border-top-color: #ff9f43; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <div class="gw-check-title">${text}</div>
    `;
}

function renderGwCheckCaptcha(errorMsg = null) {
    let errorHtml = errorMsg ? `<div class="gw-check-error-text">${errorMsg}</div>` : '';
    let emojiHtml = gwCheckState.emojis.map(e => 
        `<button class="gw-check-emoji-btn" onclick="submitGwCheckCaptcha('${e}')">${e}</button>`
    ).join('');

    document.getElementById('gwCheckContainer').innerHTML = `
        <button class="gw-check-close" onclick="closeGwCheckModal()">✕</button>
        <div class="gw-check-header-icon">🤖</div>
        <div class="gw-check-title">Проверка на бота</div>
        <div class="gw-check-desc">
            Чтобы принять участие в розыгрыше, выберите:<br>
            <span class="gw-check-target">${gwCheckState.targetName}</span>
        </div>
        <div class="gw-check-grid">
            ${emojiHtml}
        </div>
        ${errorHtml}
        <div class="gw-check-attempts">Осталось попыток: <b>${gwCheckState.attempts}</b></div>
    `;
}

function renderGwCheckSubError(channelUsername, fullError) {
    let btnHtml = '';
    if (channelUsername && channelUsername.startsWith('@')) {
        const cleanChannel = channelUsername.replace('@', '');
        btnHtml = `
            <button class="action-btn" style="width: 100%; margin-bottom: 12px; background: #2481cc;" onclick="Telegram.WebApp.openTelegramLink('https://t.me/${cleanChannel}')">
                Перейти в канал
            </button>
        `;
    }

    document.getElementById('gwCheckContainer').innerHTML = `
        <button class="gw-check-close" onclick="closeGwCheckModal()">✕</button>
        <div class="gw-check-header-icon">📢</div>
        <div class="gw-check-title">Нужна подписка</div>
        <div class="gw-check-desc" style="color: #ff453a;">${fullError}</div>
        
        ${btnHtml}
        
        <button class="action-btn outline-action-btn" style="width: 100%; margin: 0;" onclick="renderGwCheckCaptcha()">
            Я подписался, проверить
        </button>
    `;
}

function renderGwCheckFatalError(msg) {
    document.getElementById('gwCheckContainer').innerHTML = `
        <div class="gw-check-header-icon">❌</div>
        <div class="gw-check-title">Ошибка участия</div>
        <div class="gw-check-desc" style="color: var(--text-secondary);">${msg}</div>
        <button class="action-btn outline-action-btn" style="width: 100%;" onclick="closeGwCheckModal()">Закрыть</button>
    `;
}