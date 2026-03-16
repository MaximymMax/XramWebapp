window.renderServerHistory = function(history) {
    window.currentHistory = history;
    const list = document.getElementById('historyList');
    if (!list) return;
    
    if (!history || history.length === 0) { 
        list.innerHTML = `<div class="profile-empty"><p>История пуста</p></div>`; 
        return; 
    }

    const statusLabel = { Pending: 'Ожидание', Completed: 'Выполнено', Failed: 'Ошибка', Cancelled: 'Отменено', Processing: 'В обработке' };
    const statusClass = { Pending: 'status-pending', Completed: 'status-completed', Failed: 'status-failed', Cancelled: 'status-cancelled', Processing: 'status-pending' };

    list.innerHTML = history.map(h => {
        // Безопасный парсинг даты
        const serverDateStr = h.CreatedAt ? (h.CreatedAt.endsWith('Z') ? h.CreatedAt : h.CreatedAt + 'Z') : new Date().toISOString();
        const createdDate = new Date(serverDateStr);
        const date = createdDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        let statusHtml = `<span class="status-badge ${statusClass[h.Status] || 'status-pending'}">${statusLabel[h.Status] || h.Status}</span>`;

        return `
        <div class="tx-item" onclick="showTxDetails('${h.Id}')" style="cursor:pointer">
            <div class="tx-icon" style="background: rgba(255,255,255,0.05);">💎</div>
            <div class="tx-info">
                <div class="tx-title">${h.Product === 'None' ? h.Type : h.Product}</div>
                <div class="tx-date">${date}</div>
            </div>
            <div class="tx-amount">
                <span style="font-weight:700; font-size: 14px;">${h.Amount} ${h.Currency}</span>
                ${statusHtml}
            </div>
        </div>`;
    }).join('');
};

window.showTxDetails = function(id) {
    if (!window.currentHistory) return;
    const tx = window.currentHistory.find(x => x.Id === id);
    if (!tx) return;
    
    const title = `Детали: ${tx.Type}`;
    const text = `Сумма: ${tx.Amount} ${tx.Currency}\nСтатус: ${tx.Status}\nID транзакции: ${tx.Id}`;
    
    // Выводим детали транзакции в нашу красивую модалку
    if (window.showSuccessModal) {
        window.showSuccessModal(title, text, 'Закрыть', tx.Status === 'Failed' || tx.Status === 'Cancelled');
    }
};