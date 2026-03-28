// ============================================================
//  profile.js — Профиль: история, чеки, аренда
// ============================================================

async function loadProfile() {
    const list = document.getElementById('historyList');
    if (list) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const data = await apiCall('/webapp/user/history');
    if (data && data.Success) {
        const txs = data.History || [];
        renderServerHistory(txs);
        renderServerCheques(txs.filter(h => h.IsCheque && !h.IsChequeActivated && h.Status === 'Completed'));
    }

    const rentData = await apiCall('/webapp/rent/my');
    if (rentData && rentData.Success) {
        let rentals = rentData.Rentals || [];

        // ФИКС: Подставляем ожидающую аренду в начало списка
        if (window.pendingRental) {
            if (!rentals.find(r => r.NftAddress === window.pendingRental.NftAddress)) {
                rentals.unshift(window.pendingRental);
            } else {
                window.pendingRental = null;
            }
        }

        renderServerRentals(rentals);
    }
}

// ── Получить правильный URL картинки для NFT с Fragment ───────
function getFragmentNftImage(rental) {
    const cat = rental.Category || '';
    const name = rental.Name || '';

    if (cat === 'usernames') {
        // Username: убираем @ и берём без расширения
        const clean = name.replace(/^@/, '').trim().toLowerCase();
        return `https://nft.fragment.com/username/${clean}.webp`;
    }
    if (cat === 'numbers') {
        // Номер телефона: убираем +, пробелы и берём только цифры
        const clean = name.replace(/[^0-9]/g, '');
        return `https://nft.fragment.com/number/${clean}.webp`;
    }
    if (cat === 'gifts' && name.includes('#')) {
        // Подарок: формат "Name #12345"
        const parts = name.split('#');
        const baseName = parts[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const num = parts[1].trim();
        return `https://nft.fragment.com/gift/${baseName}-${num}.medium.jpg`;
    }
    // Fallback — берём из ImageUrl напрямую
    let img = rental.ImageUrl || '';
    if (img.includes(' [')) img = img.split(' [')[0].trim();
    try { img = decodeURIComponent(img); } catch (e) {}
    return img;
}

// ── Мои аренды (NFT) ─────────────────────────────────────────
function renderServerRentals(rentals) {
    const list = document.getElementById('rentalsList');
    if (!list) return;

    // --- ФИЛЬТРАЦИЯ: Отсекаем истекшую аренду (оставляем только активные или выдающиеся) ---
    const now = Date.now();
    rentals = rentals.filter(r => {
        let expiresStr = r.ExpiresAt ? (r.ExpiresAt.endsWith('Z') ? r.ExpiresAt : r.ExpiresAt + 'Z') : new Date().toISOString();
        return new Date(expiresStr).getTime() > now || r.IsPending;
    });
    // ----------------------------------------------------------------------------------------

    if (!rentals.length) {
        list.innerHTML = `<div class="profile-empty"><p>Нет активной аренды</p></div>`;
        return;
    }

    // Сохраняем для модалки
    window.currentRentals = rentals;

    list.innerHTML = rentals.map((r, idx) => {
        const expiresStr = r.ExpiresAt ? (r.ExpiresAt.endsWith('Z') ? r.ExpiresAt : r.ExpiresAt + 'Z') : new Date().toISOString();
        const isExpired = new Date(expiresStr).getTime() < Date.now();
        const endsAt = new Date(expiresStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        const imgUrl = getFragmentNftImage(r);
        const cat = r.Category || '';

        // Для username/number — показываем градиентный блок вместо картинки
        let visualHtml;
        if (cat === 'usernames' || cat === 'numbers') {
            visualHtml = `<div class="rental-card-gradient">${r.Name}</div>`;
        } else {
            visualHtml = `<img src="${imgUrl}" class="rental-card-img" alt="NFT" onerror="this.src=''; this.style.display='none';">`;
        }

        let statusBadge = '';
        if (r.IsPending) {
            statusBadge = `<span class="rental-badge rental-badge-pending">⏳ Выдаётся</span>`;
        } else if (r.IsConnected) {
            statusBadge = `<span class="rental-badge rental-badge-active">✅ Активен</span>`;
        } else if (isExpired) {
            statusBadge = `<span class="rental-badge rental-badge-expired">Истёк</span>`;
        }

        return `
        <div class="rental-card" onclick="openRentalModal(${idx})" style="opacity:${isExpired ? 0.6 : 1}">
            <div class="rental-card-visual">
                ${visualHtml}
                ${statusBadge ? `<div class="rental-badge-wrap">${statusBadge}</div>` : ''}
            </div>
            <div class="rental-card-info">
                <div class="rental-card-name">${r.Name}</div>
                <div class="rental-card-date">До: <b>${endsAt}</b></div>
                <div class="rental-card-actions">
                    <a href="https://t.me/nft/${r.NftAddress}" target="_blank" class="action-btn outline-action-btn rental-btn">🔗</a>
                    <button class="action-btn rent-action-btn rental-btn"
                        style="opacity:${isExpired || r.IsPending ? 0.45 : 1}"
                        onclick="event.stopPropagation(); ${isExpired || r.IsPending ? "safeAlert('NFT ещё отправляется. Подождите и обновите профиль.')" : `openTonConnectModal('${r.NftAddress}')`}">
                        ${r.IsPending ? 'Выдаётся' : 'Установить'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Открываем детали аренды в красивой модалке
window.openRentalModal = function(idx) {
    const r = (window.currentRentals || [])[idx];
    if (!r) return;

    const expiresStr = r.ExpiresAt ? (r.ExpiresAt.endsWith('Z') ? r.ExpiresAt : r.ExpiresAt + 'Z') : new Date().toISOString();
    const isExpired = new Date(expiresStr).getTime() < Date.now();
    const expStr = new Date(expiresStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    const imgUrl = getFragmentNftImage(r);
    const cat = r.Category || '';
    const fragmentLink = cat === 'usernames'
        ? `https://fragment.com/username/${r.Name.replace('@', '')}`
        : cat === 'numbers'
            ? `https://fragment.com/number/${r.Name.replace(/[^0-9]/g, '')}`
            : `https://fragment.com/nft/${r.NftAddress}`;

    let visualContent;
    if (cat === 'usernames' || cat === 'numbers') {
        visualContent = `<div style="width:90px;height:90px;border-radius:20px;background:linear-gradient(135deg,#2AABEE,#229ED9);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;padding:6px;word-break:break-all;text-align:center;">${r.Name}</div>`;
    } else {
        visualContent = `<img src="${imgUrl}" style="width:90px;height:90px;border-radius:20px;object-fit:cover;background:var(--surface-3);" onerror="this.src=''; this.style.display='none';">`;
    }

    let statusText = 'Активна';
    if (r.IsPending) statusText = '⏳ Выдаётся...';
    else if (r.IsConnected) statusText = '✅ Установлена';
    else if (isExpired) statusText = '❌ Истекла';

    showModal('Детали аренды', `
        <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:18px;">
            ${visualContent}
            <h3 style="margin:10px 0 0; font-size:18px; color:var(--text); text-align:center;">${r.Name}</h3>
        </div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value">${statusText}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        <div style="display:flex; gap:10px; margin-top:18px;">
            <a href="${fragmentLink}" target="_blank" class="action-btn outline-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; text-decoration:none; display:flex; justify-content:center; align-items:center;">🔗 Fragment</a>
            <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity:${isExpired || r.IsPending ? 0.45 : 1}" onclick="${isExpired || r.IsPending ? '' : `openTonConnectModal('${r.NftAddress}')`}">
                ${r.IsPending ? 'Выдаётся' : isExpired ? 'Истекла' : 'Установить'}
            </button>
        </div>
    `);
};

// ── Чеки ─────────────────────────────────────────────────────
function renderServerCheques(cheques) {
    const list = document.getElementById('chequesList');
    if (!list) return;
    if (!cheques.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активных чеков</p></div>`; return; }

    list.innerHTML = cheques.map(c => {
        let endsAtStr = c.ChequeExpiresAt;
        if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';

        const exp = new Date(endsAtStr);
        const isExpired = exp < new Date();
        const expStr = isExpired ? 'Истёк' : exp.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        let statusHtml = isExpired
            ? `<span class="history-item-status status-failed">Истёк</span>`
            : `<span class="history-item-status status-completed">Активен</span>`;

        return `
        <div class="history-item" style="opacity:${isExpired ? 0.6 : 1}; cursor:pointer;" onclick="openChequeModal('${c.Id}', '${c.Amount}', '${expStr}', ${isExpired})">
            <div style="font-size:20px; background:rgba(46,204,113,0.12); border-radius:10px; padding:6px 10px; display:flex; align-items:center;">🧾</div>
            <div class="history-item-left" style="flex:1">
                <div class="history-item-title">Чек на ${c.Amount} TON</div>
                <div class="history-item-meta">До: ${expStr}</div>
            </div>
            <div>${statusHtml}</div>
        </div>`;
    }).join('');
}

// ── История транзакций ───────────────────────────────────────
// ── История транзакций ───────────────────────────────────────
function renderServerHistory(history) {
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!history.length) { list.innerHTML = `<div class="profile-empty"><p>История пуста</p></div>`; return; }

    window.currentHistory = history;

    const statusLabel = { Pending: 'В процессе', Completed: 'Успешно', Failed: 'Ошибка', Cancelled: 'Отмена', Processing: 'В обработке' };
    const statusClass = { Pending: 'status-pending', Completed: 'status-completed', Failed: 'status-failed', Cancelled: 'status-failed', Processing: 'status-pending' };

    list.innerHTML = history.map(tx => {
        const isTopUp = tx.Type === 'TopUp';
        const isWithdraw = tx.Type === 'Withdrawal';

        let createdStr = tx.CreatedAt;
        if (createdStr && !createdStr.endsWith('Z')) createdStr += 'Z';
        const dateStr = new Date(createdStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        let timerHtml = '';
        if (tx.Status === 'Pending' || tx.Status === 'Processing') {
            let expiresStr = tx.ExpiresAt || tx.ValidUntil;
            if (!expiresStr) {
                let created = new Date(createdStr);
                created.setHours(created.getHours() + 1);
                expiresStr = created.toISOString();
            } else if (!expiresStr.endsWith('Z')) {
                expiresStr += 'Z';
            }
            timerHtml = `<div style="font-size:11px; margin-top:4px; color:var(--rent-primary); font-weight:600; display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="countdown-timer" data-ends="${expiresStr}" data-timeout-text="Время вышло">Осталось: Загрузка...</span>
            </div>`;
        }

       let title = isTopUp ? 'Пополнение' : isWithdraw ? 'Вывод' : 'Покупка';
        let productText = tx.Product === 'None' ? 'Баланс' : (tx.Product || '');
        if (tx.IsCheque) productText = 'TON Чек';
        if (tx.IsGiveawayPrize) productText = 'Взнос за розыгрыш';

        // --- НОВАЯ ЛОГИКА ДЛЯ ПРИЗОВ ---
        let isPrize = (tx.ProductDetails || '').includes('Giveaway Prize');
        if (isPrize) {
            title = '🎁 Выигрыш в розыгрыше';
            productText = '';
        }

        let badgesHtml = '';
        if (tx.Status === 'Pending' && tx.PayLink) {
            badgesHtml += `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(255, 193, 7, 0.15); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.3); margin-left: 6px; white-space: nowrap;">Ждет оплаты</span>`;
        }
        if (tx.IsGiveawayPrize && tx.GiveawayLink) {
            badgesHtml += `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(155, 114, 240, 0.15); color: #9b72f0; border: 1px solid rgba(155, 114, 240, 0.3); margin-left: 6px; white-space: nowrap;">Розыгрыш</span>`;
        }

        // Обновленные иконки и цвета (Приз теперь зеленый с плюсиком)
        const icon = isPrize ? '🎁' : isTopUp ? '↓' : isWithdraw ? '↑' : '🛒';
        const iconColor = isPrize ? '#ff9f43' : isTopUp ? '#2ecc71' : isWithdraw ? '#e74c3c' : '#8a2be2';
        const iconBg = isPrize ? 'rgba(255,159,67,0.13)' : isTopUp ? 'rgba(46,204,113,0.13)' : isWithdraw ? 'rgba(231,76,60,0.13)' : 'rgba(138,43,226,0.13)';

        const sClass = statusClass[tx.Status] || 'status-pending';
        const sText = statusLabel[tx.Status] || tx.Status;

        const sign = (isPrize || isTopUp) ? '+' : tx.Status === 'Failed' || tx.Status === 'Cancelled' ? '' : '-';
        const amtColor = (isPrize || isTopUp) ? '#2ecc71' : tx.Status === 'Failed' || tx.Status === 'Cancelled' ? 'var(--text-secondary)' : 'var(--text)';

        return `
        <div class="history-item" style="cursor:pointer;" onclick="showTxDetails('${tx.Id}')">
            <div class="tx-icon" style="background:${iconBg}; color:${iconColor}; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:800; flex-shrink:0;">${icon}</div>
            <div class="history-item-left" style="flex:1">
                <div class="history-item-title" style="display:flex; align-items:center; flex-wrap:wrap;">${title}${productText ? ': ' + productText : ''}${badgesHtml}</div>
                <div class="history-item-meta">${dateStr}</div>
                ${timerHtml}
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                <span style="font-weight:700; font-size:14px; color:${amtColor};">${sign}${tx.Amount} ${tx.Currency}</span>
                <span class="history-item-status ${sClass}">${sText}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Детали транзакции в модалке ───────────────────────────────
window.showTxDetails = function(id) {
    const tx = (window.currentHistory || []).find(x => x.Id === id);
    if (!tx) return;

    const statusLabel = { Pending: 'В процессе', Completed: 'Успешно', Failed: 'Ошибка', Cancelled: 'Отмена', Processing: 'В обработке' };
    const statusClass = { Pending: 'status-pending', Completed: 'status-completed', Failed: 'status-failed', Cancelled: 'status-failed', Processing: 'status-pending' };

    let createdStr = tx.CreatedAt;
    if (createdStr && !createdStr.endsWith('Z')) createdStr += 'Z';
    const dateStr = new Date(createdStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    const isTopUp = tx.Type === 'TopUp';
    const icon = isTopUp ? '↓' : tx.Type === 'Withdrawal' ? '↑' : '🛒';
    const iconColor = isTopUp ? '#2ecc71' : tx.Type === 'Withdrawal' ? '#e74c3c' : '#8a2be2';
    const iconBg = isTopUp ? 'rgba(46,204,113,0.13)' : tx.Type === 'Withdrawal' ? 'rgba(231,76,60,0.13)' : 'rgba(138,43,226,0.13)';

    const sClass = statusClass[tx.Status] || 'status-pending';
    const sText = statusLabel[tx.Status] || tx.Status;

    let productText = tx.Product === 'None' ? '—' : (tx.Product || '—');
    if (tx.IsCheque) productText = 'TON Чек';
    if (tx.IsGiveawayPrize) productText = 'Взнос за розыгрыш';

    let extraHtml = '';

    // 1. ЛОГИКА ОПЛАТЫ КРИПТОЙ В 1 КЛИК (Новые поля: PayLink и PayWallet)
    if ((tx.Status === 'Pending' || tx.Status === 'Processing') && tx.PayLink) {
        let wallet = tx.PayWallet || window.sysConfig?.receivingWallet || '';
        extraHtml += `
            <div style="margin-top: 16px; background: var(--surface-2); padding: 12px; border-radius: 12px; border: 1px solid var(--border-strong);">
                <div style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px; text-align: center;">Ожидается оплата (TON)</div>
                
                <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Адрес кошелька:</span>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input" style="font-size: 12px;">${wallet}</div>
                    <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${wallet}'); typeof safeAlert === 'function' ? safeAlert('Адрес скопирован!') : alert('Скопировано');">Копировать</button>
                </div>

                <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Комментарий (ОБЯЗАТЕЛЬНО):</span>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input" style="font-weight: bold; color: var(--text); text-align: center;">${tx.PaymentCode || '—'}</div>
                    <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${tx.PaymentCode || ''}'); typeof safeAlert === 'function' ? safeAlert('Комментарий скопирован!') : alert('Скопировано');">Копировать</button>
                </div>
                
                <button class="action-btn rent-action-btn" style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 12px 0 0; height: 42px; background: #2481cc; color: white;" onclick="window.openSafeLink ? window.openSafeLink('${tx.PayLink}') : window.Telegram.WebApp.openLink('${tx.PayLink}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                    Оплатить через Tonkeeper
                </button>
            </div>
        `;
    }
    // Старая логика (для других методов крипты, если PayLink нет, например USDT)
    else if ((tx.Status === 'Pending' || tx.Status === 'Processing') && !tx.PayLink && tx.PaymentCode && tx.Currency !== 'Stars' && tx.Currency !== 'RUB') {
        extraHtml += `
            <div style="margin-top: 16px; background: var(--surface-2); padding: 12px; border-radius: 12px; border: 1px solid var(--border-strong);">
                <div style="font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 12px; text-align: center;">Ожидается оплата</div>
                
                <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Адрес кошелька (${tx.Currency}):</span>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input" style="font-size: 12px;">${window.sysConfig?.receivingWallet || tx.TargetAddress || ''}</div>
                    <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${window.sysConfig?.receivingWallet || tx.TargetAddress || ''}'); typeof safeAlert === 'function' ? safeAlert('Адрес скопирован!') : alert('Скопировано');">Копировать</button>
                </div>

                <span style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; display: block;">Комментарий (ОБЯЗАТЕЛЬНО):</span>
                <div class="cheque-link-wrap" style="margin-bottom: 8px;">
                    <div class="cheque-link-input" style="font-weight: bold; color: var(--text); text-align: center;">${tx.PaymentCode || '—'}</div>
                    <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${tx.PaymentCode || ''}'); typeof safeAlert === 'function' ? safeAlert('Комментарий скопирован!') : alert('Скопировано');">Копировать</button>
                </div>
            </div>
        `;
    }

    // 2. ССЫЛКА НА РОЗЫГРЫШ
    if (tx.IsGiveawayPrize && tx.GiveawayLink) {
        extraHtml += `
            <div style="margin-top: 16px;">
                <a href="${tx.GiveawayLink}" target="_blank" class="action-btn rent-action-btn" style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 0; padding: 12px; font-size: 14px; text-decoration: none; background: #9b72f0; color: #fff;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    Страница розыгрыша
                </a>
            </div>
        `;
    }

    if (tx.Status === 'Pending' || tx.Status === 'Processing') {
        extraHtml += `<div style="margin-top:16px;font-size:12px;color:var(--text-muted);text-align:center;">Если транзакция долго в ожидании — обратитесь в <a href="https://t.me/${BOT_USERNAME}" style="color:var(--rent-primary)">поддержку</a></div>`;
    }

    showModal('Детали транзакции', `
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px;">
            <div style="width:52px; height:52px; border-radius:14px; background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; flex-shrink:0;">${icon}</div>
            <div>
                <div style="font-size:16px; font-weight:700; color:var(--text);">${tx.Type === 'TopUp' ? 'Пополнение' : tx.Type === 'Withdrawal' ? 'Вывод' : 'Покупка'}</div>
                <div style="font-size:12px; color:var(--text-secondary);">${dateStr}</div>
            </div>
        </div>
        <div class="modal-info-row"><span class="modal-info-label">Продукт</span><span class="modal-info-value">${productText}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="font-size:15px;">${tx.Amount} ${tx.Currency}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value"><span class="history-item-status ${sClass}">${sText}</span></span></div>
        <div class="modal-info-row"><span class="modal-info-label">ID</span><span style="font-size:11px; color:var(--text-secondary); word-break:break-all;">${tx.Id}</span></div>
        
        ${extraHtml}
    `);
};

// ── Модалка чека ───────────────────────────────────────────────
window.openChequeModal = function(id, amount, expStr, isExpired) {
    let link = `https://t.me/${BOT_USERNAME}?start=chk_${id}`;
    let linkHtml = isExpired ? '' : `
        <div style="margin:16px 0;">
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px;">Ссылка для получателя:</div>
            <div class="cheque-link-wrap" style="margin-bottom: 4px;">
                <div class="cheque-link-input" style="font-size:12px;">${link}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${link}').then(()=>safeAlert('\u0421\u0441\u044b\u043b\u043a\u0430 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0430'))">\u041a\u043e\u043f\u0438\u044f</button>
            </div>
        </div>
        <button class="action-btn outline-action-btn" style="width:100%; margin-top:8px; border-color:#f07070; color:#f07070;" onclick="cancelCheque('${id}')">Отменить чек</button>
    `;
    showModal('Детали чека', `
        <div style="text-align:center; font-size:40px; margin-bottom:10px;">🧾</div>
        <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="font-weight:700">${amount} TON</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        ${linkHtml}
        ${isExpired ? '<div style="color:#f07070; font-size:13px; text-align:center; margin-top:10px;">Срок действия чека истёк.</div>' : ''}
    `);
};

window.cancelCheque = async function(id) {
    safeConfirm('Вы уверены, что хотите отменить этот чек?', async (confirmed) => {
        if (!confirmed) return;
        const btn = document.querySelector('.outline-action-btn');
        if (btn) btn.innerHTML = 'Отмена...';
        
        let res = await apiCall(`/webapp/cheques/${id}/cancel`);
        if (!res || !res.Success) {
            res = await apiCall(`/transactions/${id}/cancel`); // Fallback if endpoint varies
        }

        if (res && res.Success) {
            safeAlert('Чек успешно отменен.');
            closeModal();
            fetchServerData();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            safeAlert('Ошибка при отмене: ' + (res?.Error || 'Неизвестная ошибка'));
            if (btn) btn.innerHTML = 'Отменить чек';
        }
    });
};

// ── Вкладки профиля ───────────────────────────────────────────
window.switchProfileTab = function(tab, btn) {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.getElementById('profileHistory').style.display = 'none';
    document.getElementById('profileCheques').style.display = 'none';
    document.getElementById('profileRentals').style.display = 'none';
    const refEl = document.getElementById('profileReferrals');
    if (refEl) refEl.style.display = 'none';

    const panelId = 'profile' + tab.charAt(0).toUpperCase() + tab.slice(1);
    const activePanel = document.getElementById(panelId);
    if (activePanel) activePanel.style.display = 'block';
};

if (document.getElementById('historyList')) loadProfile();