// --- core.js ---
// ============================================================
//  core.js — Глобальные переменные, state, API, утилиты
// ============================================================

const tg = window.Telegram.WebApp;
const isTWA = !!(tg.initData && tg.initData.length > 0);

if (isTWA) { tg.expand(); tg.ready(); }

const authHeader = isTWA
    ? `twa ${tg.initData}`
    : (sessionStorage.getItem('xram_auth_key') || 'Bearer 7343414766:lrHJvb5m2rPNo0K33y/z1UIjMPPEVgvYIGSupfvlBBA=');

const BOT_USERNAME = "XramMagazinBot";
const API_BASE = 'https://xrambot.azurewebsites.net/api';

const user = tg.initDataUnsafe?.user || { id: 851524456, username: 'alwys_online', first_name: 'Тест' };
const telegramId = user.id;

const tonConnect = { connected: false, address: null, balance: null, frozenBalance: null };

let RATES = { USD: { tonUsd: 2.0, perStar: 0.015, starDeposit: 0.013 }, RUB: { tonUsd: 180, perStar: 1.35 }, TON: { tonUsd: 1, perStar: 0.0075 } };
let PREMIUM_TON = { 3: 6, 6: 10, 12: 18 };
const RUB_PER_USD = 95;

// Дефолтные цены и системные настройки
window.finalPrices = { star: 0.018, premium3: 14.38, premium6: 19.18, premium12: 34.78 };
window.selfStatus = { PremiumAvailable: true, StarsAvailable: true, Name: '', Username: '', PhotoUrl: '' };
window.sysConfig = { isTestMode: false, receivingWallet: '' }; // НОВОЕ

const state = {
    stars: 50, starsCustom: false, premium: 3, currency: 'USD', topupAmount: 1, useCustomTopup: false,
    target: 'self',

    rentCategory: 'gifts',
    rentNftAddress: null, rentNftName: null, rentDays: 1, rentMinDays: 1, rentMaxDays: 180,
    currentCollection: '', currentCollectionName: '', currentModel: '', nextCursor: null,

    starsRecipientMode: 'self', starsChequeHours: 1, premiumRecipientMode: 'self', premiumChequeHours: 1,
    _usernameTimers: {},
    _validatedUsername: {},

    pay: {
        stars: { method: 'InternalWallet', currency: 'TON' },
        premium: { method: 'InternalWallet', currency: 'TON' },
        rent: { method: 'InternalWallet', currency: 'TON' }
    }
};

window.currentHistory = [];
window.currentRentOffers = [];
window.currentRentals = [];

// ── API ──────────────────────────────────────────────────────
async function apiCall(endpoint, params = {}) {
    try {
        const qs = new URLSearchParams(params).toString();
        const url = `${API_BASE}${endpoint}${qs ? '?' + qs : ''}`;
        const response = await fetch(url, { method: 'GET', headers: { 'Authorization': authHeader } });
        return await response.json();
    } catch (error) { console.error('API Error:', error); return null; }
}

// ── ДИАЛОГИ ──────────────────────────────────────────────────
let _dialogCallback = null;

function showCustomDialog(msg, isConfirm, cb) {
    document.getElementById('customDialogText').textContent = msg;
    document.getElementById('customDialogCancel').style.display = isConfirm ? 'block' : 'none';
    _dialogCallback = cb;
    document.getElementById('customDialogOverlay').classList.add('show');
}

window.closeCustomDialog = function (result) {
    document.getElementById('customDialogOverlay').classList.remove('show');
    if (_dialogCallback) { _dialogCallback(result); _dialogCallback = null; }
}

function safeAlert(msg) {
    if (isTWA) { tg.showAlert(msg); }
    else { showCustomDialog(msg, false, null); }
}

function safeConfirm(msg, cb) {
    if (isTWA) { tg.showConfirm(msg, cb); }
    else { showCustomDialog(msg, true, cb); }
}

// ── ФОРМАТТЕРЫ ───────────────────────────────────────────────
function getTonUsdRate() { return RATES.USD.tonUsd || 2.0; }

function formatTonPrice(tonAmount) {
    const cur = state.currency;
    if (cur === 'TON') return `${tonAmount.toFixed(2)} TON`;
    if (cur === 'USD') return `$${(tonAmount * getTonUsdRate()).toFixed(2)}`;
    if (cur === 'RUB') return `${Math.round(tonAmount * getTonUsdRate() * RUB_PER_USD)} ₽`;
    return `${tonAmount.toFixed(2)} TON`;
}

function formatUsdPrice(usdAmount) {
    const cur = state.currency;
    if (cur === 'USD') return `$${usdAmount.toFixed(2)}`;
    if (cur === 'RUB') return `${Math.round(usdAmount * RUB_PER_USD)} ₽`;
    if (cur === 'TON') return `${(usdAmount / getTonUsdRate()).toFixed(2)} TON`;
    return `$${usdAmount.toFixed(2)}`;
}

