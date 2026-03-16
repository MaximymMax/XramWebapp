// ============================================================
//  rent.js — Страница аренды NFT-подарков
// ============================================================

// ── Справочник ID подарков ────────────────────────────────────
const GIFT_NAME_TO_ID = {
    "Santa Hat": "5983471780763796287", "Signet Ring": "5936085638515261992", "Precious Peach": "5933671725160989227", "Plush Pepe": "5936013938331222567",
    "Spiced Wine": "5913442287462908725", "Jelly Bunny": "5915502858152706668", "Durov's Cap": "5915521180483191380", "Perfume Bottle": "5913517067138499193",
    "Eternal Rose": "5882125812596999035", "Berry Box": "5882252952218894938", "Vintage Cigar": "5857140566201991735", "Magic Potion": "5846226946928673709",
    "Kissed Frog": "5845776576658015084", "Hex Pot": "5825801628657124140", "Evil Eye": "5825480571261813595", "Sharp Tongue": "5841689550203650524",
    "Trapped Heart": "5841391256135008713", "Skull Flower": "5839038009193792264", "Scared Cat": "5837059369300132790", "Spy Agaric": "5821261908354794038",
    "Homemade Cake": "5783075783622787539", "Genie Lamp": "5933531623327795414", "Lunar Snake": "6028426950047957932", "Party Sparkler": "6003643167683903930",
    "Jester Hat": "5933590374185435592", "Witch Hat": "5821384757304362229", "Hanging Star": "5915733223018594841", "Love Candle": "5915550639663874519",
    "Cookie Heart": "6001538689543439169", "Desk Calendar": "5782988952268964995", "Jingle Bells": "6001473264306619020", "Snow Mittens": "5980789805615678057",
    "Voodoo Doll": "5836780359634649414", "Mad Pumpkin": "5841632504448025405", "Hypno Lollipop": "5825895989088617224", "B-Day Candle": "5782984811920491178",
    "Bunny Muffin": "5935936766358847989", "Astral Shard": "5933629604416717361", "Flying Broom": "5837063436634161765", "Crystal Ball": "5841336413697606412",
    "Eternal Candle": "5821205665758053411", "Swiss Watch": "5936043693864651359", "Ginger Cookie": "5983484377902875708", "Mini Oscar": "5879737836550226478",
    "Lol Pop": "5170594532177215681", "Ion Gem": "5843762284240831056", "Star Notepad": "5936017773737018241", "Loot Bag": "5868659926187901653",
    "Love Potion": "5868348541058942091", "Toy Bear": "5868220813026526561", "Diamond Ring": "5868503709637411929", "Sakura Flower": "5167939598143193218",
    "Sleigh Bell": "5981026247860290310", "Top Hat": "5897593557492957738", "Record Player": "5856973938650776169", "Winter Wreath": "5983259145522906006",
    "Snow Globe": "5981132629905245483", "Electric Skull": "5846192273657692751", "Tama Gadget": "6023752243218481939", "Candy Cane": "6003373314888696650",
    "Neko Helmet": "5933793770951673155", "Jack-in-the-Box": "6005659564635063386", "Easter Egg": "5773668482394620318", "Bonded Ring": "5870661333703197240",
    "Pet Snake": "6023917088358269866", "Snake Box": "6023679164349940429", "Xmas Stocking": "6003767644426076664", "Big Year": "6028283532500009446",
    "Holiday Drink": "6003735372041814769", "Gem Signet": "5859442703032386168", "Light Sword": "5897581235231785485", "Restless Jar": "5870784783948186838",
    "Nail Bracelet": "5870720080265871962", "Heroic Helmet": "5895328365971244193", "Bow Tie": "5895544372761461960", "Heart Locket": "5868455043362980631",
    "Lush Bouquet": "5871002671934079382", "Whip Cupcake": "5933543975653737112", "Joyful Bundle": "5870862540036113469", "Cupid Charm": "5868561433997870501",
    "Valentine Box": "5868595669182186720", "Snoop Dogg": "6014591077976114307", "Swag Bag": "6012607142387778152", "Snoop Cigar": "6012435906336654262",
    "Low Rider": "6014675319464657779", "Westside Sign": "6014697240977737490", "Stellar Rocket": "6042113507581755979", "Jolly Chimp": "6005880141270483700",
    "Moon Pendant": "5998981470310368313", "Ionic Dryer": "5933937398953018107", "Input Key": "5870972044522291836", "Mighty Arm": "5895518353849582541",
    "Artisan Brick": "6005797617768858105", "Clover Pin": "5960747083030856414", "Sky Stilettos": "5870947077877400011", "Fresh Socks": "5895603153683874485",
    "Happy Brownie": "6006064678835323371", "Ice Cream": "5900177027566142759", "Spring Basket": "5773725897517433693", "Instant Ramen": "6005564615793050414",
    "Faith Amulet": "6003456431095808759", "Mousse Cake": "5935877878062253519", "Bling Binky": "5902339509239940491", "Money Pot": "5963238670868677492",
    "Pretty Posy": "5933737850477478635", "Khabib's Papakha": "5839094187366024301", "UFC Strike": "5882260270843168924", "Victory Medal": "5830340739074097859"
};

