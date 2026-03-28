// ============================================================
//  giveaways.js — Создание, списки и участие по ссылке
// ============================================================

window.switchGiveawayTab = function(tab, btn) {
    document.getElementById('gwTabCreate').closest('.page').querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.getElementById('gwTabAll').style.display = tab === 'all' ? 'block' : 'none';
    document.getElementById('gwTabCreate').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('gwTabParticipating').style.display = tab === 'participating' ? 'block' : 'none';
    document.getElementById('gwTabMy').style.display = tab === 'my' ? 'block' : 'none';

    if (tab === 'participating' || tab === 'my' || tab === 'all') {
        loadGiveawaysList(tab, false);
    }
}

window.fetchAllGiveaways = async function() {
    await Promise.all([
        loadGiveawaysList('all', false),
        loadGiveawaysList('participating', false),
        loadGiveawaysList('my', false)
    ]);
}

// ── Кастомные дропдауны ─────────────────────────────────────
window.selectGwPrize = function(val, elem) {
    document.getElementById('gwPrizeType').value = val;
    document.getElementById('gwPrizeLabel').textContent = elem.querySelector('.sort-item-label').textContent;
    
    elem.closest('.sort-dd-menu').querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');

    document.getElementById('gwInputStarsWrap').style.display = val === 'TelegramStars' ? 'block' : 'none';
    document.getElementById('gwInputTonWrap').style.display = val === 'TonTransfer' ? 'block' : 'none';
    document.getElementById('gwInputPremiumWrap').style.display = val === 'Premium' ? 'block' : 'none';
    document.getElementById('gwInputGiftWrap').style.display = val === 'DefaultGift' ? 'block' : 'none';

    updateGwCreatePrice();
}

window.selectGwPremium = function(val, elem) {
    document.getElementById('gwPrizePremium').value = val;
    document.getElementById('gwPremLabel').textContent = elem.querySelector('.sort-item-label').textContent;
    
    elem.closest('.sort-dd-menu').querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('active'));
    elem.classList.add('active');
    
    elem.closest('.sort-dd-menu').classList.remove('show');
    
    if (typeof window.updateGwCreatePrice === 'function') {
        window.updateGwCreatePrice();
    }
}