// ── UTILS ────────────────────────────────────────────────────
function setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span style="opacity:0.55">Загрузка...</span>'; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
}

function updateHomeBalances() {
    const tonEl = document.getElementById('homeTonBalance');
    const frozenEl = document.getElementById('homeFrozenBalance');
    const frozenCard = document.getElementById('homeFrozenCard');

    if (tonEl) tonEl.textContent = tonConnect.balance !== null ? parseFloat(tonConnect.balance).toFixed(2) : '0.00';

    const frozen = tonConnect.frozenBalance !== null ? parseFloat(tonConnect.frozenBalance) : 0;
    if (frozenEl) frozenEl.textContent = frozen.toFixed(2);

    if (frozenCard) {
        if (frozen <= 0) {
            frozenCard.style.display = 'none';
            const tonCard = document.getElementById('homeTonCard');
            if (tonCard) tonCard.style.gridColumn = 'span 2';
        } else {
            frozenCard.style.display = 'flex';
            const tonCard = document.getElementById('homeTonCard');
            if (tonCard) tonCard.style.gridColumn = '';
        }
    }
}

function updateTonConnectUI() { }
function onTonConnect() { safeAlert('Для подключения кошелька используйте бота или раздел Моя Аренда.'); }

// --- nav.js ---
// ============================================================
//  nav.js — Навигация по вкладкам, page banner, валюта
// ============================================================

const TAB_ORDER = ['home', 'stars', 'premium', 'rent', 'profile'];
let _currentTab = 'home';

const PAGE_BANNER_CONFIG = {
    stars: { label: 'Telegram Stars', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, theme: 'stars' },
    premium: { label: 'Telegram Premium', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, theme: 'premium' },
    rent: { label: 'Аренда NFT-подарков', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`, theme: 'rent' },
    wallet: { label: 'TON Кошелёк', icon: `<svg width="14" height="14" viewBox="0 0 56 56" fill="none"><path d="M28 4L4 18V38L28 52L52 38V18L28 4Z" fill="currentColor" opacity="0.2"/><path d="M28 4L4 18L28 32L52 18L28 4Z" fill="currentColor" opacity="0.7"/><path d="M28 32V52L52 38V18L28 32Z" fill="currentColor" opacity="0.5"/><path d="M4 18V38L28 52V32L4 18Z" fill="currentColor" opacity="0.6"/></svg>`, theme: 'wallet' }
};

function updatePageBanner(tabId) {
    const banner = document.getElementById('pageBanner');
    if (!banner) return;
    const cfg = PAGE_BANNER_CONFIG[tabId];
    if (cfg) {
        banner.className = `page-banner page-banner--${cfg.theme}`;
        banner.innerHTML = `<div class="page-banner-inner"><span class="page-banner-icon">${cfg.icon}</span><span class="page-banner-label">${cfg.label}</span></div>`;
        banner.style.display = 'flex';
    } else {
        banner.style.display = 'none';
    }
}

window.switchTab = function (tabId) {
    if (tabId === _currentTab) return;
    const oldPage = document.getElementById(`page-${_currentTab}`);
    const newPage = document.getElementById(`page-${tabId}`);
    const oldNav = document.querySelector(`.nav-item[data-tab="${_currentTab}"]`);
    const newNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const oldIdx = TAB_ORDER.indexOf(_currentTab);
    const newIdx = TAB_ORDER.indexOf(tabId);

    if (oldPage) oldPage.classList.remove('active', 'slide-from-right', 'slide-from-left');
    if (oldNav) oldNav.classList.remove('active');
    if (newNav) newNav.classList.add('active');

    if (newPage) {
        newPage.classList.remove('slide-from-right', 'slide-from-left');
        void newPage.offsetWidth;
        newPage.classList.add('active', newIdx > oldIdx ? 'slide-from-right' : 'slide-from-left');
    }

    _currentTab = tabId;
    updatePageBanner(tabId);
    if (tabId === 'profile') loadProfile();
    updateAllPrices();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Выбор валюты ─────────────────────────────────────────────
window.selectCurrency = function (cur) {
    state.currency = cur;
    document.getElementById('currencyLabel').textContent = cur;
    document.getElementById('currencyDropdownWrap').classList.remove('open');
    updateAllPrices();
}

// ── Глобальные дропдауны ─────────────────────────────────────
window.toggleDropdown = function (id, e) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
    }
    const wrap = document.getElementById(id);
    if (!wrap) return;
    const isOpen = wrap.classList.contains('open');

    // Закрыть все остальные
    document.querySelectorAll('.custom-dd-wrap, .sort-dd-wrap, .currency-dd-wrap').forEach(el => {
        if (el.id !== id) el.classList.remove('open');
    });

    if (!isOpen) {
        wrap.classList.add('open');
    } else {
        wrap.classList.remove('open');
    }
}

window.toggleSortDropdown = function (e) {
    window.toggleDropdown('sortDropdown', e);
}

document.addEventListener('click', function (e) {
    if (!e.target.closest('.custom-dd-wrap, .sort-dd-wrap, .currency-dd-wrap')) {
        document.querySelectorAll('.custom-dd-wrap, .sort-dd-wrap, .currency-dd-wrap').forEach(el => el.classList.remove('open'));
    }
});

// --- ui.js ---
// ============================================================
//  ui.js — Модальные окна, общие UI-утилиты
// ============================================================

function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('paymentModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

// Закрытие по клику на фон (скрипт в конце body, DOM уже готов)
const _modal = document.getElementById('paymentModal');
if (_modal) _modal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });


// ── Метод оплаты ─────────────────────────────────────────────
window.selectPayMethod = function (product, element) {
    const container = element.closest('.payment-methods');
    container.querySelectorAll('.pay-method').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    state.pay[product] = { method: element.dataset.method, currency: element.dataset.currency };
    if (product === 'rent') updateRentModalPrice();
}

// ── Обновление транзакции вручную ───────────────────────────
async function checkTx(txId) {
    await fetch(`${API_BASE}/transactions/${txId}/check`, { method: 'POST', headers: { 'Authorization': authHeader } });
    closeModal();
    safeAlert('Запрос отправлен. Баланс будет пополнен после подтверждения сети.');
    fetchServerData();
}

// --- recipient.js ---
// ============================================================
//  recipient.js — Поиск получателя по юзернейму
// ============================================================

function setRecipientMode(product, mode, btn) {
    state[`${product}RecipientMode`] = mode;
    const tabGroup = document.getElementById(`${product}RecipientTabs`);
    tabGroup.querySelectorAll('.rtab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${product}RecipientSelf`).style.display = mode === 'self' ? 'flex' : 'none';
    document.getElementById(`${product}RecipientOther`).style.display = mode === 'other' ? 'block' : 'none';
    document.getElementById(`${product}RecipientCheque`).style.display = mode === 'cheque' ? 'block' : 'none';

    const actionBtn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');
    if (mode === 'other') {
        const input = document.getElementById(`${product}Target`);
        if (!input || !input.value || !state._validatedUsername[product]) {
            if (actionBtn) actionBtn.disabled = true;
        }
    } else {
        if (actionBtn) actionBtn.disabled = false;
        if (product === 'stars') updateStarsBtn();
        if (product === 'premium') updatePremiumBtn();
    }
}

