// ============================================================
//  stars.js — Страница Telegram Stars
// ============================================================

function updateStarsBtn() {
    const btn = document.getElementById('starsBuyBtn');
    if (!btn) return;
    const count = state.starsCustom ? (parseInt(document.getElementById('starsCustomAmount')?.value) || 50) : state.stars;
    const isCheque = state.starsRecipientMode === 'cheque';
    const icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const chequeIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>`;
    const priceStr = formatUsdPrice(count * RATES.USD.perStar);
    btn.innerHTML = isCheque
        ? `${chequeIcon} Создать чек · ${count} Stars · ${priceStr}`
        : `${icon} Купить ${count} Stars · ${priceStr}`;
}

function updateStarsCustomPrice() {
    const priceEl = document.getElementById('price-stars-custom');
    const amountEl = document.getElementById('starsCustomAmount');
    if (!priceEl) return;
    const count = parseInt(amountEl?.value) || 0;
    priceEl.textContent = count >= 50 ? formatUsdPrice(count * RATES.USD.perStar) : '—';
}

function toggleCustomStars(element) {
    state.starsCustom = true;
    const container = element.closest('.packages-list');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('customStarsWrapper').style.display = 'block';
    document.getElementById('starsCustomAmount').oninput = () => { updateStarsCustomPrice(); updateStarsBtn(); };
}

// ── Модальное окно Stars (упрощённое) ────────────────────────
window.openStarsModal = function(defaultStars = 100) {
    state.pay.stars = { method: 'InternalWallet', currency: 'TON' };
    state.target = window.selfStatus?.StarsAvailable ? 'self' : 'other';

    showModal('Telegram Stars', `
        <div class="page-stars-theme">
            <div id="modalTargetContainer">${renderTargetSection('stars')}</div>

            <label class="form-label">Количество звёзд</label>
            <input type="number" id="modalStarsAmount" class="form-input" value="${defaultStars}" min="50" step="50" oninput="updateStarsModalPrice()">

            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">Итого:</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)" id="modalStarsTotalUsd">$0.00</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)" id="modalStarsTotalAlt">(≈ 0.00 TON)</div>
                </div>
            </div>

            <label class="form-label">Способ оплаты</label>
            <div id="starsMethodsContainer"></div>
            <button class="action-btn stars-action-btn" id="modalStarsBtn" onclick="apiBuyStars()" style="width:100%; margin: 16px 0 0">Оплатить</button>
        </div>
    `);

    if (state.target === 'other') document.getElementById('modalStarsBtn').disabled = true;
    updateStarsModalPrice();
}

window.updateStarsModalPrice = function() {
    const input = document.getElementById('modalStarsAmount');
    let stars = parseInt(input?.value);
    if (isNaN(stars) || stars < 50) stars = 50;

    const usdPrice = stars * (window.finalPrices?.star || RATES.USD.perStar);
    const tonPrice = usdPrice / getTonUsdRate();

    document.getElementById('modalStarsTotalUsd').textContent = `$${usdPrice.toFixed(2)}`;
    document.getElementById('modalStarsTotalAlt').textContent = `(≈ ${tonPrice.toFixed(2)} TON)`;
    document.getElementById('starsMethodsContainer').innerHTML = generatePaymentMethodsHtml('stars', state.target);
}

// generatePaymentMethodsHtml определён в payment.js