async function initGwGifts() {
    const menu = document.getElementById('gwGiftMenu');
    if (!menu) return;
    
    menu.innerHTML = '<div class="sort-dd-item"><span class="sort-item-label">Загрузка...</span></div>';

    const res = await apiCall('/webapp/gifts/catalog'); 
    
    if (res && res.Success && res.Gifts) {
        menu.innerHTML = res.Gifts.map(g => `
            <div class="sort-dd-item" onclick="selectGwGift('${g.Id}', '${g.Name}', ${g.PriceStars}, ${g.PriceTon}, ${g.PriceUsd}, this)">
                <div style="display:flex; align-items:center; justify-content: space-between; width: 100%;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="https://cdn.changes.tg/gifts/originals/${g.Id}/Original.png" style="width:24px; height:24px;">
                        <span class="sort-item-label">${g.Name}</span>
                    </div>
                    <div style="text-align: right; line-height: 1.2;">
                        <div style="font-size: 13px; font-weight: 700; color: var(--text);">${g.PriceTon.toFixed(2)} TON</div>
                        <div style="font-size: 11px; font-weight: 600; color: var(--text-muted);">≈ $${g.PriceUsd.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        menu.innerHTML = '<div class="sort-dd-item"><span class="sort-item-label">Ошибка загрузки списка</span></div>';
    }
}
setTimeout(initGwGifts, 300);

window.selectGwGift = function(id, name, priceStars, priceTon, priceUsd, elem) {
    document.getElementById('gwPrizeGiftId').value = id;
    
    const priceInput = document.getElementById('gwPrizeGiftPrice');
    priceInput.value = priceStars; 
    priceInput.dataset.usd = priceUsd; 
    
    document.getElementById('gwGiftLabel').innerHTML = `
        <span style="color:var(--text);">${name}</span>
        <span style="color:var(--text-muted); font-size:13px; margin-left:6px;">${priceTon.toFixed(2)} TON</span>
    `;
    
    const img = document.getElementById('gwGiftImg');
    img.src = `https://cdn.changes.tg/gifts/originals/${id}/Original.png`;
    img.style.display = 'block';

    elem.closest('.sort-dd-menu').querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');
    updateGwCreatePrice();
}

window.updateGwCreatePrice = function() {
    const type = document.getElementById('gwPrizeType').value;
    const winners = parseInt(document.getElementById('gwWinnersCount').value) || 1;
    let usdPricePerWinner = 0;
    
    const markupPercentage = window.sysConfig?.globalMarkupPercentage || 20;
    const markupMult = 1 + (markupPercentage / 100);
    const gasFeeUsd = (window.sysConfig?.blockchainGasFeeTon || 0.06) * getTonUsdRate();

    if (type === 'TelegramStars') {
        const amount = parseFloat(document.getElementById('gwPrizeStars').value) || 0;
        // ИСПРАВЛЕНИЕ БАГ 1: perStar (из RATES) = FinalPricesUsd.Star = 0.018 (уже с наценкой).
        // Раньше мы умножали (amount * 0.018) * markupMult = двойная наценка → 0.92 TON.
        // Теперь: берём fragment-base (0.014) * (1 + markup%) = одна наценка → соответствует бэкенду.
        const fragmentBaseUsd = 0.014; // AppConfig.RateStarFragmentUsd
        usdPricePerWinner = (amount * fragmentBaseUsd * markupMult) + gasFeeUsd;

        
    } else if (type === 'TonTransfer') {
        const amount = parseFloat(document.getElementById('gwPrizeTon').value) || 0;
        usdPricePerWinner = amount * getTonUsdRate();
        
    } else if (type === 'Premium') {
        const months = parseInt(document.getElementById('gwPrizePremium').value) || 3;
        let premUsd = window.sysConfig?.finalPricesUsd?.premium3 || (11.99 * markupMult);
        if (months === 12) premUsd = window.sysConfig?.finalPricesUsd?.premium12 || (35.99 * markupMult);
        else if (months === 6) premUsd = window.sysConfig?.finalPricesUsd?.premium6 || (15.99 * markupMult);
        
        usdPricePerWinner = premUsd + gasFeeUsd;
        
    } else if (type === 'DefaultGift') {
        const giftUsd = parseFloat(document.getElementById('gwPrizeGiftPrice').dataset.usd) || 0;
        usdPricePerWinner = giftUsd;
    }

    const totalUsd = usdPricePerWinner * winners;
    const totalTon = totalUsd / getTonUsdRate();
    const tonPerWinner = usdPricePerWinner / getTonUsdRate();

    const perWinnerEl = document.getElementById('gwPerWinnerInfo');
    const multiplierEl = document.getElementById('gwMultiplier');
    const usdEl = document.getElementById('gwTotalCostUsd');
    const tonEl = document.getElementById('gwTotalCostTon');
    
    if (perWinnerEl) perWinnerEl.textContent = `${tonPerWinner.toFixed(2)} TON`;
    if (multiplierEl) multiplierEl.textContent = `x${winners}`;
    if (usdEl) usdEl.textContent = `≈ $${totalUsd.toFixed(2)}`;
    if (tonEl) tonEl.textContent = `${totalTon.toFixed(2)} TON`;

    const btn = document.getElementById('gwSubmitBtn');
    if (btn) {
        btn.innerHTML = `Оплатить ~${totalTon.toFixed(2)} TON`;
        btn.disabled = totalTon <= 0;
    }
}

// ── Валидация канала перед отправкой ────────────────────────
window.validateGiveawayChannel = async function() {
    const channelInput = document.getElementById('gw-channel-input');
    const statusText = document.getElementById('gw-channel-status');
    const channel = channelInput.value.trim();

    if (!channel) {
        statusText.innerText = '';
        return false;
    }

    statusText.innerText = '⏳ Проверяем права в канале...';
    statusText.style.color = 'var(--text-secondary)';

    try {
        const res = await apiCall(`/webapp/channel/check?channel=${encodeURIComponent(channel)}`);
        
        if (res && res.Success) {
            statusText.innerText = '✅ ' + (res.Message || 'Канал успешно подключен!');
            statusText.style.color = '#34c759'; // Зеленый цвет успеха
            return true;
        } else {
            statusText.innerText = '❌ ' + (res?.Error || 'Ошибка проверки');
            statusText.style.color = '#ff3b30'; // Красный цвет ошибки
            return false;
        }
    } catch (e) {
        statusText.innerText = '❌ Ошибка сети при проверке канала';
        statusText.style.color = '#ff3b30';
        return false;
    }
}

window.openGwPaymentModal = async function() {
    const type = document.getElementById('gwPrizeType').value;
    const winners = parseInt(document.getElementById('gwWinnersCount').value) || 1;
    
    const datetimeInput = document.getElementById('gwDatetimePicker').value;
    if (!datetimeInput) return safeAlert("Пожалуйста, укажите дату и время окончания розыгрыша.");
    
    // Теперь datetimeInput хранит timestamp в миллисекундах от кастомных селекторов
    const selectedTime = parseInt(datetimeInput);
    const now = new Date().getTime();
    const diffMinutes = Math.floor((selectedTime - now) / 60000);

    if (diffMinutes < 1) return safeAlert("Минимальная длительность - 1 минута.");

    const channelInput = document.getElementById('gw-channel-input').value.trim();
    if (!channelInput) return safeAlert("Пожалуйста, укажите канал для проведения розыгрыша.");

    let amount = 0;
    let giftId = "";
    
    if (type === 'TelegramStars') {
        amount = parseFloat(document.getElementById('gwPrizeStars').value);
        if (amount < 50) return safeAlert("Минимальное количество звезд: 50");
    } else if (type === 'TonTransfer') {
        amount = parseFloat(document.getElementById('gwPrizeTon').value);
        if (amount < 0.5) return safeAlert("Минимальная сумма: 0.5 TON");
    } else if (type === 'Premium') {
        amount = parseInt(document.getElementById('gwPrizePremium').value);
    } else if (type === 'DefaultGift') {
        giftId = document.getElementById('gwPrizeGiftId').value;
        if (!giftId) return safeAlert("Пожалуйста, выберите подарок из списка");
        amount = parseFloat(document.getElementById('gwPrizeGiftPrice').value);
    }

    if (winners < 1) return safeAlert("Должен быть хотя бы 1 победитель");

    const btn = document.getElementById('gwSubmitBtn');
    setLoading(btn, true);

    // === БАГ 1: Запрашиваем ТОЧНУЮ сумму с бэкенда перед созданием ===
    const preview = await apiCall(`/webapp/giveaways/price-preview?type=${type}&amount=${amount}&winners=${winners}`);
    setLoading(btn, false);

    if (!preview || !preview.Success) {
        return safeAlert(preview?.Error || "Не удалось рассчитать стоимость розыгрыша");
    }

    const exactTon = preview.FinalTon;

    // Показываем подтверждение с ТОЧНОЙ суммой от бэкенда
    const confirmed = await new Promise(resolve => {
        tg.showConfirm(
            `Точная стоимость розыгрыша: ${exactTon.toFixed(2)} TON\nСредства будут списаны с вашего TON-баланса.\n\nПродолжить?`,
            resolve
        );
    });

    if (!confirmed) return;
    // =================================================================

    setLoading(btn, true);
    const res = await apiCall('/transactions/create/giveaway' + `?type=${type}&amount=${amount}&winners=${winners}&minutes=${diffMinutes}&giftId=${giftId}&channel=${encodeURIComponent(channelInput)}`);
    setLoading(btn, false);

    if (res && res.Success) {
        tg.openTelegramLink(res.InviteLink);
    } else {
        safeAlert(res?.Error || "Ошибка создания розыгрыша");
    }
}


async function loadGiveawaysList(tab, showLoad = true) {
    const list = document.getElementById(tab === 'my' ? 'gwMyList' : tab === 'all' ? 'gwAllList' : 'gwParticipatingList');
    if (showLoad) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const res = await apiCall('/webapp/giveaways/list');
    if (res && res.Success) {
        const items = tab === 'my' ? res.My : tab === 'all' ? res.All : res.Participating;

        if ((tab === 'participating' || tab === 'all') && items) {
            const now = Date.now();
            for (let i = items.length - 1; i >= 0; i--) {
                let endsAtStr = items[i].EndsAt;
                if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
                if (new Date(endsAtStr).getTime() <= now) {
                    items.splice(i, 1);
                }
            }
        }

        if (!items || items.length === 0) {
            let emptyMsg = tab === 'my' ? 'У вас нет созданных розыгрышей' : tab === 'all' ? 'Нет активных розыгрышей' : 'Вы не участвуете в активных розыгрышах';
            list.innerHTML = `<div class="profile-empty"><p>${emptyMsg}</p></div>`;
            return;
        }

        list.innerHTML = items.map(gw => {
            let typeName = gw.PrizeType;
            if (typeName === 'TelegramStars' || typeName === 'Stars') typeName = 'Telegram Stars';
            if (typeName === 'TonTransfer') typeName = 'TON';
            if (typeName === 'DefaultGift') typeName = 'Подарок';
            
            let isEnded = false;
            let statusClass = 'status-pending';
            let statusText = '';

            if (!gw.EndsAt) {
                statusText = `<span style="font-size:11px; margin-right:3px;">⏳</span>Ожидание участников`;
            } else {
                let endsAtStr = gw.EndsAt;
                if (!endsAtStr.endsWith('Z')) endsAtStr += 'Z';
                const endsDate = new Date(endsAtStr);
                isEnded = endsDate.getTime() <= Date.now();
                statusClass = isEnded ? 'status-cancelled' : 'status-pending';
                statusText = isEnded ? 'Завершен' : `<span style="font-size:11px; margin-right:3px;">⏱</span><span class="countdown-timer" data-ends="${endsAtStr}" data-timeout-text="Завершен">Обновление...</span>`;
            }

            return `
                <div class="history-item" style="cursor:pointer;" onclick="showGiveawayInfo('${gw.Id}')">
                    <div class="history-item-left">
                        <div class="history-item-title">🎁 ${typeName}</div>
                        <div class="history-item-meta">${gw.WinnersCount} победителей • ${gw.ParticipantsCount} участий</div>
                    </div>
                    <div class="history-item-status ${statusClass}">${statusText}</div>
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = '<div class="profile-empty"><p>Ошибка загрузки</p></div>';
    }
}

window.showGiveawayInfo = async function(id) {
    showModal('Загрузка...', '<div style="text-align:center; padding: 20px;"><p style="color:var(--text-secondary);">Получение информации о розыгрыше...</p></div>');
    
    const res = await apiCall(`/webapp/giveaways/${id}/info`);
    if (res && res.Success) {
        
        let isEnded = false;
        let endsDateText = 'После 1-го участника';

        if (res.EndsAt) {
            let endsAtStr = res.EndsAt;
            if (!endsAtStr.endsWith('Z')) endsAtStr += 'Z';
            const endsDate = new Date(endsAtStr);
            isEnded = endsDate.getTime() <= Date.now();
            endsDateText = endsDate.toLocaleString('ru-RU');
        }
        
        let prizeName = res.PrizeType;
        let prizeVal = res.Amount;
        if (prizeName === 'TelegramStars' || prizeName === 'Stars') { prizeName = 'Telegram Stars'; prizeVal += ' ⭐️'; }
        else if (prizeName === 'TonTransfer') { prizeName = 'TON'; prizeVal += ' TON'; }
        else if (prizeName === 'Premium') { prizeVal += ' мес.'; }
        else if (prizeName === 'DefaultGift') { prizeName = 'Подарок'; prizeVal = '1 шт.'; }

        let html = `
            <div style="text-align:center; font-size:40px; margin-bottom:10px;">🎁</div>
            <div class="modal-info-row"><span class="modal-info-label">Приз</span><span class="modal-info-value">${prizeName} (${prizeVal})</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Победителей</span><span class="modal-info-value">${res.WinnersCount}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Участников</span><span class="modal-info-value">${res.ParticipantsCount}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Завершение</span><span class="modal-info-value">${endsDateText}</span></div>
        `;

        if (res.IsCreator && res.Participants && res.Participants.length > 0) {
            html += `<div style="margin-top:15px; font-weight:600; font-size:14px; color:var(--text);">Участники:</div>`;
            html += `<div style="max-height:150px; overflow-y:auto; margin-top:8px; background:var(--surface-3); padding:10px; border-radius:8px;">`;
            res.Participants.forEach(p => {
                html += `<div style="font-size:13px; color:var(--text-secondary); margin-bottom:4px;">${p.Name} <span style="font-size:11px; opacity:0.7;">(${new Date(p.JoinedAt + 'Z').toLocaleString('ru-RU')})</span></div>`;
            });
            html += `</div>`;
        }

        if (res.IsCreator || res.InviteLink) {
            const inviteUrl = res.InviteLink || `https://t.me/${window.BOT_USERNAME || 'xram_shop_bot'}?start=gw_${id}`;
            html += `<div style="margin-top:15px; font-weight:600; font-size:14px; color:var(--text); text-align: left;">Ссылка для приглашения:</div>`;
            html += `<div class="cheque-link-wrap" style="margin-top:8px; margin-bottom: 16px; display: flex; gap: 8px;">
                         <input type="text" readonly value="${inviteUrl}" style="flex:1; background: var(--surface-3); border: 1px solid var(--border-strong); border-radius: 8px; padding: 10px; font-family: monospace; font-size: 11px; color: var(--text);">
                         <button class="action-btn outline-action-btn" style="margin: 0; padding: 0 16px;" onclick="navigator.clipboard.writeText('${inviteUrl}'); typeof safeAlert === 'function' ? safeAlert('Ссылка скопирована!') : alert('Скопировано!');">Копия</button>
                     </div>`;
        }

        if (!isEnded && res.IsCreator && res.ParticipantsCount === 0) {
            html += `<button class="action-btn outline-action-btn" style="width:100%; margin: 15px 0 0; border-color:#f07070; color:#f07070;" onclick="cancelGiveaway('${id}')">Отменить розыгрыш</button>`;
        }

        if (!isEnded && !res.IsJoined && !res.IsCreator) {
            const joinUrl = res.InviteLink || `https://t.me/${window.BOT_USERNAME || 'xram_shop_bot'}?start=gw_${id}`;
            html += `<button class="action-btn stars-action-btn" style="width:100%; margin: 15px 0 0;" onclick="tg.openTelegramLink('${joinUrl}')">Участвовать 🚀</button>`;
        }

        showModal('Детали розыгрыша', html);
    } else {
        showModal('Ошибка', '<div style="text-align:center; padding: 20px;"><p style="color:#f07070;">Не удалось загрузить данные о розыгрыше</p></div>');
    }
}

window.cancelGiveaway = async function(id) {
    if (!confirm("Вы уверены, что хотите отменить розыгрыш? Средства будут возвращены на ваш баланс.")) return;
    
    closeModal();
    const res = await apiCall(`/webapp/giveaways/${id}/cancel`);
    if (res && res.Success) {
        safeAlert("Розыгрыш отменен. Средства возвращены.");
        fetchAllGiveaways();
        loadProfile(); 
    } else {
        safeAlert(res?.Error || "Ошибка при отмене");
    }
}

// Инициализация красивых кастомных дропдаунов даты/времени
window.initGwDatetimePicker = function() {
    const dateMenu = document.getElementById('gwDateMenu');
    const hourMenu = document.getElementById('gwHourMenu');
    const minMenu = document.getElementById('gwMinuteMenu');
    if (!dateMenu || !hourMenu || !minMenu) return;

    // По умолчанию ставим "Завтра" (через 24 часа)
    let selectedDateOffset = 1; 
    let selectedHour = new Date().getHours();
    
    // Округляем минуты до ближайших 5
    let currentMin = new Date().getMinutes();
    let selectedMin = Math.ceil(currentMin / 5) * 5;
    if (selectedMin >= 60) {
        selectedMin = 0;
        selectedHour = (selectedHour + 1) % 24;
    }

    function updateHiddenInput() {
        const d = new Date();
        d.setDate(d.getDate() + selectedDateOffset);
        d.setHours(selectedHour, selectedMin, 0, 0);
        document.getElementById('gwDatetimePicker').value = d.getTime();
    }

    function renderDates() {
        let html = '';
        const months = ['Янв','Фев','Мар','Апр','Мая','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
        const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            let labelText = `${d.getDate()} ${months[d.getMonth()]}`;
            if (i === 0) labelText = "Сегодня, " + labelText;
            else if (i === 1) labelText = "Завтра, " + labelText;
            else labelText = `${days[d.getDay()]}, ` + labelText;
            
            const isSelected = i === selectedDateOffset;
            html += `<div class="sort-dd-item ${isSelected ? 'selected' : ''}" onclick="selectGwDate(${i}, '${labelText}', this)">
                        <span class="sort-item-label">${labelText}</span>
                     </div>`;
            if (isSelected) document.getElementById('gwDateLabel').innerText = labelText;
        }
        dateMenu.innerHTML = html;
    }

    function renderHours() {
        let html = '';
        for (let i = 0; i < 24; i++) {
            const hStr = i.toString().padStart(2, '0');
            const isSelected = i === selectedHour;
            html += `<div class="sort-dd-item ${isSelected ? 'selected' : ''}" onclick="selectGwHour(${i}, '${hStr}', this)">
                        <span class="sort-item-label">${hStr}</span>
                     </div>`;
            if (isSelected) document.getElementById('gwHourLabel').innerText = hStr;
        }
        hourMenu.innerHTML = html;
    }

    function renderMinutes() {
        let html = '';
        for (let i = 0; i < 60; i += 5) {
            const mStr = i.toString().padStart(2, '0');
            const isSelected = i === selectedMin;
            html += `<div class="sort-dd-item ${isSelected ? 'selected' : ''}" onclick="selectGwMinute(${i}, '${mStr}', this)">
                        <span class="sort-item-label">${mStr}</span>
                     </div>`;
            if (isSelected) document.getElementById('gwMinuteLabel').innerText = mStr;
        }
        minMenu.innerHTML = html;
    }

    window.selectGwDate = function(offset, label, el) {
        selectedDateOffset = offset;
        document.getElementById('gwDateLabel').innerText = label;
        updateSelectOptions('gwDateMenu', el);
        updateHiddenInput();
    };
    window.selectGwHour = function(h, label, el) {
        selectedHour = h;
        document.getElementById('gwHourLabel').innerText = label;
        updateSelectOptions('gwHourMenu', el);
        updateHiddenInput();
    };
    window.selectGwMinute = function(m, label, el) {
        selectedMin = m;
        document.getElementById('gwMinuteLabel').innerText = label;
        updateSelectOptions('gwMinuteMenu', el);
        updateHiddenInput();
    };

    function updateSelectOptions(menuId, selectedEl) {
        const menu = document.getElementById(menuId);
        if(!menu) return;
        menu.querySelectorAll('.sort-dd-item').forEach(item => item.classList.remove('selected'));
        if (selectedEl) selectedEl.classList.add('selected');
    }

    renderDates();
    renderHours();
    renderMinutes();
    updateHiddenInput();
};

window.initGwDatetimePicker();
