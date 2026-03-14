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
        loadGiveawaysList(tab, false); // false убирает мерцание загрузки
    }
}

window.fetchAllGiveaways = async function() {
    // Ждем загрузку обеих вкладок одновременно
    await Promise.all([
        loadGiveawaysList('participating', false),
        loadGiveawaysList('my', false)
    ]);
}

// ── Кастомные дропдауны ─────────────────────────────────────
window.selectGwPrize = function(val, elem) {
    document.getElementById('gwPrizeType').value = val;
    document.getElementById('gwPrizeLabel').textContent = elem.textContent;
    
    // Подсветка выбранного
    elem.parentNode.querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');

    document.getElementById('gwInputStarsWrap').style.display = val === 'TelegramStars' ? 'block' : 'none';
    document.getElementById('gwInputTonWrap').style.display = val === 'TonTransfer' ? 'block' : 'none';
    document.getElementById('gwInputPremiumWrap').style.display = val === 'Premium' ? 'block' : 'none';
    
    updateGwCreatePrice();
}

window.selectGwPremium = function(months, elem) {
    document.getElementById('gwPrizePremium').value = months;
    document.getElementById('gwPremLabel').textContent = elem.textContent;
    
    elem.parentNode.querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');
    updateGwCreatePrice();
}

// ── Инициализация красивых списков даты и времени ───────────
function initGwDateSelectors() {
    const dateMenu = document.getElementById('gwDateMenu');
    const timeMenu = document.getElementById('gwTimeMenu');
    if(!dateMenu || !timeMenu || dateMenu.innerHTML.trim() !== '') return;

    const locale = window.currentLang === 'en' ? 'en-US' : 'ru-RU';
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' });
    const today = new Date();
    
    let dateHtml = '';
    let firstDateStr = '';
    
    // Генерируем 14 дней вперед, начиная с завтрашнего
    for(let i = 1; i <= 14; i++) {
        let d = new Date();
        d.setDate(today.getDate() + i);
        
        let label = formatter.format(d);
        if (i === 1) label = (window.currentLang === 'en' ? 'Tomorrow (' : 'Завтра (') + label + ')';
        else if (i === 2) label = (window.currentLang === 'en' ? 'Day after (' : 'Послезавтра (') + label + ')';

        let val = d.toISOString().split('T')[0];
        if (i === 1) firstDateStr = val;

        dateHtml += `<div class="sort-dd-item ${i===1?'selected':''}" onclick="selectGwDate('${val}', '${label}', this)"><span class="sort-item-label">${label}</span></div>`;
    }
    dateMenu.innerHTML = dateHtml;
    document.getElementById('gwSelectedDate').value = firstDateStr;
    document.getElementById('gwDateLabel').textContent = dateMenu.querySelector('.selected .sort-item-label').textContent;

    // Генерируем время каждые 30 минут
    let timeHtml = '';
    let firstTimeStr = '12:00';
    for(let h = 0; h < 24; h++) {
        for(let m of ['00', '30']) {
            let t = `${h.toString().padStart(2, '0')}:${m}`;
            timeHtml += `<div class="sort-dd-item ${t===firstTimeStr?'selected':''}" onclick="selectGwTime('${t}', this)"><span class="sort-item-label">${t}</span></div>`;
        }
    }
    timeMenu.innerHTML = timeHtml;
    document.getElementById('gwSelectedTime').value = firstTimeStr;
    document.getElementById('gwTimeLabel').textContent = firstTimeStr;
}

// Запускаем инициализацию при загрузке скрипта
setTimeout(initGwDateSelectors, 300);

window.selectGwDate = function(val, label, elem) {
    document.getElementById('gwSelectedDate').value = val;
    document.getElementById('gwDateLabel').textContent = label;
    elem.parentNode.querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');
    updateGwCreatePrice();
}

window.selectGwTime = function(val, elem) {
    document.getElementById('gwSelectedTime').value = val;
    document.getElementById('gwTimeLabel').textContent = val;
    elem.parentNode.querySelectorAll('.sort-dd-item').forEach(el => el.classList.remove('selected'));
    elem.classList.add('selected');
    updateGwCreatePrice();
}