function selectChequeOpt(product, element) {
    const val = element.dataset.val;
    const container = element.closest('.cheque-options');
    if (container) container.querySelectorAll('.cheque-opt').forEach(o => o.classList.remove('selected'));
    element.classList.add('selected');
    const customWrap = document.getElementById(`${product}ChequeCustomWrap`);
    if (val === 'custom') {
        customWrap.style.display = 'block';
        const input = document.getElementById(`${product}ChequeCustomHours`);
        if (input) input.oninput = () => { state[`${product}ChequeHours`] = parseInt(input.value) || 1; };
    } else {
        customWrap.style.display = 'none';
        state[`${product}ChequeHours`] = parseInt(val);
    }
}

function getChequeHours(product) {
    const hours = state[`${product}ChequeHours`];
    if (!hours || hours <= 0) {
        const custom = document.getElementById(`${product}ChequeCustomHours`);
        return custom ? parseInt(custom.value) || 0 : 0;
    }
    return hours;
}

function getApiTarget(product) {
    const mode = state[`${product}RecipientMode`];
    if (mode === 'self') return user.username ? `@${user.username}` : `id${telegramId}`;
    if (mode === 'cheque') {
        const hrs = getChequeHours(product);
        if (!hrs) return null;
        return hrs >= 8760 ? 'cheque_inf' : `cheque_${hrs}`;
    }
    const validated = state._validatedUsername[product];
    if (!validated) return null;
    return validated;
}

// ── Проверка юзернейма с дебаунсом ───────────────────────────
function onUsernameInput(product, inputEl) {
    const raw = inputEl.value.trim().replace('@', '');
    const statusMsg = document.getElementById(`${product}UsernameMsg`);
    const btn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');

    if (btn) btn.disabled = true;
    if (statusMsg) statusMsg.innerHTML = '';
    // Сбрасываем подтверждённый юзернейм при новом вводе
    state._validatedUsername[product] = null;
    if (!raw || raw.length < 3) return;

    clearTimeout(state._usernameTimers[product]);
    if (statusMsg) statusMsg.innerHTML = '<div class="username-checking">Проверяется...</div>';
    state._usernameTimers[product] = setTimeout(() => doCheckUsername(product, raw), 600);
}

