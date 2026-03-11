// ============================================================
//  profile.js — Профиль: история, чеки, аренда
// ============================================================

async function loadProfile() {
    const list = document.getElementById('historyList');
    if (list) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const data = await apiCall('/webapp/user/history');
    if (data && data.Success) {
        renderServerHistory(data.History);
        renderServerCheques(data.History.filter(h => h.IsCheque && !h.IsChequeActivated && h.Status === 'Completed'));
    }

    const rentData = await apiCall('/webapp/rent/my');
    if (rentData && rentData.Success) {
        renderServerRentals(rentData.Rentals);
    }
}

// ── Мои чеки ─────────────────────────────────────────────────
function renderServerCheques(cheques) {
    const list = document.getElementById('chequesList');
    if (!list) return;
    if (!cheques.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активных чеков</p></div>`; return; }

    list.innerHTML = cheques.map(c => {
        const exp = c.ChequeExpiresAt ? new Date(c.ChequeExpiresAt).toLocaleDateString('ru-RU') : 'Бессрочно';
        const link = `https://t.me/${BOT_USERNAME}?start=chk_${c.Id}`;
        return `<div class="cheque-item" style="flex-direction:column; align-items:stretch;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                <div class="cheque-item-left">
                    <span class="cheque-item-title">${c.Product} · ${c.Amount} ${c.Currency}</span>
                    <span class="cheque-item-meta">Код: ${c.PaymentCode} · До: ${exp}</span>
                </div>
                <button class="cheque-item-deact" onclick="deactivateCheque('${c.Id}')">Отменить</button>
            </div>
            <div class="cheque-link-wrap">
                <div class="cheque-link-input">${link}</div>
                <button class="cheque-copy-btn" onclick="copyChequeLink('${link}')">Копировать</button>
            </div>
        </div>`;
    }).join('');
}

window.copyChequeLink = function(link) {
    try {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(link).then(() => safeAlert('Ссылка скопирована!')).catch(() => safeAlert('Ошибка копирования.'));
        } else {
            const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select();
            document.execCommand('copy'); document.body.removeChild(t);
            safeAlert('Ссылка скопирована!');
        }
    } catch (err) { safeAlert('Ошибка копирования.'); }
}

window.deactivateCheque = async function(txId) {
    safeConfirm('Деактивировать этот чек? Зарезервированные средства вернутся на баланс.', async (ok) => {
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/transactions/${txId}/cancel`, { method: 'POST', headers: { 'Authorization': authHeader } });
            const data = await res.json();
            if (data?.Success) {
                safeAlert(data.Message || 'Чек отменен. Средства разморожены.');
                loadProfile(); fetchServerData();
            } else {
                safeAlert('Ошибка отмены: ' + (data?.Error || data?.Message || 'Неизвестная ошибка'));
            }
        } catch (e) { safeAlert('Ошибка соединения с сервером.'); }
    });
}

// ── Моя аренда ───────────────────────────────────────────────
function renderServerRentals(rentals) {
    window.currentRentals = rentals;
    const list = document.getElementById('rentalsList');
    if (!list) return;
    if (!rentals.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активной аренды</p></div>`; return; }

    list.innerHTML = rentals.map(r => {
        const exp = new Date(r.ExpiresAt);
        const isExpired = exp < new Date();
        const expText = exp.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

        return `<div class="history-item page-rent-theme" style="flex-direction:column; align-items:stretch; padding: 14px; gap: 14px; cursor:pointer;" onclick="showRentalDetails('${r.Id}')">
            <div style="display:flex; gap:14px; align-items:center;">
                <img src="${r.ImageUrl}" style="width:54px;height:54px;border-radius:12px;object-fit:cover;background:var(--surface-3)" onerror="this.src='https://nft.fragment.com/username/telegram.webp'">
                <div style="min-width:0; flex:1">
                    <div style="font-weight:800; font-size:15px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${r.Name}</div>
                    <div style="color:${isExpired ? '#f07070' : 'var(--text-secondary)'}; font-weight:600; font-size:12px; margin-top:4px;">
                        ${isExpired ? 'Истекла: ' + expText : 'Активно до: ' + expText}
                    </div>
                </div>
                <div style="color:var(--text-secondary)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.showRentalDetails = function(id) {
    const r = window.currentRentals.find(x => x.Id === id);
    if (!r) return;

    const exp = new Date(r.ExpiresAt);
    const isExpired = exp < new Date();
    const expStr = exp.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const status = isExpired ? '<span style="color:#f07070">🔴 Истекла</span>' : '<span style="color:#4caf50">🟢 Активна</span>';
    const catName = r.Category === 'gifts' ? 'Подарок' : (r.Category === 'usernames' ? 'Юзернейм' : 'Номер');

    let link = 'https://fragment.com/';
    if (r.Category === 'usernames') link = `https://t.me/${r.Name.replace('@', '')}`;
    else if (r.Category === 'numbers') link = `https://fragment.com/number/${r.Name.replace('+', '')}`;

    showModal('Детали аренды', `
        <div style="text-align:center; margin-bottom: 20px;">
            <img src="${r.ImageUrl}" style="width:100px;height:100px;border-radius:16px;object-fit:cover;background:var(--surface-3);margin-bottom:12px;" onerror="this.src='https://nft.fragment.com/username/telegram.webp'">
            <div style="font-size:20px; font-weight:800; color:var(--text)">${r.Name}</div>
            <div style="font-size:13px; font-weight:600; color:var(--text-secondary); margin-top:6px;">NFT ${catName}</div>
        </div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value" style="font-weight:700">${status}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <a href="${link}" target="_blank" class="action-btn outline-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; text-decoration:none; display:flex; justify-content:center; align-items:center;">🔗 Просмотр</a>
            <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity: ${isExpired ? '0.5' : '1'}" onclick="${isExpired ? '' : `openTonConnectModal('${r.NftAddress}')`}">Установить</button>
        </div>
        ${isExpired ? '<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:12px">Срок аренды истек. Установка недоступна.</div>' : ''}
    `);
}

// ── Вкладки профиля ───────────────────────────────────────────
window.switchProfileTab = function(tab, btn) {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('profileCheques').style.display = tab === 'cheques' ? 'block' : 'none';
    document.getElementById('profileHistory').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('profileRentals').style.display = tab === 'rentals' ? 'block' : 'none';
}
