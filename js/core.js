// --- core.js ---
// ============================================================
//  core.js — Глобальные переменные, state, API, утилиты
// ============================================================

const tg = window.Telegram.WebApp;
const isTWA = !!(tg.initData && tg.initData.length > 0);

if (isTWA) { tg.expand(); tg.ready(); }

const authHeader = isTWA
    ? `twa ${tg.initData}`
    : (sessionStorage.getItem('xram_auth_key') || 'Bearer 7343414766:z5xYTzkcARs3QIV2ohgvTajxwB2jV/7CGViM8I/Vapo=');

const BOT_USERNAME = "XramMagazinBot";
const API_BASE = 'https://xrambot.azurewebsites.net/api';

const user = tg.initDataUnsafe?.user || { id: 851524456, username: 'alwys_online', first_name: 'Тест' };
const telegramId = user.id;

const tonConnect = { connected: false, address: null, balance: null, frozenBalance: null };

let RATES = { USD: { tonUsd: 2.0, perStar: 0.015, starDeposit: 0.013 }, TON: { tonUsd: 1, perStar: 0.0075 }, USDT: { tonUsd: 1, perStar: 0.015 } };
window.RATES = RATES;
let PREMIUM_TON = { 3: 6, 10: 10, 12: 18 };

// Дефолтные цены и системные настройки
window.finalPrices = { star: 0.018, premium3: 14.38, premium6: 19.18, premium12: 34.78 };
window.selfStatus = { PremiumAvailable: true, StarsAvailable: true, Name: '', Username: '', PhotoUrl: '' };
window.sysConfig = { isTestMode: false, receivingWallet: '', gasFeeTon: 0.06 }; 

const state = {
    stars: 50, starsCustom: false, premium: 3, currency: 'USD', topupAmount: 0, useCustomTopup: true,
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
        rent: { method: 'InternalWallet', currency: 'TON' },
        topup: { method: 'CryptoTransfer', currency: 'TON' }
    }
};

window.currentHistory = [];
window.currentRentOffers = [];
window.currentRentals = [];

// ── API ──────────────────────────────────────────────────────
async function apiCall(endpoint, params = {}, method = 'GET') {
    try {
        let url = `${API_BASE}${endpoint}`;
        let options = {
            method: method,
            headers: { 'Authorization': authHeader }
        };

        if (method === 'GET') {
            const qs = new URLSearchParams(params).toString();
            if (qs) url += '?' + qs;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(params);
        }

        const response = await fetch(url, options);
        return await response.json();
    } catch (error) { 
        console.error('API Error:', error); 
        return null; 
    }
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
    if (cur === 'USDT') return `${(tonAmount * getTonUsdRate()).toFixed(2)} USDT`;
    if (cur === 'Stars') return `${Math.ceil((tonAmount * getTonUsdRate()) / RATES.USD.perStar)} ⭐️`;
    return `${tonAmount.toFixed(2)} TON`;
}

function formatUsdPrice(usdAmount) {
    const cur = state.currency;
    if (cur === 'USD') return `$${usdAmount.toFixed(2)}`;
    if (cur === 'USDT') return `${usdAmount.toFixed(2)} USDT`;
    if (cur === 'TON') return `${(usdAmount / getTonUsdRate()).toFixed(2)} TON`;
    if (cur === 'Stars') return `${Math.ceil(usdAmount / RATES.USD.perStar)} ⭐️`;
    return `$${usdAmount.toFixed(2)}`;
}

// ── UTILS ────────────────────────────────────────────────────
function setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = `<span style="opacity:0.55">${t('loading')}</span>`; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
}

