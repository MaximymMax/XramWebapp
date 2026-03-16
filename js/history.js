// ============================================================
//  history.js — История
// ============================================================

function renderServerHistory(history) {
    window.currentHistory = history;
    const list = document.getElementById('historyList');
    if (!list) return;
    if (!history.length) { list.innerHTML = `<div class="profile-empty"><p>История пуста</p></div>`; return; }

    const statusLabel = { Pending: 'Ожидание', Completed: 'Выполнено', Failed: 'Ошибка', Cancelled: 'Отменено', Processing: 'В обработке' };
    const statusClass = { Pending: 'status-pending', Completed: 'status-completed', Failed: 'status-failed', Cancelled: 'status-cancelled', Processing: 'status-pending' };

    list.innerHTML = history.map(h => {
        // БЕЗОПАСНАЯ ПРОВЕРКА ДАТЫ:
        const serverDateStr = h.CreatedAt ? (h.CreatedAt.endsWith('Z') ? h.CreatedAt : h.CreatedAt + 'Z') : new Date().toISOString();
        const createdDate = new Date(serverDateStr);
        const date = createdDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        let statusHtml = `<span class="history-item-status ${statusClass[h.Status] || ''}">${statusLabel[h.Status] || h.Status}</span>`;

        if (h.Status === 'Pending' && h.ExpiresAt) {
            let endsAtStr = h.ExpiresAt;
            if (!endsAtStr.endsWith('Z') && !endsAtStr.includes('+')) endsAtStr += 'Z';
            
            statusHtml = `
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    ${statusHtml}
                    <span class="countdown-timer" data-ends="${endsAtStr}" style="font-size:11px; color:#ff453a; font-weight:700;">Считаем...</span>
                </div>`;
        }

        return `<div class="history-item" onclick="showTxDetails('${h.Id}')" style="cursor:pointer">
            <div class="history-item-left">
                <span class="history-item-title">${h.Product === 'None' ? h.Type : h.Product} · ${h.Amount} ${h.Currency}</span>
                <span class="history-item-meta">${date}</span>
            </div>
            <div style="display:flex; align-items:center;">
                ${statusHtml}
            </div>
        </div>`;
    }).join('');
}

window.showSupportModal = function() {
    showModal('Поддержка', `
        <div style="text-align:center; padding: 10px 0;">
            <div style="font-size:36px; margin-bottom:12px;">🎧</div>
            <h3 style="margin-bottom:10px; color:var(--text)">Проблема с оплатой?</h3>
            <p style="color:var(--text-secondary);font-size:14px; margin-bottom:20px;">
                Если вы перевели средства по указанным реквизитам, но услуги или товары не были зачислены — пожалуйста, напишите нашему администратору. Укажите ID заявки для ускорения решения вашего вопроса.
            </p>
            <button class="action-btn wallet-action-btn" onclick="tg.openTelegramLink ? tg.openTelegramLink('https://t.me/putyat1n') : window.open('https://t.me/putyat1n')" style="width:100%;">Написать администратору</button>
        </div>
    `);
}

window.showTxDetails = function(txId) {
    const tx = window.currentHistory.find(h => h.Id === txId);
    if (!tx) return;
    const date = new Date(tx.CreatedAt).toLocaleString('ru-RU');
    const statusLabel = { Pending: 'Ожидание оплаты', Completed: 'Выполнено', Failed: 'Ошибка выдачи', Cancelled: 'Отменено', Processing: 'В обработке' };

    const targetHtml = tx.TargetAddress ? `<div class="modal-info-row"><span class="modal-info-label">Получатель</span><span class="modal-info-value">${tx.TargetAddress}</span></div>` : '';
    const detailsHtml = tx.ProductDetails ? `<div class="modal-info-row"><span class="modal-info-label">Инфо</span><span class="modal-info-value" style="font-size:12px;text-align:right;max-width:60%">${tx.ProductDetails}</span></div>` : '';
    const activatorHtml = (tx.IsCheque && tx.IsChequeActivated && tx.ActivatorTelegramId)
        ? `<div class="modal-info-row"><span class="modal-info-label">Активировал (ID)</span><span class="modal-info-value">${tx.ActivatorTelegramId}</span></div>` : '';

    const supportHtml = tx.Status === 'Pending' ? `<button class="action-btn outline-action-btn" style="width:100%; margin-top: 16px;" onclick="showSupportModal()">Связаться с поддержкой</button>` : '';

    showModal('Детали операции', `
        <div class="modal-info-row"><span class="modal-info-label">ID Заявки</span><span class="modal-info-value">${tx.PaymentCode}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Дата</span><span class="modal-info-value">${date}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="color:var(--rent-primary)">${tx.Amount} ${tx.Currency}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Тип товара</span><span class="modal-info-value">${tx.Product === 'None' ? tx.Type : tx.Product}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Способ оплаты</span><span class="modal-info-value">${tx.PaymentMethod}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value">${statusLabel[tx.Status] || tx.Status}</span></div>
        ${targetHtml}${activatorHtml}${detailsHtml}
        ${supportHtml}
        <div style="margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center;">Уникальный Hash: ${tx.Id}</div>
    `);
}