// ── Создание розыгрыша ──────────────────────────────────────
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
        const months = parseInt(document.getElementById('gwPrizePremium').value);
        usdPricePerWinner = months === 12 ? window.finalPrices.premium12 : (months === 6 ? window.finalPrices.premium6 : window.finalPrices.premium3);
    }

    const totalUsd = usdPricePerWinner * winners;
    const totalTon = totalUsd / getTonUsdRate();

    document.getElementById('gwTotalCostUsd').textContent = typeof formatTonPrice === 'function' ? formatTonPrice(totalTon) : `$${totalUsd.toFixed(2)}`;
    document.getElementById('gwTotalCostTon').textContent = `(≈ ${totalTon.toFixed(2)} TON)`;

    // Проверка баланса
    const userBalance = parseFloat(document.getElementById('homeTonBalance').textContent) || 0;
    const submitBtn = document.getElementById('gwSubmitBtn');
    const topupBtn = document.getElementById('gwTopupBtn');
    
    if (totalTon > userBalance) {
        submitBtn.disabled = true;
        submitBtn.classList.add('outline-action-btn'); 
        topupBtn.style.display = 'flex'; 
    } else {
        submitBtn.disabled = false;
        submitBtn.classList.remove('outline-action-btn'); 
        topupBtn.style.display = 'none'; 
    }
}

window.openGwPaymentModal = function() {
    const type = document.getElementById('gwPrizeType').value;
    const winners = parseInt(document.getElementById('gwWinnersCount').value) || 1;
    
    // Считываем дату и время из новых красивых селекторов
    const dateVal = document.getElementById('gwSelectedDate').value;
    const timeVal = document.getElementById('gwSelectedTime').value;
    const endDate = new Date(`${dateVal}T${timeVal}:00`);
    
    const diffMs = endDate.getTime() - Date.now();
    const minutes = Math.floor(diffMs / 60000);

    const minError = window.currentLang === 'en' ? "Minimum duration is 1 day (24 hours)" : "Минимальная длительность - 1 день (24 часа)";
    if (minutes < 1440) return safeAlert(minError);

    let amount = 0;
    if (type === 'TelegramStars') {
        amount = parseFloat(document.getElementById('gwPrizeStars').value);
        if (amount < 50) return safeAlert("Минимальное количество звезд: 50");
    } else if (type === 'TonTransfer') {
        amount = parseFloat(document.getElementById('gwPrizeTon').value);
        if (amount < 0.5) return safeAlert("Минимальная сумма: 0.5 TON");
    } else if (type === 'Premium') {
        amount = parseInt(document.getElementById('gwPrizePremium').value);
    }

    if (winners < 1) return safeAlert("Должен быть хотя бы 1 победитель");

    safeConfirm('Списать средства с внутреннего баланса TON и запустить розыгрыш?', async (ok) => {
        if (!ok) return;

        showTxLoading(); // Показываем Lottie-ожидание

        const res = await apiCall('/transactions/create/giveaway', { type, amount, winners, minutes });
        
        if (res && res.Success) {
            const detailsHtml = `<div style="margin-bottom:8px">Ссылка скопирована в буфер:</div><div class="cheque-link-input" style="user-select:all; padding:10px; background:var(--bg); border-radius:8px; word-break:break-all;">${res.InviteLink}</div>`;
            showTxResult(true, "Розыгрыш запущен!", "Средства заморожены на балансе.", detailsHtml);
            
            navigator.clipboard.writeText(res.InviteLink);
            switchGiveawayTab('my', document.querySelectorAll('#page-giveaways .ptab')[2]);
            if (typeof fetchServerData === 'function') fetchServerData();
        } else {
            showTxResult(false, "Ошибка создания", res?.Error || 'Не удалось списать средства.', "");
        }
    });
}