function updateHomeBalances() {
    const tonEl = document.getElementById('homeTonBalance');
    const frozenEl = document.getElementById('homeFrozenBalance');
    const frozenCard = document.getElementById('homeFrozenCard');
    const wBalance = document.getElementById('walletPageBalance');
    const wRate = document.getElementById('walletPageRate');

    const bal = tonConnect.balance !== null ? parseFloat(tonConnect.balance).toFixed(2) : '0.00';
    
    if (tonEl) tonEl.textContent = bal;
    if (wBalance) wBalance.textContent = `${bal} TON`;
    if (wRate) wRate.textContent = `$${getTonUsdRate().toFixed(2)}`;

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
function onTonConnect() { safeAlert(t('alert_wallet_info')); }

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
    if (typeof updateGwCreatePrice === 'function') updateGwCreatePrice();
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

window.toggleSortDropdown = function(e) {
    e.stopPropagation();
    const wrap = e.currentTarget.closest('.sort-dd-wrap');
    
    document.querySelectorAll('.sort-dd-wrap.open').forEach(el => {
        if (el !== wrap) el.classList.remove('open');
    });
    
    if (wrap) wrap.classList.toggle('open');
};

document.addEventListener('click', () => {
    document.querySelectorAll('.sort-dd-wrap.open').forEach(el => el.classList.remove('open'));
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

const _modal = document.getElementById('paymentModal');
if (_modal) _modal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

window.updateModalBreakdown = function() {
    const product = window._currentModalProduct;
    if (!product) return;

    const methodObj = state.pay[product];
    if (!methodObj) return;
    const method = methodObj.method;
    
    const baseUsd = window._currentModalBaseUsd || 0;
    const baseTon = window._currentModalBaseTon || 0;
    
    const gasFeeTon = window.sysConfig.gasFeeTon || 0.06;
    
    // Если это пополнение кошелька, газ сети боту платить не нужно
    const hasGas = (product !== 'topup');
    const gasTon = hasGas ? gasFeeTon : 0;
    const gasUsd = gasTon * getTonUsdRate();

    let bdPriceStr = "";
    let bdGasStr = "";
    let bdTotalStr = "";
    let btnText = "Подтвердить";
    let topupDisplayAmount = "";

    const pc = methodObj.currency || 'TON';

    if (method === 'InternalWallet' || (method === 'CryptoTransfer' && pc === 'TON')) {
        let totalTon = baseTon + gasTon;

        bdPriceStr = `${baseTon.toFixed(2)} TON`;
        bdGasStr = `+ ${gasTon.toFixed(2)} TON`;
        bdTotalStr = `${totalTon.toFixed(2)} TON`;
        btnText = `Оплатить ${totalTon.toFixed(2)} TON`;
        topupDisplayAmount = `${baseTon} TON`;
    } else if (method === 'CryptoTransfer' && pc === 'USDT') {
        let totalUsd = baseUsd + gasUsd;
        
        bdPriceStr = `${baseUsd.toFixed(2)} USDT`;
        bdGasStr = `+ ${gasUsd.toFixed(2)} USDT`;
        bdTotalStr = `${totalUsd.toFixed(2)} USDT`;
        btnText = `Оплатить ${totalUsd.toFixed(2)} USDT`;
        topupDisplayAmount = `${baseUsd.toFixed(2)} USDT`;
    } else if (method === 'TelegramStars') {
        const globalMarkup = window.sysConfig?.globalMarkupPercentage || 20;
        let markupUsd = baseUsd * (globalMarkup / 100);
        let subtotalUsd = baseUsd + markupUsd;
        let starsWithdrawalFeeUsd = subtotalUsd * 0.05;
        let finalUsd = subtotalUsd + starsWithdrawalFeeUsd;
        
        let totalStars = Math.ceil(finalUsd / 0.015);
        let baseStars = Math.ceil(baseUsd / 0.015);
        let markupStars = totalStars - baseStars;

        bdPriceStr = `${baseStars} ⭐️`;
        bdGasStr = `+ ${markupStars} ⭐️ (Наценка + Вывод)`;
        bdTotalStr = `${totalStars} ⭐️`;
        btnText = `Оплатить ${totalStars} ⭐️`;
        topupDisplayAmount = `${baseStars} ⭐️`;
        btnText = `Оплатить ${totalStars} ⭐️`;
        topupDisplayAmount = `${baseStars} ⭐️`;
    }

    if (product === 'topup') {
        const amtValEl = document.getElementById('modalTopupAmountValue');
        if (amtValEl) amtValEl.innerText = topupDisplayAmount;
    }

    const breakdownEl = document.getElementById('paymentBreakdown');
    if (breakdownEl) {
        document.getElementById('bdProductPrice').innerText = bdPriceStr;
        document.getElementById('bdGasFee').innerText = bdGasStr;
        document.getElementById('bdTotal').innerText = bdTotalStr;
        document.getElementById('bdGasRow').style.display = hasGas ? 'flex' : 'none';
    }

    const confirmBtn = document.getElementById('modalConfirmBtn');
    if (confirmBtn) confirmBtn.innerText = btnText;
}

window.selectPayMethod = function (product, element) {
    const container = element.closest('.modal-content') || element.closest('.page');
    if (container) {
        container.querySelectorAll('.pay-method').forEach(el => el.classList.remove('selected'));
    }
    element.classList.add('selected');
    state.pay[product] = { method: element.dataset.method, currency: element.dataset.currency };
    
    // Пересчитываем газ и итог в чеке
    if (typeof updateModalBreakdown === 'function') updateModalBreakdown();

    if (product === 'rent') { if (typeof updateRentModalPrice === 'function') updateRentModalPrice(); }
    if (product === 'topup') { if (typeof updateTopupModalPrice === 'function') updateTopupModalPrice(); }
}

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

function onUsernameInput(product, inputEl) {
    const raw = inputEl.value.trim().replace('@', '');
    const statusMsg = document.getElementById(`${product}UsernameMsg`);
    const btn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');

    if (btn) btn.disabled = true;
    if (statusMsg) statusMsg.innerHTML = '';
    state._validatedUsername[product] = null;
    if (!raw || raw.length < 3) return;

    clearTimeout(state._usernameTimers[product]);
    if (statusMsg) statusMsg.innerHTML = `<div class="username-checking">${t('username_checking')}</div>`;
    state._usernameTimers[product] = setTimeout(() => doCheckUsername(product, raw), 600);
}

async function doCheckUsername(product, username) {
    const type = product === 'premium' ? 'premium' : 'stars';
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
                    ${data?.Error || t('username_not_found')}
                </div>`;
        }
        if (btn) btn.disabled = true;
    }
}

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
            contentHtml = `<div style="color:#ff6b6b; font-size:13px; text-align:center; padding:10px 0;">${t('username_not_found')}</div>`;
        }
    } else if (state.target === 'other') {
        contentHtml = `
            <label class="form-label">${t('label_recipient')}</label>
            <input type="text" id="targetUsername" class="form-input" placeholder="@username" oninput="onTargetUsernameInput('${type}')">
            <div id="targetUserPreview"></div>`;
    } else if (state.target === 'cheque') {
        contentHtml = `<div style="font-size:13px; color:var(--text-secondary); text-align:center; padding:10px 0;">${t('modal_frozen_note')}</div>`;
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
    preview.innerHTML = `<div class="username-checking">${t('username_checking')}</div>`;
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
                ${res?.Error || t('username_not_found')}
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
    [50, 200, 500, 1000].forEach(count => {
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

    if (typeof updateStarsCustomPrice === 'function') updateStarsCustomPrice();
    if (typeof updateStarsBtn === 'function') updateStarsBtn();
    if (typeof updatePremiumBtn === 'function') updatePremiumBtn();
    if (typeof updateTopupBtn === 'function') updateTopupBtn();

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
    if (type === 'stars' && typeof updateStarsBtn === 'function') updateStarsBtn();
    if (type === 'premium' && typeof updatePremiumBtn === 'function') updatePremiumBtn();
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

    const btnTopup = `<div class="pay-method" style="flexShrink:0; width:110px; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--wallet-dim); border-color:var(--wallet-primary); color:var(--wallet-primary); padding:13px 10px; font-size:12.5px;" onclick="closeModal(); switchTab('wallet');"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${t('modal_pay_topup')}</div>`;

    if (targetMode === 'cheque') {
        return `
            <div class="payment-methods" style="display:flex; gap:8px;">
                <div class="pay-method ${balClass}" style="flex:1; padding: 14px 10px; font-size: 13.5px; display:flex; flex-direction:column; gap:2px; ${balStyle}" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">
                    <span>${t('modal_pay_internal')}</span>
                </div>
                ${btnTopup}
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:-8px; margin-bottom:16px;">${t('modal_frozen_note')}</div>`;
    }
    return `
        <div class="payment-methods" style="display:flex; gap:8px; margin-bottom:8px;">
            <div class="pay-method ${balClass}" style="flex:1; padding: 14px 10px; font-size: 13.5px; display:flex; flex-direction:column; gap:2px; ${balStyle}" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">
                <span>${t('modal_pay_internal')}</span>
            </div>
            ${btnTopup}
        </div>
        <div class="payment-methods" style="grid-template-columns: 1fr 1fr; display:grid;">
            <div class="pay-method ${otherClass}" data-method="CryptoTransfer" data-currency="TON" onclick="selectPayMethod('${product}', this)">${t('modal_pay_transfer') || 'Криптокошелек'} (TON)</div>
            <div class="pay-method" data-method="CryptoTransfer" data-currency="USDT" onclick="selectPayMethod('${product}', this)">${t('modal_pay_transfer') || 'Криптокошелек'} (USDT)</div>
            ${product !== 'stars' ? `<div class="pay-method" style="grid-column: span 2" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('${product}', this)">${t('modal_pay_stars')}</div>` : ''}
        </div>`;
}

window.openPaymentModal = function (product) {
    const targetStr = getApiTarget(product);
    if (!targetStr) {
        safeAlert(t('alert_check_target'));
        return;
    }

    let productName = '', usdPrice = 0, tonPrice = 0, targetDisplay = '';
    const mode = state[`${product}RecipientMode`];

    if (mode === 'self') targetDisplay = t('modal_target_self');
    else if (mode === 'other') targetDisplay = `@${state._validatedUsername[product]}`;
    else if (mode === 'cheque') {
        const hrs = getChequeHours(product);
        targetDisplay = hrs >= 8760 ? t('modal_target_cheque_inf') : t('modal_target_cheque', { hours: hrs });
    }

    if (product === 'stars') {
        const count = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount')?.value) || 0 : state.stars;
        if (count < 50) return safeAlert(t('alert_min_stars'));
        productName = `${count} Telegram Stars`;
        usdPrice = count * RATES.USD.perStar;
        tonPrice = usdPrice / getTonUsdRate();
    } else if (product === 'premium') {
        productName = `Telegram Premium ${state.premium} мес.`;
        tonPrice = PREMIUM_TON[state.premium];
        usdPrice = tonPrice * getTonUsdRate();
    }

    window._currentModalProduct = product;
    window._currentModalBaseUsd = usdPrice;
    window._currentModalBaseTon = tonPrice;

    const balNum = tonConnect.balance !== null ? parseFloat(tonConnect.balance) : 0;
    const isEnough = balNum >= tonPrice;

    if (mode === 'cheque' || isEnough) {
        state.pay[product] = { method: 'InternalWallet', currency: 'TON' };
    } else {
        state.pay[product] = { method: 'CryptoTransfer', currency: 'TON' };
    }

    const balIndicatorHtml = `
        <div class="modal-balance-top">
            <div class="mbt-left">
                <svg viewBox="0 0 56 56" fill="none" width="22" height="22"><path d="M28 4L4 18V38L28 52L52 38V18L28 4Z" fill="#0098EA"/><path d="M28 4L4 18L28 32L52 18L28 4Z" fill="#5BC3F5"/><path d="M28 32V52L52 38V18L28 32Z" fill="#A8DBF7"/><path d="M4 18V38L28 52V32L4 18Z" fill="#A8DBF7"/></svg>
                <span style="font-size: 13.5px; font-weight: 600; color: var(--text-secondary);">Ваш баланс:</span>
            </div>
            <span style="font-size: 16px; font-weight: 800; color: var(--text);">${balNum.toFixed(2)} TON</span>
        </div>`;

    const breakdownHtml = `
        <div id="paymentBreakdown" class="payment-breakdown">
            <div class="breakdown-row"><span>Товар:</span> <span id="bdProductPrice">0</span></div>
            <div class="breakdown-row" id="bdGasRow"><span>Комиссия сети (Gas):</span> <span id="bdGasFee">0</span></div>
            <div class="breakdown-divider"></div>
            <div class="breakdown-row total"><span>Итого:</span> <span id="bdTotal">0</span></div>
        </div>
    `;

    showModal(t('modal_order'), `
        ${balIndicatorHtml}
        <div class="page-${product}-theme" style="margin-top: 10px;">
            <div class="modal-info-row"><span class="modal-info-label">${t('modal_product')}</span><span class="modal-info-value" style="color:var(--${product}-primary)">${productName}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">${t('modal_recipient')}</span><span class="modal-info-value">${targetDisplay}</span></div>

            ${breakdownHtml}

            <label class="form-label" style="margin-bottom:8px;">${t('modal_pay_method')}</label>
            ${generatePaymentMethodsHtml(product, mode, tonPrice)}

            <button class="action-btn ${product}-action-btn" id="modalConfirmBtn" onclick="executePurchase('${product}')" style="width:100%; margin: 16px 0 0">${t('modal_confirm')}</button>
        </div>
    `);

    updateModalBreakdown();
}

window.executePurchase = async function (product) {
    const target = getApiTarget(product);
    const pm = state.pay[product].method;
    const pc = state.pay[product].currency;
    const btn = document.getElementById('modalConfirmBtn');

    if (pm === 'TelegramStars') {
        let starsCost = 0;
        let details = '';
        
        const gasFeeTon = window.sysConfig.gasFeeTon || 0.06;
        const gasUsd = gasFeeTon * getTonUsdRate();
        const gasStars = Math.ceil(gasUsd / RATES.USD.perStar);

        if (product === 'stars') {
            details = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount')?.value) : state.stars;
            const baseStars = details; 
            starsCost = baseStars + gasStars;
        } else if (product === 'premium') {
            details = state.premium;
            const usdPrice = details === 12 ? window.finalPrices.premium12 : (details === 6 ? window.finalPrices.premium6 : window.finalPrices.premium3);
            const baseStars = Math.ceil(usdPrice / RATES.USD.perStar);
            starsCost = baseStars + gasStars;
        }
        closeModal();
        return payWithTelegramStars(product, details, starsCost, target);
    }
    
    let endpoint = '';
    let payload = { telegramId, currency: pc, method: pm, targetUsername: target };
    let productName = '';

    if (product === 'stars') {
        endpoint = '/transactions/create/stars';
        payload.stars = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount')?.value) : state.stars;
        productName = `${payload.stars} Stars`;
    } else if (product === 'premium') {
        endpoint = '/transactions/create/premium';
        payload.months = state.premium;
        productName = `Premium ${payload.months} мес.`;
    }

    if (pm === 'InternalWallet') {
        closeModal();
        showTxLoading();
    } else {
        setLoading(btn, true);
    }

    const result = await apiCall(endpoint, payload);
    
    if (pm === 'InternalWallet') {
        if (result && result.Success) {
            if (result.TargetUsername && result.TargetUsername.startsWith('cheque_')) {
                const link = `https://t.me/${BOT_USERNAME}?start=chk_${result.TransactionId}`;
                const details = `<div class="cheque-link-input" style="user-select:all; padding:10px; background:var(--bg); border-radius:8px; word-break:break-all;">${link}</div>`;
                showTxResult(true, "Чек успешно создан!", `Новый чек на ${productName}`, details, () => switchTab('profile'));
            } else {
                showTxResult(true, "Оплата успешна!", `Вы приобрели ${productName}`, "");
            }
            fetchServerData();
            loadProfile();
        } else {
            showTxResult(false, "Ошибка оплаты", result?.Error || "Недостаточно средств на балансе", "");
        }
    } else {
        setLoading(btn, false);
        if (result && result.Success) { handleTxFlow(result); }
        else if (result) { safeAlert(t('loading') + ' ' + result.Error); }
    }
}

