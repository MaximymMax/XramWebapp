// ============================================================
//  giveaways.js — Создание, списки и участие по ссылке
// ============================================================

window.switchGiveawayTab = function(tab, btn) {
    document.getElementById('gwTabCreate').closest('.page').querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    document.getElementById('gwTabCreate').style.display = tab === 'create' ? 'block' : 'none';
    document.getElementById('gwTabParticipating').style.display = tab === 'participating' ? 'block' : 'none';
    document.getElementById('gwTabMy').style.display = tab === 'my' ? 'block' : 'none';

    if (tab === 'participating' || tab === 'my') {
        loadGiveawaysList(tab, false);
    }
}

window.fetchAllGiveaways = async function() {
    await Promise.all([
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
    // Меняем скрытое значение
    document.getElementById('gwPrizePremium').value = val;
    // Меняем текст на кнопке
    document.getElementById('gwPremLabel').textContent = elem.querySelector('.sort-item-label').textContent;
    
    // Убираем класс active у других элементов и добавляем текущему
    elem.closest('.sort-dd-menu').querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('active'));
    elem.classList.add('active');
    
    // Закрываем меню
    elem.closest('.sort-dd-menu').classList.remove('show');
    
    // Пересчитываем итоговую цену!
    if (typeof window.updateGwCreatePrice === 'function') {
        window.updateGwCreatePrice();
    }
}

async function initGwGifts() {
    const menu = document.getElementById('gwGiftMenu');
    if (!menu) return;
    
    menu.innerHTML = '<div class="sort-dd-item"><span class="sort-item-label">Загрузка...</span></div>';

    // ЗАМЕНИ /webapp/gifts/catalog на твой реальный эндпоинт, который отдает список подарков
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
    
    // Сохраняем значения для калькулятора
    const priceInput = document.getElementById('gwPrizeGiftPrice');
    priceInput.value = priceStars; 
    priceInput.dataset.usd = priceUsd; // Сохраняем готовую цену в USD с бекенда
    
    // Красиво оформляем текст на выбранной кнопке
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
    
    // Получаем наценку (по умолчанию 20%) и комиссию сети в USD
    const markupPercentage = window.sysConfig?.globalMarkupPercentage || 20;
    const markupMult = 1 + (markupPercentage / 100);
    const gasFeeUsd = (window.sysConfig?.blockchainGasFeeTon || 0.06) * getTonUsdRate();

    if (type === 'TelegramStars') {
        const amount = parseFloat(document.getElementById('gwPrizeStars').value) || 0;
        // Себестоимость * наценку + газ
        const baseStarUsd = window.RATES?.USD?.perStar || 0.014;
        usdPricePerWinner = ((amount * baseStarUsd) * markupMult) + gasFeeUsd;
        
    } else if (type === 'TonTransfer') {
        const amount = parseFloat(document.getElementById('gwPrizeTon').value) || 0;
        // TON * наценку + газ
        usdPricePerWinner = ((amount * getTonUsdRate()) * markupMult) + gasFeeUsd;
        
    } else if (type === 'Premium') {
        const months = parseInt(document.getElementById('gwPrizePremium').value) || 3;
        // Берем готовые цены с наценкой из конфига + добавляем газ
        let premUsd = window.sysConfig?.finalPricesUsd?.premium3 || (11.99 * markupMult);
        if (months === 12) premUsd = window.sysConfig?.finalPricesUsd?.premium12 || (35.99 * markupMult);
        else if (months === 6) premUsd = window.sysConfig?.finalPricesUsd?.premium6 || (15.99 * markupMult);
        
        usdPricePerWinner = premUsd + gasFeeUsd;
        
    } else if (type === 'DefaultGift') {
        // У подарков цена УЖЕ посчитана с наценкой и газом на бэкенде, просто берем её
        const giftUsd = parseFloat(document.getElementById('gwPrizeGiftPrice').dataset.usd) || 0;
        usdPricePerWinner = giftUsd;
    }

    const totalUsd = usdPricePerWinner * winners;
    const totalTon = totalUsd / getTonUsdRate();
    const tonPerWinner = usdPricePerWinner / getTonUsdRate();

    // ОБНОВЛЯЕМ ЭЛЕМЕНТЫ В ИНТЕРФЕЙСЕ
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

window.openGwPaymentModal = async function() {
    const type = document.getElementById('gwPrizeType').value;
    const winners = parseInt(document.getElementById('gwWinnersCount').value) || 1;
    
    const hours = parseInt(document.getElementById('gwHoursCount').value) || 0;
    if (hours < 1) return safeAlert("Минимальная длительность - 1 час");

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

    const res = await apiCall('/transactions/create/giveaway' + `?type=${type}&amount=${amount}&winners=${winners}&hours=${hours}&giftId=${giftId}`);
    setLoading(btn, false);

    if (res && res.Success) {
        tg.openTelegramLink(res.InviteLink);
    } else {
        safeAlert(res?.Error || "Ошибка создания розыгрыша");
    }
}

async function loadGiveawaysList(tab, showLoad = true) {
    const list = document.getElementById(tab === 'my' ? 'gwMyList' : 'gwParticipatingList');
    if (showLoad) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';

    const res = await apiCall('/webapp/giveaways/list');
    if (res && res.Success) {
        const items = tab === 'my' ? res.My : res.Participating;

        // Скрываем завершенные розыгрыши во вкладке "Участвую"
        if (tab === 'participating' && items) {
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
            list.innerHTML = `<div class="profile-empty"><p>${tab === 'my' ? 'У вас нет созданных розыгрышей' : 'Вы не участвуете в активных розыгрышах'}</p></div>`;
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
                // Если время окончания еще не задано (0 участников)
                statusText = `<span style="font-size:11px; margin-right:3px;">⏳</span>Ожидание участников`;
            } else {
                // Если таймер запущен
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

window.checkGiveawayInvite = async function() {
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam && startParam.startsWith('gw_')) {
        const gwId = startParam.replace('gw_', '');
        window.currentGiveawayId = gwId;
        switchTab('giveaways', document.querySelector('.nav-item[onclick*=\"giveaways\"]'));
        
        const capRes = await apiCall(`/webapp/giveaways/${gwId}/captcha`);
        if (capRes && capRes.Success) {
            let capHtml = `
                <div style="text-align:center;">
                    <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
                        Вы приглашены в розыгрыш!<br>Для участия выберите: <b>${capRes.TargetName}</b>
                    </p>
                    <div id="inlineCaptcha" style="margin-top:10px;">
                        <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                            ${capRes.Emojis.map(emoji => `
                                <button onclick="submitCaptcha('${emoji}')" style="font-size: 28px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 12px; width: 50px; height: 50px; cursor: pointer; display:flex; align-items:center; justify-content:center;">
                                    ${emoji}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            showModal('Участие в розыгрыше', capHtml);
        } else {
            safeAlert(capRes?.Error || "Ошибка загрузки розыгрыша");
        }
    }
}
setTimeout(checkGiveawayInvite, 1000);

window.submitCaptcha = async function(emoji) {
    const capDiv = document.getElementById('inlineCaptcha');
    capDiv.innerHTML = `<p style="color:var(--text-secondary); font-size:14px;">Проверка...</p>`;
    
    const res = await apiCall(`/webapp/giveaways/${currentGiveawayId}/join?emoji=${encodeURIComponent(emoji)}`);
    if (res && res.Success) {
        closeModal();
        safeAlert(res.Message);
        if(document.getElementById('gwTabParticipating')?.style.display === 'block') {
            loadGiveawaysList('participating', false);
        }
    } else {
        capDiv.innerHTML = `<p style="color:#ff453a; font-size:13px; margin-bottom:10px;">${res?.Error || 'Неверно'}</p>
                            <button class="action-btn outline-action-btn" onclick="closeModal()">Закрыть</button>`;
    }
}