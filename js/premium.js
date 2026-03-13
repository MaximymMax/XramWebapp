// ============================================================
//  premium.js — Страница Telegram Premium
// ============================================================

function updatePremiumBtn() {
    const btn = document.getElementById('premiumBuyBtn');
    if (!btn) return;
    const m = state.premium;
    const isCheque = state.premiumRecipientMode === 'cheque';
    const icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const chequeIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>`;
    const priceStr = formatTonPrice(PREMIUM_TON[m]);
    const createChequeLabel = window.currentLang === 'en' ? 'Create cheque' : 'Создать чек';
    const buyLabel = window.currentLang === 'en' ? 'Buy' : 'Купить';
    const moLabel = window.currentLang === 'en' ? 'mo' : 'мес';
    btn.innerHTML = isCheque
        ? `${chequeIcon} ${createChequeLabel} · Premium ${m} ${moLabel} · ${priceStr}`
        : `${icon} ${buyLabel} Premium ${m} ${moLabel} · ${priceStr}`;
}

// ── Модальное окно Premium ────────────────────────────────────
window.openPremiumModal = function(months) {
    state.premium = months;
    state.pay.premium = { method: 'InternalWallet', currency: 'TON' };
    state.target = window.selfStatus?.PremiumAvailable ? 'self' : 'other';

    showModal('Telegram Premium', `
        <div class="page-premium-theme">
            <div id="modalTargetContainer">${renderTargetSection('premium')}</div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">Итого (${months} мес.):</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)" id="modalPremiumTotalUsd">$0.00</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)" id="modalPremiumTotalAlt">(≈ 0.00 TON)</div>
                </div>
            </div>

            <label class="form-label">Способ оплаты</label>
            <div id="premiumMethodsContainer"></div>
            <button class="action-btn premium-action-btn" id="modalPremiumBtn" onclick="apiBuyPremium(${months})" style="width:100%; margin: 16px 0 0">Оплатить</button>
        </div>
    `);

    if (state.target === 'other') document.getElementById('modalPremiumBtn').disabled = true;
    updatePremiumModalPrice(months);
}

window.updatePremiumModalPrice = function(months) {
    let usdPrice = window.finalPrices?.premium3 || 0;
    if (months === 6) usdPrice = window.finalPrices?.premium6 || 0;
    if (months === 12) usdPrice = window.finalPrices?.premium12 || 0;

    const tonPrice = usdPrice / getTonUsdRate();

    document.getElementById('modalPremiumTotalUsd').textContent = `$${usdPrice.toFixed(2)}`;
    document.getElementById('modalPremiumTotalAlt').textContent = `(≈ ${tonPrice.toFixed(2)} TON)`;
    document.getElementById('premiumMethodsContainer').innerHTML = generatePaymentMethodsHtml('premium', state.target);
}