async function doCheckUsername(product, username) {
    const type = product === 'premium' ? 'premium' : 'stars';
    // Всегда запрашиваем актуальную информацию с Fragment — без кэша
    const data = await apiCall(`/webapp/recipient/check?username=${username}&type=${type}`);
    applyUsernameResult(product, data?.Success ? data : null, username);
}

function applyUsernameResult(product, data, rawUsername) {
    const statusMsg = document.getElementById(`${product}UsernameMsg`);
    const statusIcon = document.getElementById(`${product}UsernameStatus`);
    const btn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');

    if (statusIcon) statusIcon.innerHTML = '';

    if (data) {
        const letter = (data.Name || 'X')[0].toUpperCase();
        const avatarHtml = data.AvatarUrl
            ? `<img src="${data.AvatarUrl}" class="tpc-avatar">`
            : `<div class="tpc-avatar-letter">${letter}</div>`;

        // Сохраняем подтверждённый юзернейм
        state._validatedUsername[product] = rawUsername;

        if (statusMsg) {
            statusMsg.innerHTML = `
                <div class="target-profile-card recipient-found-card">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${data.Name}</div>
                        <div class="tpc-username">@${rawUsername}</div>
                    </div>
                    <div class="tpc-checkmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>`;
        }
        if (btn) btn.disabled = false;
    } else {
        state._validatedUsername[product] = null;
        if (statusMsg) {
            statusMsg.innerHTML = `
                <div class="recipient-error-card">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Пользователь не найден
                </div>`;
        }
        if (btn) btn.disabled = true;
    }
}

// ── Логика вкладок получателя (для модалок openStarsModal/openPremiumModal) ──
window.renderTargetSection = function (type) {
    const isSelfAvail = type === 'premium' ? window.selfStatus?.PremiumAvailable : window.selfStatus?.StarsAvailable;
    const selfBtn = `<button class="ttab ${state.target === 'self' ? 'active' : ''}" onclick="switchTarget('self', '${type}')"   ${!isSelfAvail ? 'disabled style="opacity:0.5"' : ''}>Себе</button>`;
    const otherBtn = `<button class="ttab ${state.target === 'other' ? 'active' : ''}" onclick="switchTarget('other', '${type}')">Другому</button>`;
    const chequeBtn = `<button class="ttab ${state.target === 'cheque' ? 'active' : ''}" onclick="switchTarget('cheque', '${type}')">Чеком</button>`;

    let contentHtml = '';
    if (state.target === 'self') {
        if (isSelfAvail) {
            const photo = window.selfStatus?.PhotoUrl;
            const letter = (window.selfStatus?.name || 'X')[0].toUpperCase();
            const avatarHtml = photo ? `<img src="${photo}">` : `<div class="tpc-avatar-letter">${letter}</div>`;
            contentHtml = `
                <div class="target-profile-card">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${window.selfStatus?.name}</div>
                        <div class="tpc-username">@${window.selfStatus?.Username}</div>
                    </div>
                </div>`;
        } else {
            contentHtml = `<div style="color:#ff6b6b; font-size:13px; text-align:center; padding:10px 0;">Недоступно для вашего аккаунта</div>`;
        }
    } else if (state.target === 'other') {
        contentHtml = `
            <label class="form-label">Юзернейм получателя</label>
            <input type="text" id="targetUsername" class="form-input" placeholder="@username" oninput="onTargetUsernameInput('${type}')">
            <div id="targetUserPreview"></div>`;
    } else if (state.target === 'cheque') {
        contentHtml = `<div style="font-size:13px; color:var(--text-secondary); text-align:center; padding:10px 0;">Будет создан чек-ссылка. Вы сможете переслать её получателю.</div>`;
    }

    return `
        <div class="target-tabs">${selfBtn}${otherBtn}${chequeBtn}</div>
        <div id="targetInputWrapper" style="margin-bottom:16px">${contentHtml}</div>`;
}

let _targetCheckTimeout = null;
window.onTargetUsernameInput = function (type) {
    clearTimeout(_targetCheckTimeout);
    const input = document.getElementById('targetUsername').value.trim();
    const preview = document.getElementById('targetUserPreview');
    const btn = document.getElementById(type === 'premium' ? 'modalPremiumBtn' : 'modalStarsBtn');

    if (!input) { preview.innerHTML = ''; btn.disabled = true; return; }
    preview.innerHTML = '<div class="username-checking">Проверка пользователя...</div>';
    btn.disabled = true;

    _targetCheckTimeout = setTimeout(async () => {
        const res = await apiCall(`/webapp/recipient/check?username=${input}&type=${type}`);
        if (res && res.Success) {
            const photo = res.AvatarUrl;
            const letter = (res.Name || 'X')[0].toUpperCase();
            const avatarHtml = photo ? `<img src="${photo}">` : `<div class="tpc-avatar-letter">${letter}</div>`;
            preview.innerHTML = `
                <div class="target-profile-card recipient-found-card" style="margin-top:12px;">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${res.Name}</div>
                        <div class="tpc-username">@${input.replace('@', '')}</div>
                    </div>
                    <div class="tpc-checkmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>`;
            btn.disabled = false;
        } else {
            preview.innerHTML = `<div class="recipient-error-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                ${res?.Error || 'Пользователь не найден'}
            </div>`;
            btn.disabled = true;
        }
    }, 700);
}

