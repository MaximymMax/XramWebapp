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

// ── Подарки для розыгрыша ────────────────────────────────────
const GW_GIFTS = [
    { id: "5983471780763796287", name: "Santa Hat", price: 50 },
    { id: "5936085638515261992", name: "Signet Ring", price: 50 },
    { id: "5933671725160989227", name: "Precious Peach", price: 50 },
    { id: "5936013938331222567", name: "Plush Pepe", price: 50 },
    { id: "5913442287462908725", name: "Spiced Wine", price: 50 },
    { id: "5915502858152706668", name: "Jelly Bunny", price: 50 },
    { id: "5915521180483191380", name: "Durov's Cap", price: 50 },
    { id: "5913517067138499193", name: "Perfume Bottle", price: 50 },
    { id: "5882125812596999035", name: "Eternal Rose", price: 50 }
];

function initGwGifts() {
    const menu = document.getElementById('gwGiftMenu');
    if (!menu) return;
    menu.innerHTML = GW_GIFTS.map(g => `
        <div class="sort-dd-item" onclick="selectGwGift('${g.id}', '${g.name}', ${g.price}, this)">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="https://cdn.changes.tg/gifts/originals/${g.id}/Original.png" style="width:24px; height:24px;">
                <span class="sort-item-label">${g.name} (${g.price} ⭐️)</span>
            </div>
        </div>
    `).join('');
}
setTimeout(initGwGifts, 300);

window.selectGwGift = function(id, name, price, elem) {
    document.getElementById('gwPrizeGiftId').value = id;
    document.getElementById('gwPrizeGiftPrice').value = price;
    document.getElementById('gwGiftLabel').textContent = `${name} (${price} ⭐️)`;
    
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

    if (type === 'TelegramStars') {
        const amount = parseFloat(document.getElementById('gwPrizeStars').value) || 0;
        usdPricePerWinner = amount * RATES.USD.perStar;
    } else if (type === 'TonTransfer') {
        const amount = parseFloat(document.getElementById('gwPrizeTon').value) || 0;
        usdPricePerWinner = amount * getTonUsdRate();
    } else if (type === 'Premium') {
        const months = parseInt(document.getElementById('gwPrizePremium').value) || 3;
        if (months === 12) usdPricePerWinner = window.sysConfig?.finalPricesUsd?.premium12 || 35.99;
        else if (months === 6) usdPricePerWinner = window.sysConfig?.finalPricesUsd?.premium6 || 15.99;
        else usdPricePerWinner = window.sysConfig?.finalPricesUsd?.premium3 || 11.99;
    } else if (type === 'DefaultGift') {
        const price = parseFloat(document.getElementById('gwPrizeGiftPrice').value) || 0;
        const gasFeeUsd = (window.sysConfig?.blockchainGasFeeTon || 0.06) * getTonUsdRate();
        usdPricePerWinner = (price * RATES.USD.perStar) + gasFeeUsd;
    }

    const totalUsd = usdPricePerWinner * winners;
    const totalTon = totalUsd / getTonUsdRate();

    const btn = document.getElementById('gwCreateBtn');
    btn.innerHTML = `Оплатить ~${totalTon.toFixed(2)} TON`;
    btn.disabled = totalTon <= 0;
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

    const btn = document.getElementById('gwCreateBtn');
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
    const list = document.getElementById(tab === 'my' ? 'gwMyList' : 'gwPartList');
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
            
            let endsAtStr = gw.EndsAt;
            if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
            const endsDate = new Date(endsAtStr);
            const isEnded = endsDate.getTime() <= Date.now();
            
            const statusHtml = isEnded 
                ? `<span style="color:#f07070; font-size:12px;">Завершен</span>`
                : `<span style="color:var(--rent-primary); font-size:12px;">Активен до ${endsDate.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>`;

            return `
                <div class="history-card" style="cursor:pointer;" onclick="showGiveawayInfo('${gw.Id}')">
                    <div class="history-icon" style="background: var(--surface-3);">🎁</div>
                    <div class="history-main">
                        <div class="history-title">Розыгрыш: ${typeName}</div>
                        <div class="history-date">${statusHtml}</div>
                    </div>
                    <div class="history-amount" style="text-align:right;">
                        <div style="font-size:14px; color:var(--text);">${gw.WinnersCount} побед.</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${gw.ParticipantsCount} участн.</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        list.innerHTML = '<div class="profile-empty"><p>Ошибка загрузки</p></div>';
    }
}

window.showGiveawayInfo = async function(id) {
    const res = await apiCall(`/webapp/giveaways/${id}/info`);
    if (res && res.Success) {
        let endsAtStr = res.EndsAt;
        if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
        const endsDate = new Date(endsAtStr);
        const isEnded = endsDate.getTime() <= Date.now();
        
        let prizeName = res.PrizeType;
        let prizeVal = res.Amount;
        if (prizeName === 'TelegramStars' || prizeName === 'Stars') { prizeName = 'Telegram Stars'; prizeVal += ' ⭐️'; }
        else if (prizeName === 'TonTransfer') { prizeName = 'TON'; prizeVal += ' TON'; }
        else if (prizeName === 'Premium') { prizeVal += ' мес.'; }
        else if (prizeName === 'DefaultGift') { prizeName = 'Подарок'; prizeVal = '1 шт.'; }

        let html = `
            <div style="text-align:center; font-size:40px; margin-bottom:10px;">🎁</div>
            <div class="modal-info-row"><span class="modal-info-label">Приз</span><span class=\"modal-info-value\">${prizeName} (${prizeVal})</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Победителей</span><span class=\"modal-info-value\">${res.WinnersCount}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Участников</span><span class=\"modal-info-value\">${res.ParticipantsCount}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Завершение</span><span class=\"modal-info-value\">${endsDate.toLocaleString('ru-RU')}</span></div>
        `;

        if (res.IsCreator && res.Participants && res.Participants.length > 0) {
            html += `<div style="margin-top:15px; font-weight:600; font-size:14px; color:var(--text);">Участники:</div>`;
            html += `<div style="max-height:150px; overflow-y:auto; margin-top:8px; background:var(--surface-3); padding:10px; border-radius:8px;">`;
            res.Participants.forEach(p => {
                html += `<div style="font-size:13px; color:var(--text-secondary); margin-bottom:4px;">${p.Name} <span style="font-size:11px; opacity:0.7;">(${new Date(p.JoinedAt + 'Z').toLocaleString('ru-RU')})</span></div>`;
            });
            html += `</div>`;
        }

        if (!isEnded && res.IsCreator && res.ParticipantsCount === 0) {
            html += `<button class="action-btn outline-action-btn" style="width:100%; margin-top:15px; border-color:#f07070; color:#f07070;" onclick="cancelGiveaway('${id}')">Отменить розыгрыш</button>`;
        }

        showModal('Детали розыгрыша', html);
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