function normalizeName(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function getCollectionIdByName(name) {
    const normSearch = normalizeName(name);
    for (const [key, val] of Object.entries(GIFT_NAME_TO_ID)) {
        const normKey = normalizeName(key);
        if (normKey === normSearch || normKey + 's' === normSearch) return val;
    }
    return null;
}

function getBaseCollectionName(name) {
    const normSearch = normalizeName(name);
    for (const key of Object.keys(GIFT_NAME_TO_ID)) {
        const normKey = normalizeName(key);
        if (normKey === normSearch || normKey + 's' === normSearch) return key;
    }
    return name;
}

// ── Кастомные дропдауны (коллекции / модели) ─────────────────
// Логика перенесена в core.js

window.selectSortOption = function(el) {
    const value = el.dataset.value;
    const label = el.querySelector('.sort-item-label').textContent;

    document.getElementById('rentSortLabel').textContent = label;
    document.querySelectorAll('#sortMenu .sort-dd-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');

    const sel = document.getElementById('rentSort');
    if (sel) sel.value = value;

    document.getElementById('sortDropdown').classList.remove('open');
    loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, true);
}

window.onRentSortChange = function() {
    loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, true);
}

// ── Категории ─────────────────────────────────────────────────
async function switchRentCategory(category, btn) {
    if (state.rentCategory === category && window.currentRentOffers && window.currentRentOffers.length > 0) {
        if (btn) {
            document.querySelectorAll('#rentCategoryTabs .ptab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
        }
        return;
    }

    state.rentCategory = category;
    document.querySelectorAll('#rentCategoryTabs .ptab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const colWrap = document.getElementById('rentCollectionWrap');
    const modWrap = document.getElementById('rentModelWrap');

    if (category === 'gifts') {
        colWrap.style.display = 'block';
        modWrap.style.display = 'none';
        state.currentCollection = '';
        state.currentCollectionName = '';
        state.currentModel = '';

        document.getElementById('colTriggerName').textContent = 'Загрузка...';
        document.getElementById('colTriggerPrice').style.display = 'none';
        document.getElementById('colTriggerImg').style.display = 'none';
        document.getElementById('colMenu').innerHTML = '';

        const res = await apiCall('/webapp/rent/collections', { category });
        if (res && res.Success && res.Collections.length > 0) {
            let html = `<div class="dd-item" onclick="onCollectionSelected('', 'Все коллекции', 0, '')">
                            <span class="dd-item-name">Все коллекции</span>
                        </div>`;
            res.Collections.forEach(c => {
                const colId = getCollectionIdByName(c.Name);
                const imgSrc = colId ? `https://cdn.changes.tg/gifts/originals/${colId}/Original.png` : c.ImageUrl;
                const floorText = c.RentFloorTon > 0 ? `от ${formatTonPrice(c.RentFloorTon)}/дн` : '';
                html += `
                    <div class="dd-item" onclick="onCollectionSelected('${c.Address}', '${c.Name}', ${c.RentFloorTon}, '${imgSrc}')">
                        <img class="dd-item-img" src="${imgSrc}" style="display:block" onerror="this.style.display='none'">
                        <span class="dd-item-name">${c.Name}</span>
                        <span class="dd-item-price">${floorText}</span>
                    </div>`;
            });
            document.getElementById('colMenu').innerHTML = html;
            onCollectionSelected('', 'Все коллекции', 0, '');
        }
    } else {
        colWrap.style.display = 'none';
        modWrap.style.display = 'none';
        state.currentCollection = '';
        state.currentModel = '';
        await loadRentOffers(category, '', null, true);
    }
}

window.onCollectionSelected = async function(address, name, rentFloor, imgSrc) {
    document.getElementById('collectionDropdown').classList.remove('open');
    document.getElementById('colTriggerName').textContent = name;

    const priceEl = document.getElementById('colTriggerPrice');
    if (rentFloor > 0) { priceEl.textContent = `от ${formatTonPrice(rentFloor)}/дн`; priceEl.style.display = 'block'; }
    else { priceEl.style.display = 'none'; }

    const imgEl = document.getElementById('colTriggerImg');
    if (imgSrc) { imgEl.src = imgSrc; imgEl.style.display = 'block'; }
    else { imgEl.style.display = 'none'; }

    state.currentCollection = address;
    state.currentCollectionName = name;
    state.currentModel = '';

    const modWrap = document.getElementById('rentModelWrap');
    if (address) {
        modWrap.style.display = 'block';
        document.getElementById('modTriggerName').textContent = 'Загрузка моделей...';
        document.getElementById('modTriggerPrice').style.display = 'none';
        document.getElementById('modTriggerImg').style.display = 'none';
        document.getElementById('modMenu').innerHTML = '';

        const modelsRes = await apiCall('/webapp/rent/models', { collectionAddress: address });

        let mHtml = `<div class="dd-item" onclick="onModelSelected('', 'Все модели', 0, '')">
                        <span class="dd-item-name">Все модели</span>
                     </div>`;
        if (modelsRes && modelsRes.Success && modelsRes.Models) {
            const baseName = getBaseCollectionName(name);
            modelsRes.Models.forEach(m => {
                const mImgSrc = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(baseName)}/png/${encodeURIComponent(m.ModelName)}.png`;
                const mFloorText = m.RentFloorTon > 0 ? `от ${formatTonPrice(m.RentFloorTon)}/дн` : '';
                mHtml += `
                    <div class="dd-item" onclick="onModelSelected('${m.ModelName}', '${m.ModelName}', ${m.RentFloorTon}, '${mImgSrc}')">
                        <img class="dd-item-img" src="${mImgSrc}" style="display:block" onerror="this.style.display='none'">
                        <span class="dd-item-name">${m.ModelName}</span>
                        <span class="dd-item-price">${mFloorText}</span>
                    </div>`;
            });
        }
        document.getElementById('modMenu').innerHTML = mHtml;
        onModelSelected('', 'Все модели', 0, '');
    } else {
        modWrap.style.display = 'none';
        await loadRentOffers(state.rentCategory, '', null, true);
    }
}

window.onModelSelected = async function(modelId, modelName, rentFloor, imgSrc) {
    document.getElementById('modelDropdown').classList.remove('open');
    document.getElementById('modTriggerName').textContent = modelName;

    const priceEl = document.getElementById('modTriggerPrice');
    if (rentFloor > 0) { priceEl.textContent = `от ${formatTonPrice(rentFloor)}/дн`; priceEl.style.display = 'block'; }
    else { priceEl.style.display = 'none'; }

    const imgEl = document.getElementById('modTriggerImg');
    if (imgSrc) { imgEl.src = imgSrc; imgEl.style.display = 'block'; }
    else { imgEl.style.display = 'none'; }

    state.currentModel = modelId;
    await loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, true);
}

// ── Lazy Load Observer ────────────────────────────────────────
let _rentImgObserver = null;

function initRentImageObserver() {
    if (_rentImgObserver) _rentImgObserver.disconnect();
    _rentImgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    _rentImgObserver.unobserve(img);
                }
            }
        });
    }, { rootMargin: '100px 0px', threshold: 0.01 });
}

function observeRentImages(container) {
    if (!_rentImgObserver) initRentImageObserver();
    container.querySelectorAll('img[data-src]').forEach(img => _rentImgObserver.observe(img));
}

// ── Загрузка карточек ─────────────────────────────────────────
async function loadRentOffers(category, collectionAddress, model, reset = true) {
    const btn = document.getElementById('rentLoadMoreBtn');

    if (reset) {
        state.nextCursor = null;
        window.currentRentOffers = [];
        document.getElementById('rentCardsContainer').innerHTML = '<div class="rent-cards-empty">⏳ Загрузка...</div>';
        if (btn) btn.style.display = 'none';
        if (_rentImgObserver) _rentImgObserver.disconnect();
        _rentImgObserver = null;
    } else {
        if (btn) { btn.textContent = 'Загружаем...'; btn.disabled = true; }
    }

    const sortBy = document.getElementById('rentSort')?.value || 'recently_touch';
    const params = { category, sortBy };
    if (collectionAddress) params.collection = collectionAddress;
    if (model) params.model = model;
    if (state.nextCursor) params.cursor = state.nextCursor;

    const res = await apiCall('/webapp/rent/offers', params);

    if (res && res.Success) {
        if (reset) document.getElementById('rentCardsContainer').innerHTML = '';

        if (res.Offers && res.Offers.length > 0) {
            window.currentRentOffers.push(...res.Offers);
            const container = document.getElementById('rentCardsContainer');
            const fragment = document.createDocumentFragment();

            res.Offers.forEach(o => {
                const card = document.createElement('div');
                card.className = 'rent-card page-rent-theme';
                card.onclick = () => openRentModal(o.NftAddress);

                const img = document.createElement('img');
                img.dataset.src = o.ImageUrl;
                img.alt = 'NFT';
                img.className = 'rent-card-img-lazy';
                img.onerror = function() { this.style.opacity = '0.3'; };

                const content = document.createElement('div');
                content.className = 'rent-card-content';
                content.innerHTML = `
                    <div class="rent-card-name">${o.Name}</div>
                    <div class="rent-card-price" data-nft="${o.NftAddress}">~${formatTonPrice(o.PriceTon)} / дн</div>`;

                card.appendChild(img);
                card.appendChild(content);
                fragment.appendChild(card);
            });

            container.appendChild(fragment);
            observeRentImages(container);

            state.nextCursor = res.NextCursor;
            if (btn) {
                if (state.nextCursor) { btn.style.display = 'block'; btn.textContent = 'Показать еще'; btn.disabled = false; }
                else { btn.style.display = 'none'; }
            }

            const countEl = document.getElementById('rentCardsCount');
            if (countEl) countEl.textContent = res.Total ? `(${res.Total})` : '';

        } else if (reset) {
            const countEl = document.getElementById('rentCardsCount');
            if (countEl) countEl.textContent = '(0)';
            document.getElementById('rentCardsContainer').innerHTML = '<div class="rent-cards-empty">Нет предложений</div>';
        }
    } else if (reset) {
        document.getElementById('rentCardsContainer').innerHTML = '<div class="rent-cards-empty">Ошибка загрузки</div>';
    }
}

window.loadNextRentPage = function() {
    if (state.nextCursor) loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, false);
}

// ── Модальное окно аренды ─────────────────────────────────────
window.openRentModal = function(address) {
    const offer = window.currentRentOffers.find(o => o.NftAddress === address);
    if (!offer) return;

    state.rentNftAddress = offer.NftAddress;
    state.rentNftName = offer.Name;
    state.rentMinDays = offer.MinDays;
    state.rentMaxDays = offer.MaxDays;
    state.rentImageUrl = offer.ImageUrl;
    window.RENT_TON_PER_DAY = offer.PriceTon;
    state.rentDays = offer.MinDays;
    const totalTon = window.RENT_TON_PER_DAY * state.rentDays;
    const balNum = tonConnect.balance !== null ? parseFloat(tonConnect.balance) : 0;
    const isEnough = balNum >= totalTon;
    const balClass = isEnough ? 'selected' : '';
    const otherClass = !isEnough ? 'selected' : '';
    const balStyle = !isEnough ? 'opacity: 0.4; pointer-events: none;' : '';
    
    if (isEnough) {
        state.pay.rent = { method: 'InternalWallet', currency: 'TON' };
    } else {
        state.pay.rent = { method: 'TelegramStars', currency: 'Stars' };
    }

    const balIndicatorHtml = `
    <div class="modal-balance-top" style="margin-top:10px;">
        <div class="mbt-left">
            <svg viewBox="0 0 56 56" fill="none" width="22" height="22"><path d="M28 4L4 18V38L28 52L52 38V18L28 4Z" fill="#0098EA"/><path d="M28 4L4 18L28 32L52 18L28 4Z" fill="#5BC3F5"/><path d="M28 32V52L52 38V18L28 32Z" fill="#A8DBF7"/><path d="M4 18V38L28 52V32L4 18Z" fill="#A8DBF7"/></svg>
            <span style="font-size: 13.5px; font-weight: 600; color: var(--text-secondary);">Ваш баланс:</span>
        </div>
        <span style="font-size: 16px; font-weight: 800; color: var(--text);">${balNum.toFixed(2)} TON</span>
    </div>`;

    showModal('Аренда NFT', `
        ${balIndicatorHtml}
        <div style="display:flex; gap:14px; margin-bottom:16px; align-items:center; margin-top:10px" class="page-rent-theme">
            <img src="${offer.ImageUrl}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;background:var(--surface-3)" onerror="this.style.display='none'">
            <div style="min-width:0; flex:1">
                <div style="font-weight:800; font-size:16px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${offer.Name}</div>
                <a href="${offer.TelegramUrl}" target="_blank" style="color:var(--rent-primary); font-size:12px; font-weight:600; text-decoration:none;">🔗 Открыть в Telegram</a>
            </div>
        </div>

        <label class="form-label">Срок аренды (от ${offer.MinDays} до ${offer.MaxDays} дней)</label>
        <input type="number" id="modalRentDays" class="form-input" value="${state.rentDays}" min="${offer.MinDays}" max="${offer.MaxDays}" oninput="updateRentModalPrice()">
        <div id="modalRentError" class="rent-error-msg"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">К оплате:</span>
            <div style="text-align:right" id="modalRentTotalBlock">
                <div style="font-size:22px; font-weight:800; color:var(--text)" id="modalRentTotalUsd">$0.00</div>
                <div style="font-size:13px; font-weight:600; color:var(--text-muted)" id="modalRentTotalAlt">(≈ 0.00)</div>
            </div>
        </div>

        <label class="form-label">Способ оплаты</label>
        <div class="payment-methods page-rent-theme" style="display:flex; gap:8px; margin-bottom:8px;">
            <div class="pay-method ${balClass}" style="flex:1; padding: 14px 10px; font-size: 13.5px; display:flex; flex-direction:column; gap:2px; ${balStyle}" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('rent', this)">
                <span>Оплатить со счета</span>
            </div>
            <div class="pay-method" style="flexShrink:0; width:110px; display:flex; align-items:center; justify-content:center; gap:6px; background:var(--wallet-dim); border-color:var(--wallet-primary); color:var(--wallet-primary); padding:13px 10px; font-size:12.5px;" onclick="closeModal(); switchTab('wallet');">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Пополнить
            </div>
        </div>
        <div class="payment-methods page-rent-theme">
            <div class="pay-method ${otherClass}" style="grid-column: span 2" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('rent', this)">Звёзды (Telegram)</div>
        </div>

        <button class="action-btn rent-action-btn" id="modalRentBtn" onclick="apiRentGift()" style="width:100%; margin:0">Оплатить аренду</button>
    `);

    updateRentModalPrice();
}

window.updateRentModalPrice = function() {
    const input = document.getElementById('modalRentDays');
    const errorMsg = document.getElementById('modalRentError');
    const btn = document.getElementById('modalRentBtn');
    
    let days = parseInt(input.value);
    if (isNaN(days)) days = 0;
    state.rentDays = days;

    if (days < state.rentMinDays || days > state.rentMaxDays) {
        errorMsg.textContent = `Укажите от ${state.rentMinDays} до ${state.rentMaxDays} дней`;
        errorMsg.style.display = 'block'; btn.disabled = true; btn.style.opacity = '0.5';
    } else {
        errorMsg.style.display = 'none'; btn.disabled = false; btn.style.opacity = '1';
        
        const totalTon = window.RENT_TON_PER_DAY * days;
        const usdTotal = totalTon * getTonUsdRate();
        
        if (state.pay.rent && state.pay.rent.method === 'TelegramStars') {
            // ИСПОЛЬЗУЕМ НОВЫЙ КУРС ПРИЕМА ЗВЕЗД (RATES.USD.starDeposit)
            document.getElementById('modalRentTotalUsd').textContent = `${Math.ceil(usdTotal / RATES.USD.starDeposit)} ⭐️`;
            document.getElementById('modalRentTotalAlt').textContent = `(≈ $${usdTotal.toFixed(2)})`;
        } else {
            document.getElementById('modalRentTotalUsd').textContent = `$${usdTotal.toFixed(2)}`;
            document.getElementById('modalRentTotalAlt').textContent = `(≈ ${formatTonPrice(totalTon)})`;
        }
    }
}

window.apiRentGift = async function() {
    const days = state.rentDays;
    if (days < state.rentMinDays || days > state.rentMaxDays) return safeAlert(`Доступно от ${state.rentMinDays} до ${state.rentMaxDays} дней`);
    const pm = state.pay.rent.method;
    const pc = state.pay.rent.currency;
    const btn = document.getElementById('modalRentBtn');

    // Если внутренний кошелек, показываем Lottie-загрузку сразу
    if (pm === 'InternalWallet') {
        closeModal();
        showTxLoading();
    } else {
        setLoading(btn, true);
    }

    // Делаем запрос к серверу
    const result = await apiCall('/transactions/create/rent', {
        telegramId, currency: pc, method: pm,
        nftAddress: state.rentNftAddress,
        nftName: state.rentNftName,
        days,
        pricePerDayTon: window.RENT_TON_PER_DAY,
        category: state.rentCategory,
        imageUrl: state.rentImageUrl
    });

    // Обрабатываем ответ
    if (pm === 'InternalWallet') {
        if (result && result.Success) {
            showTxResult(true, "Аренда оформлена!", `Вы успешно арендовали NFT на ${days} дн.`, `<div style="text-align:center">Нажмите «Закрыть», чтобы перейти к установке NFT.</div>`, () => {
                switchTab('profile');
                setTimeout(() => switchProfileTab('rentals', document.querySelectorAll('#page-profile .ptab')[2]), 50);
            });
            fetchServerData();
            loadProfile();
        } else {
            showTxResult(false, "Сбой аренды", result?.Error || "Ошибка списания средств", "");
        }
    } else {
        setLoading(btn, false);
        if (result && result.Success) { 
            closeModal(); 
            handleTxFlow(result); 
        }
        else if (result) { safeAlert('Ошибка: ' + result.Error); }
    }
}

// ── TonConnect (установка NFT) ────────────────────────────────
window.openTonConnectModal = function(nftAddress) {
    showModal('Установка NFT', `
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">
            1. Откройте настройки Telegram → Ваш Профиль → Подарки.<br>
            2. Выберите эту модель и нажмите «Выставить в профиль».<br>
            3. Скопируйте ссылку Ton Connect (начинается с <b>tc://</b>) и вставьте её в поле ниже.
        </p>
        <input type="text" id="tcUriInput" class="form-input" placeholder="tc://..." style="margin-bottom: 14px">
        <button class="action-btn rent-action-btn" onclick="submitTonConnectUri('${nftAddress}')" style="width:100%; margin:0">Подключить</button>
    `);
}

window.submitTonConnectUri = async function(nftAddress) {
    const uri = document.getElementById('tcUriInput').value.trim();
    if (!uri.startsWith('tc://')) return safeAlert('Ссылка должна начинаться с tc://');

    const btn = document.querySelector('.rent-action-btn');
    setLoading(btn, true);

    try {
        // Отправляем POST-запрос, чтобы длинная ссылка не обрезалась сервером
        const response = await fetch(`${API_BASE}/webapp/rent/connect`, {
            method: 'POST',
            headers: { 
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nftAddress: nftAddress, 
                uri: uri // Отправляем 'uri', как того ждет твой C# контроллер
            })
        });
        
        const res = await response.json();
        setLoading(btn, false);

        if (res && res.Success) {
            safeAlert('✅ Кошелек успешно подключен! NFT появится в профиле.');
            closeModal();
        } else {
            // Обрезаем длинную ошибку, чтобы не крашнулся Telegram WebApp
            let errorMsg = res?.Error || JSON.stringify(res);
            if (errorMsg.length > 100) {
                errorMsg = 'Неверный формат ссылки или ошибка сервера.';
            }
            safeAlert('❌ Ошибка: ' + errorMsg);
        }
    } catch (e) {
        setLoading(btn, false);
        safeAlert('❌ Ошибка сети при подключении');
    }
}