window.switchTarget = function (target, type) {
    state.target = target;
    document.getElementById('modalTargetContainer').innerHTML = renderTargetSection(type);
    const btn = document.getElementById(type === 'premium' ? 'modalPremiumBtn' : 'modalStarsBtn');
    if (target === 'self') btn.disabled = (type === 'premium' ? !window.selfStatus?.PremiumAvailable : !window.selfStatus?.StarsAvailable);
    else if (target === 'other') btn.disabled = true;
    else if (target === 'cheque') btn.disabled = false;
}

// --- prices.js ---
// ============================================================
//  prices.js — Обновление цен на странице (updateAllPrices)
// ============================================================

function updateAllPrices() {
    [50, 100, 250, 500, 1000, 2500].forEach(count => {
        const el = document.getElementById(`price-stars-${count}`);
        if (el) el.textContent = formatUsdPrice(count * RATES.USD.perStar);
    });
    [3, 6, 12].forEach(m => {
        const el = document.getElementById(`price-premium-${m}`);
        if (el) el.textContent = formatTonPrice(PREMIUM_TON[m]);
    });
    [1, 5, 10, 25].forEach(amount => {
        const el = document.getElementById(`topup-price-${amount}`);
        if (el) el.textContent = `≈ ${formatTonPrice(amount)}`;
    });

    updateStarsCustomPrice();
    updateStarsBtn();
    updatePremiumBtn();
    updateTopupBtn();

    // Обновляем цены на карточках аренды при смене валюты
    if (_currentTab === 'rent' && window.currentRentOffers.length > 0) {
        document.querySelectorAll('#rentCardsContainer .rent-card-price').forEach((el, index) => {
            if (window.currentRentOffers[index]) {
                el.textContent = `~${formatTonPrice(window.currentRentOffers[index].PriceTon)} / дн`;
            }
        });
    }

    const label = document.getElementById('currencyLabel');
    if (label) label.textContent = state.currency;
}

function selectPackage(type, value, element) {
    if (type === 'stars') {
        state.stars = value;
        state.starsCustom = false;
        document.getElementById('customStarsWrapper').style.display = 'none';
    } else {
        state[type] = value;
    }
    const container = element.closest('.packages-list');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    if (type === 'stars') updateStarsBtn();
    if (type === 'premium') updatePremiumBtn();
}

// --- payment.js ---
// ============================================================
//  payment.js — Оплата Stars/Premium (общая модалка + транзакции)
// ============================================================

function generatePaymentMethodsHtml(product, targetMode, requiredTon) {
    const balNum = tonConnect.balance !== null ? parseFloat(tonConnect.balance) : 0;
    const isEnough = balNum >= requiredTon;
    const balClass = isEnough ? 'selected' : '';
    const otherClass = !isEnough ? 'selected' : '';
    const balStyle = !isEnough ? 'opacity: 0.4; pointer-events: none;' : '';

    const btnTopup = `<div class="pay-method" style="flexShrink:0; width:110px; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--wallet-dim); border-color:var(--wallet-primary); color:var(--wallet-primary); padding:13px 10px; font-size:12.5px;" onclick="closeModal(); switchTab('wallet');"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Пополнить</div>`;

    if (targetMode === 'cheque') {
        return `
            <div class="payment-methods" style="display:flex; gap:8px;">
                <div class="pay-method ${balClass}" style="flex:1; padding: 14px 10px; font-size: 13.5px; display:flex; flex-direction:column; gap:2px; ${balStyle}" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">
                    <span>Оплатить со счета</span>
                </div>
                ${btnTopup}
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:-8px; margin-bottom:16px;">Сумма будет заморожена на балансе</div>`;
    }
    return `
        <div class="payment-methods" style="display:flex; gap:8px; margin-bottom:8px;">
            <div class="pay-method ${balClass}" style="flex:1; padding: 14px 10px; font-size: 13.5px; display:flex; flex-direction:column; gap:2px; ${balStyle}" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">
                <span>Оплатить со счета</span>
            </div>
            ${btnTopup}
        </div>
        <div class="payment-methods" style="grid-template-columns: 1fr 1fr; display:grid;">
            <div class="pay-method ${otherClass}" data-method="CryptoTransfer" data-currency="TON" onclick="selectPayMethod('${product}', this)">Перевод TON</div>
            <div class="pay-method" data-method="BankCard" data-currency="RUB" onclick="selectPayMethod('${product}', this)">Карта (RUB)</div>
            <div class="pay-method" style="grid-column: span 2" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('${product}', this)">Звёзды</div>
        </div>`;
}

