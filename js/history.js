// ============================================================
//  history.js — История
// ============================================================

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