// ── Отмена розыгрыша ─────────────────────────────────────────
window.cancelGiveaway = async function(gwId) {
    safeConfirm('Вы уверены, что хотите отменить розыгрыш? Средства будут возвращены на баланс.', async (ok) => {
        if (!ok) return;
        
        // POST запрос на отмену
        const res = await apiCall(`/webapp/giveaways/${gwId}/cancel`);
        if (res && res.Success) {
            safeAlert('Розыгрыш отменен. Средства разморожены.');
            loadGiveawaysList('my'); // Обновляем список
            if (typeof fetchServerData === 'function') fetchServerData(); // <--- ИСПРАВЛЕНО
        } else {
            safeAlert(res?.Error || 'Не удалось отменить розыгрыш');
        }
    });
}

// ── Списки с Таймерами ──────────────────────────────────────
async function loadGiveawaysList(tab, showLoading = true) {
    const container = document.getElementById(tab === 'my' ? 'gwMyList' : 'gwParticipatingList');
    
    // Показываем "Загрузка..." только если контейнер пустой или если запросили явно
    if (showLoading && container.innerHTML.trim() === '') {
        container.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';
    }

    const res = await apiCall(`/webapp/giveaways/list?type=${tab}`);
    if (res && res.Success) {
        if (!res.Items.length) return container.innerHTML = `<div class="profile-empty"><p>Пусто</p></div>`;
        
        container.innerHTML = res.Items.map(g => {
            // ФИКС ЧАСОВОГО ПОЯСА
            let endsAtStr = g.EndsAt;
            if (endsAtStr && !endsAtStr.endsWith('Z')) endsAtStr += 'Z';
            
            return `
            <div class="history-item" style="flex-direction:column; align-items:stretch; cursor:pointer;" onclick="openGiveawayJoin('${g.Id}')">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="font-weight:700">${g.PrizeType} ${g.PrizeType === 'Premium' ? g.Amount + ' мес' : ''} x${g.WinnersCount}</span>
                    <div class="countdown-timer" data-ends="${endsAtStr}" data-timeout-text="Завершено" style="font-size:12px; color:var(--rent-primary); font-weight:700;">Считаем...</div>
                </div>
                <div style="font-size:12px; color:var(--text-muted)">Участников: ${g.ParticipantsCount}</div>
                <div style="display:flex; gap: 8px; margin-top:12px">
                    ${tab === 'my' ? `<button class="action-btn outline-action-btn" style="flex:1; margin:0; padding:8px; font-size:12px;" onclick="event.stopPropagation(); navigator.clipboard.writeText('${g.InviteLink}'); safeAlert('Скопировано');">🔗 Копировать</button>` : ''}
                    ${tab === 'my' && g.ParticipantsCount === 0 ? `<button class="action-btn" style="flex:1; margin:0; padding:8px; font-size:12px; background: rgba(255, 69, 58, 0.15); color: #ff453a; border: none;" onclick="event.stopPropagation(); cancelGiveaway('${g.Id}')">❌ Отменить</button>` : ''}
                </div>
            </div>`
        }).join('');
    }
}

// ── Полноэкранная Модалка с открытой Капчей ─────────────────
// ── Полноэкранная Модалка с открытой Капчей и Видом для Автора ──
let currentGiveawayId = null;