window.openPaymentModal = function (product) {
    const targetStr = getApiTarget(product);
    if (!targetStr) {
        safeAlert('Пожалуйста, проверьте юзернейм получателя или срок чека.');
        return;
    }

    let productName = '', usdPrice = 0, tonPrice = 0, targetDisplay = '';
    const mode = state[`${product}RecipientMode`];

    if (mode === 'self') targetDisplay = 'На свой аккаунт';
    else if (mode === 'other') targetDisplay = `@${state._validatedUsername[product]}`;
    else if (mode === 'cheque') {
        const hrs = getChequeHours(product);
        targetDisplay = hrs >= 8760 ? 'Чек (бессрочный)' : `Чек (на ${hrs} ч.)`;
    }

    if (product === 'stars') {
        const count = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount')?.value) || 0 : state.stars;
        if (count < 50) return safeAlert('Минимум 50 звезд');
        productName = `${count} Telegram Stars`;
        usdPrice = count * RATES.USD.perStar;
        tonPrice = usdPrice / getTonUsdRate();
    } else if (product === 'premium') {
        productName = `Telegram Premium ${state.premium} мес.`;
        tonPrice = PREMIUM_TON[state.premium];
        usdPrice = tonPrice * getTonUsdRate();
    }

    const balNum = tonConnect.balance !== null ? parseFloat(tonConnect.balance) : 0;
    const isEnough = balNum >= tonPrice;

    if (mode === 'cheque' || isEnough) {
        state.pay[product] = { method: 'InternalWallet', currency: 'TON' };
    } else {
        state.pay[product] = { method: 'CryptoTransfer', currency: 'TON' };
    }

    const balIndicatorHtml = `<div style="position:absolute; top: 12px; left: 16px; font-size: 11px; font-weight: 700; color: var(--wallet-primary);">Баланс: <br><span style="font-size:13px">${balNum.toFixed(2)} TON</span></div>`;

    showModal('Оформление заказа', `
        ${balIndicatorHtml}
        <div class="page-${product}-theme" style="margin-top: 10px;">
            <div class="modal-info-row"><span class="modal-info-label">Товар</span><span class="modal-info-value" style="color:var(--${product}-primary)">${productName}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Получатель</span><span class="modal-info-value">${targetDisplay}</span></div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">К оплате:</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)">$${usdPrice.toFixed(2)}</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)">(≈ ${tonPrice.toFixed(2)} TON)</div>
                </div>
            </div>

            <label class="form-label" style="margin-bottom:8px;">Способ оплаты</label>
            ${generatePaymentMethodsHtml(product, mode, tonPrice)}

            <button class="action-btn ${product}-action-btn" id="modalConfirmBtn" onclick="executePurchase('${product}')" style="width:100%; margin: 16px 0 0">Подтвердить заказ</button>
        </div>
    `);
}

window.executePurchase = async function (product) {
    const target = getApiTarget(product);
    const pm = state.pay[product].method;
    const pc = state.pay[product].currency;
    const btn = document.getElementById('modalConfirmBtn');

    setLoading(btn, true);

    let endpoint = '';
    let payload = { telegramId, currency: pc, method: pm, targetUsername: target };

    if (product === 'stars') {
        endpoint = '/transactions/create/stars';
        payload.stars = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount')?.value) : state.stars;
    } else if (product === 'premium') {
        endpoint = '/transactions/create/premium';
        payload.months = state.premium;
    }

    const result = await apiCall(endpoint, payload);
    setLoading(btn, false);

    if (result && result.Success) { handleTxFlow(result); }
    else if (result) { safeAlert('Ошибка: ' + result.Error); }
}

// Используется для Stars/Premium страниц (кнопки Купить на странице)
window.apiBuyStars = function () { executePurchase('stars'); }
window.apiBuyPremium = function (months) {
    state.premium = months || state.premium;
    executePurchase('premium');
}