window.handleTxFlow = function(txData) {
    closeModal();

    if (txData.PaymentMethod === 'InternalWallet') {
        if (txData.TargetUsername && txData.TargetUsername.startsWith('cheque_')) {
            const link = `https://t.me/${BOT_USERNAME}?start=chk_${txData.TransactionId}`;
            showModal(t('cheque_created') || 'Чек создан', `
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">${t('cheque_desc') || 'Отправьте эту ссылку получателю.'}</p>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input">${link}</div>
                    <button class="cheque-copy-btn" onclick="copyChequeLink('${link}')">${t('cheque_copy') || 'Копировать'}</button>
                </div>
                <button class="action-btn outline-action-btn" onclick="closeModal(); fetchServerData(); loadProfile(); switchTab('profile');">${t('cheque_go_to') || 'В профиль'}</button>
            `);
        } else {
            safeAlert(t('alert_order_success') || 'Успешно оплачено!');
            fetchServerData();
            loadProfile();
        }
    } 
    else if (txData.PaymentMethod === 'TelegramStars') {
        if (window.sysConfig && window.sysConfig.isTestMode) {
            safeAlert(t('stars_test_ok') || 'Тестовая оплата прошла успешно!');
            fetchServerData();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            const invoiceUrl = txData.InvoiceLink || txData.PayUrl || txData.Url || txData.InvoiceUrl;
            
            if (invoiceUrl && tg.openInvoice) {
                tg.openInvoice(invoiceUrl, function(status) {
                    if (status === 'paid') {
                        showTxResult(true, "Оплата успешна!", "Звезды успешно списаны.", "", () => {
                            fetchServerData();
                            if (typeof loadProfile === 'function') loadProfile();
                            switchTab('profile');
                        });
                    } else if (status === 'failed') {
                        showTxResult(false, "Ошибка оплаты", "Оплата звездами не удалась.", "");
                    } else if (status === 'cancelled') {
                    }
                });
            } else {
                showModal(t('stars_invoice_title') || 'Счет выставлен', `
                    <div style="text-align:center; padding: 10px 0;">
                        <div style="font-size:44px; margin-bottom:12px;">⭐️</div>
                        <h3 style="margin-bottom:10px; color:var(--text)">${t('stars_invoice_sent') || 'Счет отправлен в бота'}</h3>
                        <p style="color:var(--text-secondary);font-size:14px; margin-bottom:20px;">${t('stars_invoice_desc') || 'Пожалуйста, закройте окно и оплатите счет в диалоге с ботом.'}</p>
                        <button class="action-btn stars-action-btn" onclick="tg.close()" style="width:100%;">${t('stars_close_webapp') || 'Закрыть и оплатить'}</button>
                    </div>
                `);
            }
        }
    } 
    else if (txData.PaymentMethod === 'CryptoTransfer') {
        let wallet = txData.PayWallet || window.sysConfig?.receivingWallet || '';
        let extraHtml = '';
        if (txData.PayLink) {
            extraHtml = `
                <button class="action-btn rent-action-btn" style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 0; height: 42px; background: #2481cc; color: white;" onclick="window.openSafeLink ? window.openSafeLink('${txData.PayLink}') : window.Telegram.WebApp.openLink('${txData.PayLink}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    Оплатить через Tonkeeper
                </button>
            `;
        }

        showModal(t('crypto_title') || 'Ожидается оплата', `
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px;text-align:center;">${t('crypto_desc') || 'Переведите по реквизитам ниже. Мы начнем обработку автоматически.'}</p>
            <div class="modal-info-row"><span class="modal-info-label">${t('crypto_amount') || 'Сумма'}</span><span class="modal-info-value" style="color:var(--rent-primary)">${txData.Amount} ${txData.Currency}</span></div>
            
            <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block; margin-top: 12px;">Адрес кошелька:</span>
            <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                <div class="cheque-link-input" style="font-size: 12px;">${wallet}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${wallet}'); typeof safeAlert === 'function' ? safeAlert('Адрес скопирован!') : alert('Скопировано');">Копировать</button>
            </div>

            <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Комментарий (ОБЯЗАТЕЛЬНО):</span>
            <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                <div class="cheque-link-input" style="font-weight: bold; color: var(--text); text-align: center;">${txData.PaymentCode || '—'}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${txData.PaymentCode || ''}'); typeof safeAlert === 'function' ? safeAlert('Комментарий скопирован!') : alert('Скопировано');">Копировать</button>
            </div>

            <div style="font-size:11.5px; color:#ff6b6b; text-align:center; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 8px; border: 1px solid rgba(255,107,107,0.2); margin-bottom:14px;">${t('crypto_warning') || 'Если вы не укажете комментарий, мы не сможем найти платеж!'}</div>
            
            ${extraHtml}
        `);
    } else {
        safeAlert(`Откройте бота, чтобы завершить оплату: ${txData.PaymentMethod}`);
    }
}

