// ============================================================
//  profile.js — Профиль: история, чеки, аренда
// ============================================================

async function loadProfile() {
    const list = document.getElementById('historyList');
    if (list) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const data = await apiCall('/webapp/user/history');
    if (data && data.Success) {
        // ИСПРАВЛЕНИЕ: Бэкенд возвращает Transactions, а не History!
        const txs = data.Transactions || [];
        
        if (typeof renderServerHistory === 'function') renderServerHistory(txs);
        if (typeof renderServerCheques === 'function') renderServerCheques(txs.filter(h => h.IsCheque && !h.IsChequeActivated && h.Status === 'Completed'));
    }

    const rentData = await apiCall('/webapp/rent/my');
    if (rentData && rentData.Success) {
        if (typeof renderServerRentals === 'function') renderServerRentals(rentData.Rentals || []);
    }
}

// ── Мои чеки ─────────────────────────────────────────────────
function renderServerCheques(cheques) {
    const list = document.getElementById('chequesList');
    if (!list) return;
    if (!cheques.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активных чеков</p></div>`; return; }

    list.innerHTML = cheques.map(c => {
        // ФИКС ЧАСОВОГО ПОЯСА
        let endsAtStr = c.ChequeExpiresAt;
        if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
        
        const exp = new Date(endsAtStr);
        const isExpired = exp < new Date();
        const expStr = isExpired ? 'Истек' : exp.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});

        let statusHtml = isExpired 
            ? `<span class="status-badge status-failed">Истек</span>`
            : `<span class="status-badge status-completed">Активен</span>`;

        return `
        <div class="tx-item" style="opacity: ${isExpired ? 0.6 : 1}; cursor: pointer;" onclick="openChequeModal('${c.Id}', '${c.Amount}', '${expStr}', ${isExpired})">
            <div class="tx-icon" style="background: rgba(46, 204, 113, 0.15); color: #2ecc71;">🧾</div>
            <div class="tx-info">
                <div class="tx-title">Чек на ${c.Amount} TON</div>
                <div class="tx-date">До: ${expStr}</div>
            </div>
            <div class="tx-amount">${statusHtml}</div>
        </div>`;
    }).join('');
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

// ── Мои аренды (NFT) ─────────────────────────────────────────
function renderServerRentals(rentals) {
    const list = document.getElementById('rentalsList');
    if (!list) return;
    if (!rentals || !rentals.length) { list.innerHTML = `<div class="profile-empty"><p>У вас пока нет арендованных NFT</p></div>`; return; }

    list.innerHTML = rentals.map(r => {
        let img = r.ImageUrl;
        
        // 1. ИСПРАВЛЕНИЕ: Раскодируем URL, если он пришел закодированным (%3A%2F%2F -> ://)
        if (img && img !== 'null' && img !== 'undefined') {
            try { img = decodeURIComponent(img); } catch(e) {}
        }
        
        // 2. Если картинки всё равно нет или она битая, собираем её правильно (например, plushpepe-1821)
        if (!img || img === 'null' || img === 'undefined' || !img.startsWith('http')) {
            let rawName = r.Name || '';
            if (r.Category === 'usernames') {
                let safeName = rawName.toLowerCase().replace('.t.me', '').replace('@', '').trim();
                img = `https://nft.fragment.com/username/${safeName}.webp`;
            } else if (r.Category === 'numbers') {
                let safeName = rawName.replace('+888', '').replace(/[\s-]/g, '').trim();
                img = `https://nft.fragment.com/number/${safeName}.webp`;
            } else {
                // Убираем только пробелы, дефисы и апострофы, заглавные буквы не трогаем
                let safeName = rawName.replace(/[\s\-']/g, '');
                img = `https://nft.fragment.com/gift/${safeName}.medium.jpg`;
            }
        }

        let name = r.Name || 'NFT';
        
        // ФИКС ЧАСОВОГО ПОЯСА
        let endsAtStr = r.ExpiresAt;
        if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';

        const exp = new Date(endsAtStr);
        const isExpired = exp < new Date();
        const expStr = exp.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
        
        let statusClass = isExpired ? 'status-failed' : r.IsConnected ? 'status-completed' : 'status-pending';
        let statusText = isExpired ? 'Истек' : r.IsConnected ? 'Установлен' : 'Ожидает';

        return `
        <div class="tx-item" style="opacity: ${isExpired ? 0.6 : 1}; cursor:pointer;" onclick="openRentalModal('${r.NftAddress}', '${name}', '${img}', '${expStr}', ${isExpired}, '${statusText}')">
            <img src="${img}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;background:#2c2c2e; border:1px solid rgba(255,255,255,0.05);" onerror="this.src='https://nft.fragment.com/number/8888888.webp'">
            <div class="tx-info" style="margin-left:12px;">
                <div class="tx-title" style="font-weight:600">${name}</div>
                <div class="tx-date">До: ${expStr}</div>
            </div>
            <div class="tx-amount"><span class="status-badge ${statusClass}">${statusText}</span></div>
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