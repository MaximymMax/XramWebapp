// ============================================================
//  profile.js — Профиль: история, чеки, аренда
// ============================================================

async function loadProfile() {
    const list = document.getElementById('historyList');
    if (list) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const data = await apiCall('/webapp/user/history');
    if (data && data.Success) {
        const txs = data.History || [];
        if (typeof renderServerHistory === 'function') renderServerHistory(txs);
        if (typeof renderServerCheques === 'function') renderServerCheques(txs.filter(h => h.IsCheque && !h.IsChequeActivated && h.Status === 'Completed'));
    }

    const rentData = await apiCall('/webapp/rent/my');
    if (rentData && rentData.Success) {
        let rentals = rentData.Rentals || [];
        
        // ФИКС: Подставляем ожидающую аренду в начало списка, пока блокчейн TON подтверждает транзакцию
        if (window.pendingRental) {
            if (!rentals.find(r => r.NftAddress === window.pendingRental.NftAddress)) {
                rentals.unshift(window.pendingRental);
            } else {
                window.pendingRental = null; // Сервер догнал, удаляем фантомку
            }
        }

        if (typeof renderServerRentals === 'function') renderServerRentals(rentals);
    }
}

function renderServerCheques(cheques) {
    const list = document.getElementById('chequesList');
    if (!list) return;
    if (!cheques.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активных чеков</p></div>`; return; }

    list.innerHTML = cheques.map(c => {
        let endsAtStr = c.ChequeExpiresAt;
        if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
        
        const exp = new Date(endsAtStr);
        const isExpired = exp < new Date();
        const expStr = isExpired ? 'Истек' : exp.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});

        let statusHtml = isExpired 
            ? `<span class="history-item-status status-failed">Истек</span>`
            : `<span class="history-item-status status-completed">Активен</span>`;

        return `
        <div class="history-item" style="opacity: ${isExpired ? 0.6 : 1}; cursor: pointer;" onclick="openChequeModal('${c.Id}', '${c.Amount}', '${expStr}', ${isExpired})">
            <div style="font-size: 20px; background: rgba(46, 204, 113, 0.15); border-radius: 10px; padding: 6px 10px; display:flex; align-items:center; justify-content:center;">🧾</div>
            <div class="history-item-left" style="flex:1; margin-left: 8px;">
                <div class="history-item-title">Чек на ${c.Amount} TON</div>
                <div class="history-item-meta">До: ${expStr}</div>
            </div>
            <div>${statusHtml}</div>
        </div>`;
    }).join('');
}

// ── Мои аренды (NFT) ─────────────────────────────────────────
function renderServerRentals(rentals) {
    const list = document.getElementById('rentalsList');
    if (!list) return;
    if (!rentals.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активной аренды</p></div>`; return; }

    list.innerHTML = rentals.map(r => {
        const isExpired = new Date((r.ExpiresAt.endsWith('Z') ? r.ExpiresAt : r.ExpiresAt + 'Z')).getTime() < Date.now();
        const address = r.NftAddress;
        const link = `https://t.me/nft/${address}`;
        const endsAt = new Date((r.ExpiresAt.endsWith('Z') ? r.ExpiresAt : r.ExpiresAt + 'Z')).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        let cleanImg = r.ImageUrl || '';
        if (cleanImg.includes(' [')) cleanImg = cleanImg.split(' [')[0].trim();
        try { cleanImg = decodeURIComponent(cleanImg); } catch(e) {}

        return `
        <div class="rent-card page-rent-theme" style="margin-bottom:12px; cursor:default; ${isExpired ? 'opacity:0.6' : ''}">
            <div style="position:relative">
                <img src="${cleanImg}" alt="NFT" style="width:100%; height:160px; object-fit:cover; border-radius: var(--r-md) var(--r-md) 0 0; background:var(--surface-3)">
                ${r.IsPending ? '<div style="position:absolute; top:8px; right:8px; background:var(--stars-primary); color:#000; font-size:11px; font-weight:700; padding:4px 8px; border-radius:8px;">⏳ Выдается...</div>' : ''}
                ${r.IsConnected && !r.IsPending ? '<div style="position:absolute; top:8px; right:8px; background:var(--rent-primary); color:#fff; font-size:11px; font-weight:700; padding:4px 8px; border-radius:8px;">✅ Установлен</div>' : ''}
            </div>
            <div class="rent-card-content" style="padding:12px">
                <div class="rent-card-name" style="font-size:16px; margin-bottom:4px">${r.Name}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px">Аренда до: <span style="color:var(--text); font-weight:600">${endsAt}</span></div>
                
                <div style="display:flex; gap:8px;">
                    <a href="${link}" target="_blank" class="action-btn outline-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; text-decoration:none; display:flex; justify-content:center; align-items:center;">🔗 Просмотр</a>
                    <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity: ${isExpired || r.IsPending ? '0.5' : '1'}" onclick="${isExpired || r.IsPending ? "safeAlert('NFT еще отправляется в блокчейне TON. Пожалуйста, подождите 10 секунд и обновите профиль для установки.')" : `openTonConnectModal('${address}')`}">${r.IsPending ? 'Выдается' : 'Установить'}</button>
                </div>
                ${isExpired && !r.IsPending ? '<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:12px">Срок аренды истек. Установка недоступна.</div>' : ''}
            </div>
        </div>`;
    }).join('');
}