window.openGiveawayJoin = async function(gwId) {
    const modal = document.getElementById('giveawayJoinModal');
    const content = document.getElementById('giveawayJoinContent');
    content.innerHTML = '<div style="text-align:center; padding: 40px 0;"><p>Загрузка розыгрыша...</p></div>';
    modal.style.display = 'flex';

    const res = await apiCall(`/webapp/giveaways/${gwId}/info`);
    if (!res || !res.Success) {
        modal.style.display = 'none';
        return safeAlert('Розыгрыш не найден или завершен');
    }

    let html = `
        <div style="text-align:center;">
            <div style="font-size:54px; margin-bottom:10px;">${res.PrizeType === 'Stars' ? '⭐️' : '💎'}</div>
            <h2 style="margin-bottom:6px; font-size:22px;">Приз: ${res.Amount} ${res.PrizeType}</h2>
            <p style="color:var(--text-secondary); font-size:14px; margin-bottom:16px;">
                Победителей: <b>${res.WinnersCount}</b> • Участников: <b>${res.ParticipantsCount}</b>
            </p>
            
            <div style="background: var(--surface-3); padding: 14px; border-radius: 16px; margin-bottom: 24px;">
                <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">До конца:</span>
                <div class="countdown-timer" data-ends="${res.EndsAt}" data-timeout-text="Завершено" style="font-size: 24px; font-weight: 800; color: var(--text); margin-top: 4px;">Считаем...</div>
            </div>
    `;

    // === ЛОГИКА ДЛЯ СОЗДАТЕЛЯ РОЗЫГРЫША ===
    if (res.IsCreator) {
        html += `<div style="text-align:left; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                    <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase;">Список участников:</div>`;
        
        if (res.Participants && res.Participants.length > 0) {
            html += res.Participants.map(p => `
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-strong); font-size: 13px;">
                    <span style="color: var(--text); font-weight: 600;">${p.Name}</span>
                    <span style="color: var(--text-muted); font-family: monospace;">${p.Id}</span>
                </div>
            `).join('');
        } else {
            html += `<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 10px 0;">Пока никто не присоединился</div>`;
        }
        html += `</div>`;
        
        html += `<button class="action-btn outline-action-btn" style="width:100%; margin:0 0 10px; pointer-events:none;">Это ваш розыгрыш 👑</button>`;
        html += `<button class="action-btn" style="width:100%; margin:0; background: var(--surface-3); color: var(--text);" onclick="document.getElementById('giveawayJoinModal').style.display='none'">Закрыть</button></div>`;
        content.innerHTML = html;
        return; // Выходим, чтобы не рисовать капчу
    }

    // === ЛОГИКА ДЛЯ ОБЫЧНОГО УЧАСТНИКА ===
    if (res.IsJoined) {
        html += `<button class="action-btn outline-action-btn" style="width:100%; margin:0 0 10px; pointer-events:none;">Вы уже участвуете ✅</button>`;
        html += `<button class="action-btn" style="width:100%; margin:0; background: var(--surface-3); color: var(--text);" onclick="document.getElementById('giveawayJoinModal').style.display='none'">Закрыть</button></div>`;
        content.innerHTML = html;
    } else {
        html += `<div id="inlineCaptcha" style="margin-bottom: 20px;"><p style="font-size:13px; color:var(--text-secondary);">Подготовка проверки на бота...</p></div>`;
        html += `<button class="action-btn outline-action-btn" style="width:100%; margin:0;" onclick="document.getElementById('giveawayJoinModal').style.display='none'">Отмена</button></div>`;
        content.innerHTML = html;

        currentGiveawayId = gwId;
        const capRes = await apiCall(`/webapp/giveaways/${gwId}/captcha`);
        const capDiv = document.getElementById('inlineCaptcha');
        
        if (capRes && capRes.Success) {
            capDiv.innerHTML = `
                <div style="border-top: 1px solid var(--border); margin: 20px 0;"></div>
                <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 14px;">
                    Для участия выберите: <b style="color: var(--text); font-size: 16px;">${capRes.TargetName}</b>
                </p>
                <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    ${capRes.Emojis.map(emoji => `
                        <button onclick="submitCaptcha('${emoji}')" style="font-size: 28px; background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 12px; width: 50px; height: 50px; cursor: pointer; display:flex; align-items:center; justify-content:center;">
                            ${emoji}
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            capDiv.innerHTML = `<p style="color:#ff453a; font-size:13px;">${capRes?.Error || 'Ошибка загрузки капчи'}</p>`;
        }
    }
}

// Отправка открытой капчи
window.submitCaptcha = async function(emoji) {
    const capDiv = document.getElementById('inlineCaptcha');
    capDiv.innerHTML = `<p style="color:var(--text-secondary); font-size:14px;">Проверка...</p>`;
    
    const res = await apiCall(`/webapp/giveaways/${currentGiveawayId}/join?emoji=${encodeURIComponent(emoji)}`);
    if (res && res.Success) {
        document.getElementById('giveawayJoinModal').style.display = 'none';
        safeAlert(res.Message);
        if(document.getElementById('gwTabParticipating')?.style.display === 'block') loadGiveawaysList('participating');
    } else {
        document.getElementById('giveawayJoinModal').style.display = 'none';
        safeAlert(res?.Error || 'Неверно!');
    }
}