window.payWithTelegramStars = async function(product, details, starsAmount, target = "~") {
    if (typeof showTxLoading === 'function') showTxLoading(); 

    try {
        const res = await apiCall('/webapp/pay/stars/create', { 
            product: product, 
            details: details,
            amount: parseInt(starsAmount),
            target: target
        }, 'POST');

        if (res && res.Success && res.InvoiceUrl) {
            document.getElementById('txStatusModal').style.display = 'none';

            tg.openInvoice(res.InvoiceUrl, function(status) {
                if (status === 'paid') {
                    document.getElementById('txStatusModal').style.display = 'flex';
                    showTxResult(true, "Оплата успешна!", "Оплата звездами прошла успешно. Товар скоро будет выдан.", "", () => {
                        if (typeof loadProfile === 'function') loadProfile();
                        if (typeof fetchServerData === 'function') fetchServerData();
                        switchTab('profile'); 
                    });
                } else if (status === 'failed') {
                    document.getElementById('txStatusModal').style.display = 'flex';
                    showTxResult(false, "Ошибка оплаты", "Не удалось провести платеж звездами.", "");
                }
            });
        } else {
            document.getElementById('txStatusModal').style.display = 'flex';
            showTxResult(false, "Ошибка счета", res?.Error || 'Сервер не смог создать счет на оплату', "");
        }
    } catch (e) {
        document.getElementById('txStatusModal').style.display = 'flex';
        showTxResult(false, "Ошибка сети", "Не удалось связаться с сервером.", "");
    }
}


// --- wallet.js ---
// ============================================================
//  wallet.js — Пополнение и вывод TON-кошелька
// ============================================================

