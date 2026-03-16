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

        let statusHtml = `<span class="history-item-status ${statusClass[h.Status] || 'status-pending'}">${statusLabel[h.Status] || h.Status}</span>`;

        // Используем твои родные классы из style.css
        return `
        <div class="history-item" onclick="showTxDetails('${h.Id}')" style="cursor:pointer">
            <div class="history-item-left">
                <span class="history-item-title">${h.Product === 'None' ? h.Type : h.Product}</span>
                <span class="history-item-meta">${date}</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <span style="font-weight:700; font-size: 15px; color: var(--text);">${h.Amount} ${h.Currency}</span>
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