// Модальное окно без лишних данных
window.openRentalModal = function(address, name, img, expStr, isExpired) {
    showModal('Аренда NFT', `
        <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:16px;">
            <img src="${img}" style="width:100px; height:100px; border-radius:16px; object-fit:cover; margin-bottom:12px; background:#2c2c2e; border: 1px solid rgba(255,255,255,0.05);" onerror="this.src='https://nft.fragment.com/number/8888888.webp'">
            <h3 style="margin:0; font-size:18px; color:var(--text); text-align:center;">${name}</h3>
        </div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity: ${isExpired ? '0.5' : '1'}" onclick="${isExpired ? '' : `openTonConnectModal('${address}')`}">${isExpired ? 'Истекло' : 'Установить'}</button>
        </div>
    `);
}

window.openChequeModal = function(id, amount, expStr, isExpired) {
    let link = `https://t.me/${BOT_USERNAME}?start=chk_${id}`;
    let linkHtml = isExpired ? '' : `
        <div style="margin:16px 0;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Ссылка для получателя:</div>
            <div style="display:flex; gap:8px;">
                <input type="text" class="form-input" value="${link}" readonly style="flex:1; font-size:12px; margin:0;" onclick="this.select()">
                <button class="action-btn rent-action-btn" style="margin:0; padding:0 16px;" onclick="copyToClipboard('${link}', this)">Копия</button>
            </div>
        </div>
    `;

    showModal('Детали чека', `
        <div style="text-align:center; font-size:40px; margin-bottom:10px;">🧾</div>
        <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="font-weight:700">${amount} TON</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        ${linkHtml}
        ${isExpired ? '<div style="color:#f07070; font-size:13px; text-align:center; margin-top:10px;">Срок действия чека истек.</div>' : ''}
    `);
}

// ── История транзакций ───────────────────────────────────────
function renderServerHistory(history) {
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!history.length) { list.innerHTML = `<div class="profile-empty"><p>История пуста</p></div>`; return; }

    list.innerHTML = history.map(tx => {
        const isTopUp = tx.Type === 'TopUp';
        const isWithdraw = tx.Type === 'Withdrawal';
        
        // ФИКС ЧАСОВОГО ПОЯСА
        let createdStr = tx.CreatedAt;
        if (createdStr && !createdStr.endsWith('Z')) createdStr += 'Z';
        const dateStr = new Date(createdStr).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});

        let title = isTopUp ? 'Пополнение' : isWithdraw ? 'Вывод' : 'Покупка';
        let productText = tx.Product === 'None' ? 'Баланс' : tx.Product;
        if (tx.IsCheque) productText = 'TON Чек';
        if (tx.IsGiveawayPrize) productText = 'Взнос за розыгрыш';

        let icon = isTopUp ? '↓' : isWithdraw ? '↑' : '🛒';
        let iconColor = isTopUp ? '#2ecc71' : isWithdraw ? '#e74c3c' : '#8a2be2';
        let iconBg = isTopUp ? 'rgba(46,204,113,0.15)' : isWithdraw ? 'rgba(231,76,60,0.15)' : 'rgba(138,43,226,0.15)';

        let statusClass = tx.Status === 'Completed' ? 'status-completed' : tx.Status === 'Failed' || tx.Status === 'Cancelled' ? 'status-failed' : 'status-pending';
        let statusText = tx.Status === 'Completed' ? 'Успешно' : tx.Status === 'Failed' ? 'Ошибка' : tx.Status === 'Cancelled' ? 'Отмена' : 'В процессе';

        let sign = isTopUp || tx.Status === 'Failed' || tx.Status === 'Cancelled' ? '' : '-';
        if (tx.Status === 'Failed' || tx.Status === 'Cancelled') sign = ''; 

        return `
        <div class="tx-item">
            <div class="tx-icon" style="background:${iconBg}; color:${iconColor};">${icon}</div>
            <div class="tx-info">
                <div class="tx-title">${title}: ${productText}</div>
                <div class="tx-date">${dateStr}</div>
            </div>
            <div class="tx-amount" style="display:flex; flex-direction:column; align-items:flex-end;">
                <span style="font-weight:700;">${sign}${tx.Amount} ${tx.Currency}</span>
                <span class="status-badge ${statusClass}" style="margin-top:4px;">${statusText}</span>
            </div>
        </div>`;
    }).join('');
}


window.openRentalModal = function(address, name, img, expStr, isExpired, status) {
    let link = `https://fragment.com/nft/${address}`;
    showModal('Аренда NFT', `
        <div style="text-align:center; margin-bottom:16px;">
            <img src="${img}" style="width:80px;height:80px;border-radius:20px;object-fit:cover; border:1px solid rgba(255,255,255,0.05);" onerror="this.src='https://nft.fragment.com/number/8888888.webp'">
        </div>
        <div class="modal-info-row"><span class="modal-info-label">Название</span><span class="modal-info-value" style="font-weight:700">${name}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value" style="font-weight:700">${status}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <a href="${link}" target="_blank" class="action-btn outline-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; text-decoration:none; display:flex; justify-content:center; align-items:center;">🔗 Просмотр</a>
            <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity: ${isExpired ? '0.5' : '1'}" onclick="${isExpired ? '' : `openTonConnectModal('${address}')`}">Установить</button>
        </div>
        ${isExpired ? '<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:12px">Срок аренды истек. Установка недоступна.</div>' : ''}
    `);
}

// ── Вкладки профиля ───────────────────────────────────────────
window.switchProfileTab = function(tab, btn) {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    // Скрываем родительские панели-обертки
    document.getElementById('profileHistory').style.display = 'none';
    document.getElementById('profileCheques').style.display = 'none';
    document.getElementById('profileRentals').style.display = 'none';

    // Формируем ID нужной панели (например, 'history' -> 'profileHistory')
    const panelId = 'profile' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const activePanel = document.getElementById(panelId);
    
    if (activePanel) {
        activePanel.style.display = 'block';
    }
}

if (document.getElementById('historyList')) loadProfile();