function updateTopupBtn() {
    const btn = document.getElementById('topupBtn');
    if (!btn) return;
    const amountStr = state.topupAmount > 0 ? ` ${state.topupAmount}` : '';
    const topupLabel = window.currentLang === 'en' ? 'Top Up' : 'Пополнить';
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> ${topupLabel}${amountStr} TON`;
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

window.updateTopupAmountInput = function(val) {
    state.useCustomTopup = true;
    state.topupAmount = parseFloat(val) || 0;
    updateTopupBtn();
}

window.apiTopupWallet = function () {
    let amount = state.useCustomTopup
        ? parseFloat(document.getElementById('topupAmount').value)
        : state.topupAmount;
    if (!amount || amount < 0.5) return safeAlert('Минимальная сумма пополнения: 0.5 TON');

    state.pay.topup = { method: 'CryptoTransfer', currency: 'TON' };
    
    window._currentModalProduct = 'topup';
    window._currentModalBaseTon = amount;
    window._currentModalBaseUsd = amount * getTonUsdRate();

    const breakdownHtml = `
        <div id="paymentBreakdown" class="payment-breakdown">
            <div class="breakdown-row"><span>Пополнение:</span> <span id="bdProductPrice">0</span></div>
            <div class="breakdown-row" id="bdGasRow" style="display:none;"><span>Комиссия сети (Gas):</span> <span id="bdGasFee">0</span></div>
            <div class="breakdown-divider"></div>
            <div class="breakdown-row total"><span>Итого:</span> <span id="bdTotal">0</span></div>
        </div>
    `;

    showModal(t('modal_topup_title'), `
        <div class="page-wallet-theme" style="margin-top: 10px;">
            <div class="modal-info-row"><span class="modal-info-label">${t('modal_topup_amount')}</span><span class="modal-info-value" id="modalTopupAmountValue" style="color:var(--wallet-primary)">${amount} TON</span></div>

            ${breakdownHtml}

            <label class="form-label" style="margin-bottom:8px;">${t('modal_pay_method') || 'Способ оплаты'}</label>
            <div class="payment-methods" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="pay-method selected" data-method="CryptoTransfer" data-currency="TON" onclick="selectPayMethod('topup', this)">TON</div>
                <div class="pay-method" data-method="CryptoTransfer" data-currency="USDT" onclick="selectPayMethod('topup', this)">USDT (TON)</div>
                <div class="pay-method" style="grid-column: span 2" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('topup', this)">Stars</div>
            </div>

            <button class="action-btn wallet-action-btn" id="modalConfirmBtn" onclick="executeTopup(${amount})" style="width:100%; margin: 16px 0 0">${t('modal_topup_btn')}</button>
        </div>
    `);
    
    updateModalBreakdown();
}

window.executeTopup = async function (amount) {
    const pm = state.pay.topup.method;
    const pc = state.pay.topup.currency;
    const btn = document.getElementById('modalConfirmBtn');

    if (pm === 'TelegramStars') {
        const baseUsd = amount * getTonUsdRate();
        const globalMarkup = window.sysConfig?.globalMarkupPercentage || 20;
        let markupUsd = baseUsd * (globalMarkup / 100);
        let subtotalUsd = baseUsd + markupUsd;
        let starsWithdrawalFeeUsd = subtotalUsd * 0.05;
        let finalUsd = subtotalUsd + starsWithdrawalFeeUsd;
        let totalStars = Math.ceil(finalUsd / 0.015);

        closeModal();
        return payWithTelegramStars('topup', amount.toString(), totalStars, telegramId.toString());
    }

    let passAmount = amount;
    if (pc === 'USDT') passAmount = amount * getTonUsdRate();

    setLoading(btn, true);
    const result = await apiCall('/transactions/create/topup', { telegramId, currency: pc, method: pm, amount: passAmount });
    setLoading(btn, false);

    if (result && result.Success) { handleTxFlow(result); }
    else if (result) { safeAlert(result.Error); }
}

async function apiWithdrawWallet() {
    const amountStr = document.getElementById('withdrawAmount').value;
    const address = document.getElementById('withdrawAddress').value.trim();
    if (!amountStr || !address) return safeAlert(t('alert_fill_fields'));
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0.5) return safeAlert('Минимальная сумма вывода: 0.5 TON');
    const result = await apiCall('/transactions/create/withdrawal', { telegramId, currency: 'TON', amount, targetAddress: address });
    if (result && result.Success) { safeAlert(t('alert_withdraw_ok')); fetchServerData(); }
    else if (result) safeAlert('Ошибка: ' + result.Error);
}

window.switchWalletTab = function(tabName, btn) {
    if (btn) {
        btn.closest('.profile-tabs').querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
    }
    
    document.getElementById('walletTopupPanel').style.display = tabName === 'topup' ? 'block' : 'none';
    document.getElementById('walletWithdrawPanel').style.display = tabName === 'withdraw' ? 'block' : 'none';
};

window._currentWithdrawMethod = 'ton';

window.selectWithdrawMethod = function(method, elem) {
    window._currentWithdrawMethod = method;
    
    const iconSpan = document.getElementById('withdrawMethodIcon');
    const labelSpan = document.getElementById('withdrawMethodLabel');
    const itemMenu = elem.closest('.sort-dd-menu');
    itemMenu.querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');
    
    if (method === 'ton') {
        iconSpan.textContent = '💎';
        labelSpan.textContent = 'На TON-кошелек';
    } else if (method === 'usdt') {
        iconSpan.textContent = '🟢';
        labelSpan.textContent = 'На USDT-кошелек';
    }

    elem.closest('.sort-dd-wrap').classList.remove('open');
    
    document.getElementById('withdrawTonWrap').style.display = method === 'ton' ? 'block' : 'none';
    document.getElementById('withdrawUsdtWrap').style.display = method === 'usdt' ? 'block' : 'none';
    
    const btnLabel = document.getElementById('withdrawBtnLabel');
    if (method === 'ton' || method === 'usdt') btnLabel.textContent = 'Вывести средства';
};

window.apiWithdrawCustom = async function() {
    const method = window._currentWithdrawMethod || 'ton';
    
    if (method === 'ton') {
        await apiWithdrawWallet();
    } else if (method === 'usdt') {
        const amountStr = document.getElementById('withdrawUsdtAmount').value;
        const address = document.getElementById('withdrawUsdtAddress').value.trim();
        if (!amountStr || !address) return safeAlert(t('alert_fill_fields'));
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 1) return safeAlert('Минимальная сумма вывода: 1 USDT');
        
        const btn = document.querySelector('#walletWithdrawPanel .action-btn');
        btn.disabled = true;
        
        const result = await apiCall('/transactions/create/withdrawal', { telegramId, currency: 'USDT', amount: amount, targetAddress: address });
        if (result && result.Success) {
            safeAlert('Заявка создана! Ожидайте зачисления.');
            document.getElementById('withdrawUsdtAmount').value = '';
            document.getElementById('withdrawUsdtAddress').value = '';
            fetchServerData();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            safeAlert('Ошибка: ' + (result ? result.Error : 'Неизвестная ошибка'));
        }
        btn.disabled = false;
        
    }
};

// --- api.js ---
// ============================================================
//  api.js — Получение данных с бэкенда: цены, баланс, init
// ============================================================

window.finalPrices = window.finalPrices || {
    star: 0.015, premium3: 3.99, premium6: 6.99, premium12: 11.99
};

async function fetchServerData() {
    const [config, balance] = await Promise.all([
        apiCall('/webapp/config/prices').catch(e => null),
        apiCall('/webapp/user/balance').catch(e => null)
    ]);
    
    if (config && config.Success) {
        window.sysConfig.isTestMode = config.IsTestMode;
        window.sysConfig.receivingWallet = config.ReceivingWalletAddress;
        
        window.sysConfig.gasFeeTon = config.BlockchainGasFeeTon || 0.06;

        RATES.USD.tonUsd = config.Rates.TonUsd;
        RATES.USD.starDeposit = config.Rates.StarDepositUsd; 

        window.finalPrices.star = config.FinalPricesUsd.Star;
        RATES.USD.perStar = config.FinalPricesUsd.Star; 
        
        PREMIUM_TON = {
            3: config.FinalPricesUsd.Premium3 / RATES.USD.tonUsd,
            6: config.FinalPricesUsd.Premium6 / RATES.USD.tonUsd,
            12: config.FinalPricesUsd.Premium12 / RATES.USD.tonUsd
        };

        const testBanner = document.getElementById('testModeBanner');
        if (testBanner) testBanner.style.display = window.sysConfig.isTestMode ? 'block' : 'none';

        updateAllPrices();
    }

    if (balance && balance.Success) {
        tonConnect.balance = balance.TonBalance;
        tonConnect.frozenBalance = balance.FrozenTonBalance;
        updateHomeBalances();
    }

    if (!window.currentRentOffers || window.currentRentOffers.length === 0) {
        switchRentCategory('gifts').catch(console.error);
    }
}

async function init() {
    const testUsername = 'alwys_online';
    const reqUsername = user.username || testUsername;

    try {
        const [initData] = await Promise.all([
            apiCall(`/webapp/init?username=${reqUsername}`).catch(e => null),
            fetchServerData()
        ]);
        
        if (initData && initData.Success) {
            window.finalPrices = {
                star: initData.FinalPricesUsd.Star,
                premium3: initData.FinalPricesUsd.Premium3,
                premium6: initData.FinalPricesUsd.Premium6,
                premium12: initData.FinalPricesUsd.Premium12
            };
            window.selfStatus = initData.User;
            
            ['premium', 'stars'].forEach(prod => {
                const isAvail = prod === 'premium' ? window.selfStatus.PremiumAvailable : window.selfStatus.StarsAvailable;
                if (!isAvail) {
                    const btnSelf = document.querySelector(`#${prod}RecipientTabs .rtab[data-mode="self"]`);
                    const btnOther = document.querySelector(`#${prod}RecipientTabs .rtab[data-mode="other"]`);
                    if (btnSelf && btnOther) {
                        btnSelf.disabled = true;
                        btnSelf.style.opacity = '0.4';
                        if (state[`${prod}RecipientMode`] === 'self') {
                            setRecipientMode(prod, 'other', btnOther);
                        }
                    }
                }
            });
        }
    } catch (e) { console.error("Ошибка инициализации:", e); }

    let firstName = 'Вы';
    if (window.selfStatus?.name && window.selfStatus.name.toLowerCase() !== reqUsername.toLowerCase()) {
        firstName = window.selfStatus.name;
    } else if (user?.first_name && user.first_name !== 'Test') {
        firstName = user.first_name;
    }

    const usernameDisplay = reqUsername ? `@${reqUsername}` : `id${telegramId}`;
    const photoUrl = window.selfStatus?.PhotoUrl;
    const avatarLetter = firstName[0]?.toUpperCase() || 'X';

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

    // Запускаем загрузку розыгрышей в фоне, не блокируя UI
    if (typeof window.fetchAllGiveaways === 'function') {
        window.fetchAllGiveaways();
    }

    if (window.currentLang && window.currentLang !== 'ru') {
        switchLang(window.currentLang);
    }

    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('gw_')) {
        const gwId = startParam.replace('gw_', '');
        setTimeout(() => openGiveawayJoin(gwId), 300); 
    }

    setInterval(() => {
        const timers = document.querySelectorAll('.countdown-timer');
        let needsRefresh = false;

        timers.forEach(timer => {
            let endsAtStr = timer.getAttribute('data-ends');
            if (!endsAtStr) return;
            
            if (!endsAtStr.endsWith('Z') && !endsAtStr.includes('+')) endsAtStr += 'Z';
            
            const endsAt = new Date(endsAtStr).getTime();
            const diff = endsAt - new Date().getTime();

            if (diff <= 0) {
                const timeoutText = timer.getAttribute('data-timeout-text') || "Отменено";
                timer.textContent = timeoutText;
                timer.style.cssText = '';
                timer.className = 'history-item-status status-cancelled'; 
                
                const historyRow = timer.closest('.history-item, .cheque-item');
                if (historyRow) {
                    const oldBadge = historyRow.querySelector('.status-pending');
                    if (oldBadge) {
                        oldBadge.remove();
                    }
                }
                needsRefresh = true;
            } else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                let str = '';
                if (d > 0) str += `${d}д `;
                str += `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                timer.textContent = str;
            }
        });

        if (needsRefresh) {
            if (typeof fetchServerData === 'function') fetchServerData();
            if (document.getElementById('gwTabParticipating')?.style.display === 'block' && typeof loadGiveawaysList === 'function') loadGiveawaysList('participating', false);
            if (document.getElementById('gwTabMy')?.style.display === 'block' && typeof loadGiveawaysList === 'function') loadGiveawaysList('my', false);
        }
    }, 1000);

    const loader = document.getElementById('appLoader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }

    let _txModalCloseCallback = null;

    window.showTxLoading = function() {
        const modal = document.getElementById('txStatusModal');
        if(!modal) return;
        document.getElementById('txLoadingState').style.display = 'block';
        document.getElementById('txResultState').style.display = 'none';
        modal.style.display = 'flex';
    }

    window.showTxResult = function(isSuccess, title, message, detailsHtml, onCloseCallback = null) {
        document.getElementById('txLoadingState').style.display = 'none';
        
        const lottiePlayer = document.getElementById('txLottiePlayer');
        const titleEl = document.getElementById('txResultTitle');
        const messageEl = document.getElementById('txResultMessage');
        const detailsEl = document.getElementById('txResultDetails');
        const closeBtn = document.getElementById('txStatusCloseBtn');

        if (isSuccess) {
            lottiePlayer.load("https://cdn.changes.tg/gifts/models/Victory%20Medal/lottie/Dealmaker.json");
            titleEl.style.color = 'var(--rent-primary)';
        } else {
            lottiePlayer.load("https://cdn.changes.tg/gifts/models/Input%20Key/lottie/End%20Game.json");
            titleEl.style.color = '#f07070';
        }

        titleEl.innerText = title;
        messageEl.innerText = message;
        
        if (detailsHtml) {
            detailsEl.innerHTML = detailsHtml;
            detailsEl.style.display = 'block';
        } else {
            detailsEl.style.display = 'none';
        }

        _txModalCloseCallback = onCloseCallback;
        
        closeBtn.onclick = () => {
            document.getElementById('txStatusModal').style.display = 'none';
            if (_txModalCloseCallback) _txModalCloseCallback(); 
        };

        document.getElementById('txResultState').style.display = 'block';
    }

    // =================================================================
//  ОБМЕННИК И БАЛАНС (Пополнение / Вывод)
// =================================================================

// Добавь это где-нибудь в начале или среди утилит в core.js
window.openSafeLink = function(url) {
    const tg = window.Telegram.WebApp;
    
    if (!url) return;

    if (url.startsWith('ton://')) {
        url = url.replace('ton://', 'https://app.tonkeeper.com/');
    }

    if (url.startsWith('https://app.tonkeeper.com')) {
        // Открывает внешний кошелек
        tg.openLink(url); 
    } else if (url.startsWith('https://t.me/')) {
        // Открывает системные ссылки Telegram (например, Wallet)
        tg.openTelegramLink(url); 
    } else {
        // Стандартный фоллбэк
        tg.openLink(url);
    }
};

function showQuickPayScreen(txData) {
    // Получаем контейнер твоего модального окна (замени ID на тот, что в index.html)
    const modalBody = document.getElementById('payment-modal-body') || document.getElementById('modal-content');
    
    if (!modalBody) {
        console.error("Не найден контейнер модального окна!");
        return;
    }

    // Рисуем красивый экран успешного создания с кнопкой
    modalBody.innerHTML = `
        <div class="quick-pay-container" style="text-align: center; padding: 20px;">
            <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
            <h3 style="margin-bottom: 5px;">Заявка создана</h3>
            <p style="color: var(--tg-theme-hint-color); font-size: 14px; margin-bottom: 20px;">
                Код: <b>${txData.PaymentCode}</b>
            </p>
            
            <div style="background: var(--tg-theme-secondary-bg-color); border-radius: 12px; padding: 15px; margin-bottom: 20px;">
                <span style="font-size: 14px; color: var(--tg-theme-hint-color);">К оплате:</span><br>
                <b style="font-size: 24px; color: var(--tg-theme-text-color);">${txData.Amount} ${txData.Currency}</b>
            </div>

            <button id="btn-quick-pay" class="main-button" style="width: 100%; padding: 12px; background: var(--tg-theme-button-color); color: var(--tg-theme-button-text-color); border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 15px;">
                💎 Оплатить в 1 клик
            </button>

            <p style="font-size: 12px; color: var(--tg-theme-hint-color); word-break: break-all;">
                Или переведите вручную на:<br>
                <span style="user-select: all; font-family: monospace;">${txData.PayWallet}</span>
            </p>
            
            <button id="btn-close-pay" style="margin-top: 10px; background: transparent; border: none; color: var(--tg-theme-link-color); font-weight: bold; cursor: pointer;">
                Закрыть
            </button>
        </div>
    `;

    // Вешаем обработчик на новую кнопку оплаты
    document.getElementById('btn-quick-pay').addEventListener('click', () => {
        openSafeLink(txData.PayLink); // Вызываем нашу безопасную функцию!
    });

    // Обработчик закрытия
    document.getElementById('btn-close-pay').addEventListener('click', () => {
        // Вызови свою функцию закрытия модалки
        if (typeof closeModal === 'function') closeModal(); 
        
        // Желательно также обновить историю/баланс, если юзер закрыл окно
        if (typeof loadHistory === 'function') loadHistory();
    });
}

window.openBalanceModal = function(initialTab = 'topup') {
    const content = `
        <div style="display:flex; background:var(--surface-3); border-radius:10px; padding:4px; margin-bottom:20px;">
            <div id="tabBtnTopup" onclick="switchBalanceTab('topup')" style="flex:1; text-align:center; padding:10px; font-size:14px; font-weight:700; cursor:pointer; border-radius:8px; transition: 0.2s;">Пополнение</div>
            <div id="tabBtnWithdraw" onclick="switchBalanceTab('withdraw')" style="flex:1; text-align:center; padding:10px; font-size:14px; font-weight:700; cursor:pointer; border-radius:8px; transition: 0.2s;">Продать</div>
        </div>

        <div id="balanceTabTopup" style="display: none;">
            <p style="color:var(--text-secondary); font-size:14px; margin-bottom:16px;">Пополните внутренний баланс для моментальных покупок. При пополнении в USDT они автоматически конвертируются в TON.</p>
            
            <label class="form-label">Валюта перевода</label>
            <select id="topupCurrency" class="form-input" style="width:100%; margin-bottom:16px; background:var(--surface-2);">
                <option value="TON">TON (Toncoin)</option>
                <option value="USDT">USDT (сеть TON) -> в TON</option>
            </select>

            <label class="form-label">Сумма к отправке</label>
            <input type="number" id="topupAmount" class="form-input" placeholder="Введите количество" style="width:100%; margin-bottom:16px;">
            
            <button class="action-btn" onclick="submitTopup()" style="width:100%; background: linear-gradient(135deg, #229ED9, #9b72f0); border:none;">Продолжить</button>
        </div>

        <div id="balanceTabWithdraw" style="display: none;">
            <label class="form-label">Что продаем?</label>
            <select id="withdrawCurrency" class="form-input" onchange="updateWithdrawUI()" style="width:100%; margin-bottom:16px; background:var(--surface-2);">
                <option value="Stars">Telegram Stars (⭐️)</option>
                <option value="TON">TON с баланса</option>
                <option value="USDT">USDT с баланса</option>
            </select>

            <label class="form-label">Количество для продажи</label>
            <input type="number" id="withdrawAmount" class="form-input" placeholder="Введите сумму" style="width:100%; margin-bottom:16px;" oninput="calcWithdrawEst()">

            <label class="form-label">Куда получаем выплату?</label>
            <select id="withdrawTarget" class="form-input" style="width:100%; margin-bottom:16px; background:var(--surface-2);">
                <option value="TON">На криптокошелек (TON)</option>
                <option value="USDT">На криптокошелек (USDT)</option>
            </select>

            <label class="form-label">Реквизиты</label>
            <input type="text" id="withdrawAddress" class="form-input" placeholder="Номер карты или адрес кошелька" style="width:100%; margin-bottom:12px;">

            <div style="background:var(--surface-2); border: 1px solid var(--border-strong); border-radius:10px; padding:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; color:var(--text-secondary);">Ожидаемая выплата:</span>
                <span id="withdrawEst" style="font-size:16px; font-weight:800; color:var(--text);">0.00</span>
            </div>

            <button class="action-btn" id="withdrawSubmitBtn" onclick="submitWithdraw()" style="width:100%; background: linear-gradient(135deg, #229ED9, #9b72f0); border:none;">Создать заявку</button>
        </div>
    `;
    showModal('Баланс и Обмен', content);
    switchBalanceTab(initialTab);
    updateWithdrawUI();
};

window.submitTopup = async function() {
    const amount = parseFloat(document.getElementById('topupAmount').value);
    const currency = document.getElementById('topupCurrency').value;

    if (!amount || amount <= 0) return safeAlert('Введите корректную сумму');

    const btn = document.querySelector('#balanceTabTopup button');
    const oldText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Создание заявки...';

    // Отправляем запрос на твой API (передаем выбранную валюту)
    const res = await apiCall(`/transactions/create/topup?amount=${amount}&currency=${currency}&method=CryptoTransfer`, 'GET');

    if (res && res.Success) {
        closeModal();
        
        // Формируем красивую инструкцию с реквизитами из бэкенда
        const detailsHtml = `
            <div style="text-align: center; margin-top: 10px;">
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Переведите <b>${res.Amount} ${res.Currency}</b> на адрес:</p>
                <div style="background: var(--bg); padding: 10px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 12px; color: var(--text); border: 1px solid var(--border-strong); margin-bottom: 12px;">
                    ${res.Address}
                </div>
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">ОБЯЗАТЕЛЬНЫЙ комментарий:</p>
                <div style="background: var(--bg); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 14px; font-weight: bold; color: var(--text); border: 1px solid var(--border-strong); margin-bottom: 16px;">
                    ${res.PaymentCode}
                </div>
                <button class="action-btn" style="width:100%;" onclick="tg.openTelegramLink('https://t.me/wallet?startattach=ton_transfer')">Открыть Wallet в Telegram</button>
            </div>
        `;

        showTxResult(true, 'Ожидание оплаты', res.Message || 'Пожалуйста, выполните перевод по реквизитам ниже.', detailsHtml);
    } else {
        safeAlert(res?.Error || 'Ошибка создания заявки на пополнение');
    }

    btn.disabled = false;
    btn.innerText = oldText;
};

window.switchBalanceTab = function(tab) {
    const isTopup = tab === 'topup';
    // Кнопки
    document.getElementById('tabBtnTopup').style.background = isTopup ? 'var(--surface)' : 'transparent';
    document.getElementById('tabBtnTopup').style.color = isTopup ? 'var(--text)' : 'var(--text-secondary)';
    document.getElementById('tabBtnWithdraw').style.background = !isTopup ? 'var(--surface)' : 'transparent';
    document.getElementById('tabBtnWithdraw').style.color = !isTopup ? 'var(--text)' : 'var(--text-secondary)';
    // Вкладки
    document.getElementById('balanceTabTopup').style.display = isTopup ? 'block' : 'none';
    document.getElementById('balanceTabWithdraw').style.display = !isTopup ? 'block' : 'none';
};

window.updateWithdrawUI = function() {
    const cur = document.getElementById('withdrawCurrency').value;
    const targetSelect = document.getElementById('withdrawTarget');
    
    // Если продаем крипту с баланса
    if (cur === 'Stars') {
        targetSelect.innerHTML = `
            <option value="TON">На криптокошелек (TON)</option>
            <option value="USDT">На криптокошелек (USDT)</option>
        `;
    } else {
        targetSelect.innerHTML = `
            <option value="TON">На криптокошелек (TON)</option>
            <option value="USDT">На криптокошелек (USDT)</option>
        `;
    }
    calcWithdrawEst();
};

window.calcWithdrawEst = function() {
    // Декоративный расчет на фронте (точные расчеты всегда на бэкенде)
    const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
    const cur = document.getElementById('withdrawCurrency').value;
    const target = document.getElementById('withdrawTarget').value;
    const estEl = document.getElementById('withdrawEst');
    
    const markup = 1 - ((window.sysConfig?.globalMarkupPercentage || 20) / 100);
    
    if (amount <= 0) { estEl.textContent = '0.00'; return; }

    if (cur === 'Stars' && target === 'USDT') {
        const usdVal = (amount * 0.013) * markup - 0.06;
        estEl.textContent = usdVal > 0 ? `≈ ${usdVal.toFixed(2)} USDT` : 'Слишком мало';
    } else if (cur === 'Stars' && target === 'TON') {
        // Упрощенная прикидка для фронта
        const usd = (amount * 0.013) * markup - 0.06; 
        estEl.textContent = usd > 0 ? `≈ ${(usd / (window.RATES?.USD?.tonUsd || 5)).toFixed(2)} TON` : 'Слишком мало';
    } else if (cur === 'TON' || cur === 'USDT') {
        estEl.textContent = `≈ Выплата в ${target}`;
    }
};

window.submitWithdraw = async function() {
    const currency = document.getElementById('withdrawCurrency').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const target = document.getElementById('withdrawTarget').value;
    const address = document.getElementById('withdrawAddress').value;

    if (!amount || amount <= 0) return safeAlert('Введите корректную сумму');
    if (!address) return safeAlert('Введите реквизиты');

    const btn = document.getElementById('withdrawSubmitBtn');
    btn.disabled = true;
    btn.innerText = 'Обработка...';

    if (currency === 'Stars') {
        // 1. ПРОДАЕМ ЗВЕЗДЫ (Создаем инвойс)
        const res = await apiCall('/webapp/pay/stars/create', 'POST', {
            product: 'sellstars',
            details: `${target}:${address}:${amount}` // Формат для бэкенда "ВАЛЮТА:РЕКВИЗИТЫ:СУММА"
        });

        if (res && res.Success && res.InvoiceLink) {
            closeModal();
            tg.openInvoice(res.InvoiceLink, (status) => {
                if (status === 'paid') {
                    showTxResult(true, 'Успешно!', 'Звезды оплачены. Ваша заявка на обмен создана и отправлена в обработку.');
                } else {
                    showTxResult(false, 'Отмена', 'Оплата отменена.');
                }
            });
        } else {
            safeAlert(res?.Error || 'Ошибка создания заявки');
        }
    } else {
        // 2. ПРОДАЕМ КРИПТУ С БАЛАНСА
        const res = await apiCall('/webapp/pay/crypto/sell', 'POST', {
            currency: currency,
            amount: amount,
            address: address
        });

        if (res && res.Success) {
            closeModal();
            showTxResult(true, 'Заявка создана!', res.Message || 'Криптовалюта списана с баланса, ожидайте перевода рублей.');
            if (typeof loadProfile === 'function') loadProfile(); // Обновляем баланс на экране
        } else {
            safeAlert(res?.Error || 'Ошибка обмена. Возможно, недостаточно средств на балансе.');
        }
    }
    
    btn.disabled = false;
    btn.innerText = 'Создать заявку';
};
}