function handleTxFlow(txData) {
    closeModal();

    if (txData.PaymentMethod === 'InternalWallet') {
        if (txData.TargetUsername && txData.TargetUsername.startsWith('cheque_')) {
            const link = `https://t.me/${BOT_USERNAME}?start=chk_${txData.TransactionId}`;
            showModal('🧾 Чек успешно создан!', `
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">Средства заморожены. Перешлите эту ссылку получателю:</p>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input">${link}</div>
                    <button class="cheque-copy-btn" onclick="copyChequeLink('${link}')">Копировать</button>
                </div>
                <button class="action-btn outline-action-btn" onclick="closeModal(); fetchServerData(); loadProfile(); switchTab('profile');">Перейти в Мои чеки</button>
            `);
        } else {
            safeAlert('Заявка успешно обработана! Подробности в профиле.');
            fetchServerData();
            loadProfile();
        }
    } else if (txData.PaymentMethod === 'TelegramStars') {
        if (window.sysConfig && window.sysConfig.isTestMode) {
            safeAlert('Тестовый режим: Оплата Звездами сымитирована и прошла успешно!');
            fetchServerData();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            showModal('Оплата Звездами', `
                <div style="text-align:center; padding: 10px 0;">
                    <div style="font-size:44px; margin-bottom:12px;">⭐️</div>
                    <h3 style="margin-bottom:10px; color:var(--text)">Счет выставлен!</h3>
                    <p style="color:var(--text-secondary);font-size:14px; margin-bottom:20px;">Закройте это окно и вернитесь в чат с ботом. Мы отправили вам счет на оплату Telegram Stars.</p>
                    <button class="action-btn stars-action-btn" onclick="tg.close()" style="width:100%;">Закрыть WebApp</button>
                </div>
            `);
        }
    } else if (txData.PaymentMethod === 'CryptoTransfer') {
        showModal('Крипто-перевод', `
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">Переведите точную сумму на кошелек бота и укажите код в комментарии.</p>
            <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="color:var(--rent-primary)">${txData.Amount} ${txData.Currency}</span></div>
            
            <label class="form-label" style="margin-top:12px">Кошелек (сохраните адрес)</label>
            <div class="cheque-link-wrap" style="margin-bottom: 8px;">
                <div class="cheque-link-input">${window.sysConfig.receivingWallet}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${window.sysConfig.receivingWallet}'); safeAlert('Кошелек скопирован');">Копировать</button>
            </div>
            
            <label class="form-label" style="margin-top:12px">Код комментария (ОБЯЗАТЕЛЬНО)</label>
            <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                <div class="cheque-link-input">${txData.PaymentCode}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${txData.PaymentCode}'); safeAlert('Код скопирован');">Копировать</button>
            </div>

            <div style="font-size:11.5px; color:#ff6b6b; text-align:center; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 8px; border: 1px solid rgba(255,107,107,0.2); margin-bottom:14px;">Без кода в комментарии деньги не зачислятся!</div>
        `);
    } else {
        safeAlert(`Откройте бота, чтобы завершить оплату способом: ${txData.PaymentMethod}`);
    }
}

// --- wallet.js ---
// ============================================================
//  wallet.js — Пополнение и вывод TON-кошелька
// ============================================================

function updateTopupBtn() {
    const btn = document.getElementById('topupBtn');
    if (!btn) return;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Пополнить ${state.topupAmount} TON`;
}

function selectTopup(amount, element) {
    state.topupAmount = amount;
    state.useCustomTopup = false;
    const container = document.getElementById('topupOptions');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('customTopupWrapper').style.display = 'none';
    updateTopupBtn();
}

function toggleCustomTopup(element) {
    state.useCustomTopup = true;
    const container = document.getElementById('topupOptions');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('customTopupWrapper').style.display = 'block';
    document.getElementById('topupAmount').oninput = (e) => {
        state.topupAmount = parseFloat(e.target.value) || 0;
        updateTopupBtn();
    };
}

window.apiTopupWallet = function () {
    let amount = state.useCustomTopup
        ? parseFloat(document.getElementById('topupAmount').value)
        : state.topupAmount;
    if (!amount || amount <= 0) return safeAlert('Введите корректную сумму');

    state.pay.topup = { method: 'CryptoTransfer', currency: 'TON' };
    const usdPrice = amount * getTonUsdRate();

    showModal('Пополнение баланса', `
        <div class="page-wallet-theme" style="margin-top: 10px;">
            <div class="modal-info-row"><span class="modal-info-label">Сумма пополнения</span><span class="modal-info-value" style="color:var(--wallet-primary)">${amount} TON</span></div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">К оплате:</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)">$${usdPrice.toFixed(2)}</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)">(≈ ${amount.toFixed(2)} TON)</div>
                </div>
            </div>

            <label class="form-label" style="margin-bottom:8px;">Способ оплаты</label>
            <div class="payment-methods">
                <div class="pay-method selected" data-method="CryptoTransfer" data-currency="TON" onclick="selectPayMethod('topup', this)">Перевод TON</div>
                <div class="pay-method" data-method="BankCard" data-currency="RUB" onclick="selectPayMethod('topup', this)">Карта (RUB)</div>
                <div class="pay-method" style="grid-column: span 2" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('topup', this)">Звёзды</div>
            </div>

            <button class="action-btn wallet-action-btn" id="modalConfirmTopupBtn" onclick="executeTopup(${amount})" style="width:100%; margin: 16px 0 0">Пополнить</button>
        </div>
    `);
}

window.executeTopup = async function (amount) {
    const pm = state.pay.topup.method;
    const pc = state.pay.topup.currency;
    const btn = document.getElementById('modalConfirmTopupBtn');

    setLoading(btn, true);
    const result = await apiCall('/transactions/create/topup', { telegramId, currency: pc, method: pm, amount });
    setLoading(btn, false);

    if (result && result.Success) { handleTxFlow(result); }
    else if (result) { safeAlert('Ошибка: ' + result.Error); }
}

async function apiWithdrawWallet() {
    const amount = document.getElementById('withdrawAmount').value;
    const address = document.getElementById('withdrawAddress').value.trim();
    if (!amount || !address) return safeAlert('Заполните все поля');
    const result = await apiCall('/transactions/create/withdrawal', { telegramId, currency: 'TON', amount, targetAddress: address });
    if (result && result.Success) { safeAlert('Заявка на вывод создана!'); fetchServerData(); }
    else if (result) safeAlert('Ошибка: ' + result.Error);
}

// --- api.js ---
// ============================================================
//  api.js — Получение данных с бэкенда: цены, баланс, init
// ============================================================

// Дефолтные цены — используются до загрузки с сервера
window.finalPrices = window.finalPrices || {
    star: 0.015, premium3: 3.99, premium6: 6.99, premium12: 11.99
};

async function fetchServerData() {
    const config = await apiCall('/webapp/config/prices');
    if (config && config.Success) {
        // Забираем системные данные
        window.sysConfig.isTestMode = config.IsTestMode;
        window.sysConfig.receivingWallet = config.ReceivingWalletAddress;

        // Забираем курсы
        RATES.USD.tonUsd = config.Rates.TonUsd;
        RATES.USD.starDeposit = config.Rates.StarDepositUsd; // Курс для аренды в звездах

        // Забираем УЖЕ ФИНАЛЬНЫЕ цены с бекенда (наценка уже включена)
        window.finalPrices.star = config.FinalPricesUsd.Star;
        PREMIUM_TON = {
            3: config.FinalPricesUsd.Premium3 / RATES.USD.tonUsd,
            6: config.FinalPricesUsd.Premium6 / RATES.USD.tonUsd,
            12: config.FinalPricesUsd.Premium12 / RATES.USD.tonUsd
        };

        // Включаем красную плашку, если включен тестовый режим
        const testBanner = document.getElementById('testModeBanner');
        if (testBanner) testBanner.style.display = window.sysConfig.isTestMode ? 'block' : 'none';

        updateAllPrices();
    }

    const balance = await apiCall('/webapp/user/balance');
    if (balance && balance.Success) {
        tonConnect.balance = balance.TonBalance;
        tonConnect.frozenBalance = balance.FrozenTonBalance;
        updateHomeBalances();
    }

    // Загружаем предложения по умолчанию, чтобы вкладка Аренды не была пустой
    if (!window.currentRentOffers || window.currentRentOffers.length === 0) {
        await switchRentCategory('gifts');
    }
}

async function init() {
    const testUsername = 'alwys_online';
    const reqUsername = user.username || testUsername;

    // 1. Получаем персонализированные цены и статус аккаунта с Fragment
    try {
        const initData = await apiCall(`/webapp/init?username=${reqUsername}`);
        if (initData && initData.Success) {
            window.finalPrices = {
                star: initData.FinalPricesUsd.Star,
                premium3: initData.FinalPricesUsd.Premium3,
                premium6: initData.FinalPricesUsd.Premium6,
                premium12: initData.FinalPricesUsd.Premium12
            };
            window.selfStatus = initData.User;
        }
    } catch (e) { console.error("Ошибка инициализации:", e); }

    // 2. Имя и фото: Fragment → Telegram → fallback
    let firstName = 'Вы';
    if (window.selfStatus?.name && window.selfStatus.name.toLowerCase() !== reqUsername.toLowerCase()) {
        firstName = window.selfStatus.name;
    } else if (user?.first_name && user.first_name !== 'Test') {
        firstName = user.first_name;
    }

    const usernameDisplay = reqUsername ? `@${reqUsername}` : `id${telegramId}`;
    const photoUrl = window.selfStatus?.PhotoUrl;
    const avatarLetter = firstName[0]?.toUpperCase() || 'X';

    // 3. Заполняем карточки "Себе" для Stars/Premium
    ['stars', 'premium'].forEach(prefix => {
        const ava = document.getElementById(`${prefix}AvatarSelf`);
        const name = document.getElementById(`${prefix}NameSelf`);
        const usr = document.getElementById(`${prefix}UsernameSelf`);

        if (ava) {
            ava.innerHTML = photoUrl
                ? `<img src="${photoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
                : avatarLetter;
        }
        if (name) name.textContent = firstName;
        if (usr) usr.textContent = usernameDisplay;
    });

    fetchServerData();
}

