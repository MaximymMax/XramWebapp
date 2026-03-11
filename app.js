const tg = window.Telegram.WebApp;
const isTWA = !!(tg.initData && tg.initData.length > 0);

if (isTWA) { tg.expand(); tg.ready(); }

const authHeader = isTWA
    ? `twa ${tg.initData}`
    : (sessionStorage.getItem('xram_auth_key') || 'Bearer 7343414766:lrHJvb5m2rPNo0K33y/z1UIjMPPEVgvYIGSupfvlBBA=');

const BOT_USERNAME = "XramMagazinBot"; 

// --- КАСТОМНЫЕ УВЕДОМЛЕНИЯ ВМЕСТО БРАУЗЕРНЫХ ---
let _dialogCallback = null;

function showCustomDialog(msg, isConfirm, cb) {
    document.getElementById('customDialogText').textContent = msg;
    document.getElementById('customDialogCancel').style.display = isConfirm ? 'block' : 'none';
    _dialogCallback = cb;
    document.getElementById('customDialogOverlay').classList.add('show');
}

window.closeCustomDialog = function(result) {
    document.getElementById('customDialogOverlay').classList.remove('show');
    if (_dialogCallback) {
        _dialogCallback(result);
        _dialogCallback = null;
    }
}

function safeAlert(msg) { 
    if (isTWA) { tg.showAlert(msg); } 
    else { showCustomDialog(msg, false, null); }
}

function safeConfirm(msg, cb) { 
    if (isTWA) { tg.showConfirm(msg, cb); } 
    else { showCustomDialog(msg, true, cb); }
}
// ------------------------------------------------

const user = tg.initDataUnsafe?.user || { id: 851524456, username: 'alwys_online', first_name: 'Тест' };
const telegramId = user.id;
const API_BASE = 'https://xrambot.azurewebsites.net/api';
const tonConnect = { connected: false, address: null, balance: null, frozenBalance: null };

let RATES = { USD: { tonUsd: 2.0, perStar: 0.015 }, RUB: { tonUsd: 180, perStar: 1.35 }, TON: { tonUsd: 1, perStar: 0.0075 } };
let PREMIUM_TON = { 3: 6, 6: 10, 12: 18 };
const RUB_PER_USD = 95; 

const state = {
    stars: 50, starsCustom: false, premium: 3, currency: 'USD', topupAmount: 1, useCustomTopup: false,
    
    rentCategory: 'gifts',
    rentNftAddress: null, rentNftName: null, rentDays: 1, rentMinDays: 1, rentMaxDays: 180,
    currentCollection: '', currentCollectionName: '', currentModel: '', nextCursor: null,
    
    starsRecipientMode: 'self', starsChequeHours: 1, premiumRecipientMode: 'self', premiumChequeHours: 1,
    _usernameTimers: {},
    _validatedUsername: {}, // храним последний успешно проверенный юзернейм

    pay: {
        stars: { method: 'InternalWallet', currency: 'TON' },
        premium: { method: 'InternalWallet', currency: 'TON' },
        rent: { method: 'InternalWallet', currency: 'TON' }
    }
};

window.currentHistory = [];
window.currentRentOffers = [];

async function apiCall(endpoint, params = {}) {
    try {
        const qs = new URLSearchParams(params).toString();
        const url = `${API_BASE}${endpoint}${qs ? '?' + qs : ''}`;
        const response = await fetch(url, { method: 'GET', headers: { 'Authorization': authHeader } });
        return await response.json();
    } catch (error) { console.error('API Error:', error); return null; }
}

async function fetchServerData() {
    const config = await apiCall('/webapp/config/prices');
    if (config && config.Success) {
        RATES.USD.tonUsd = config.Rates.TonUsd; 
        
        // Берем готовые финальные цены
        RATES.USD.perStar = window.finalPrices.star;
        PREMIUM_TON = { 
            3: window.finalPrices.premium3 / RATES.USD.tonUsd, 
            6: window.finalPrices.premium6 / RATES.USD.tonUsd, 
            12: window.finalPrices.premium12 / RATES.USD.tonUsd 
        };
        updateAllPrices();
    }
    
    const balance = await apiCall('/webapp/user/balance');
    if (balance && balance.Success) {
        tonConnect.balance = balance.TonBalance; 
        tonConnect.frozenBalance = balance.FrozenTonBalance;
        updateHomeBalances(); 
    }
    
    await switchRentCategory('gifts');
}

window.updatePremiumModalPrice = function(months) {
    let usdPrice = window.finalPrices.premium3;
    if (months === 6) usdPrice = window.finalPrices.premium6;
    if (months === 12) usdPrice = window.finalPrices.premium12;

    const tonPrice = usdPrice / getTonUsdRate();

    document.getElementById('modalPremiumTotalUsd').textContent = `$${usdPrice.toFixed(2)}`;
    document.getElementById('modalPremiumTotalAlt').textContent = `(≈ ${tonPrice.toFixed(2)} TON)`;
    document.getElementById('premiumMethodsContainer').innerHTML = generatePaymentMethodsHtml('premium', state.target);
}

window.updateStarsModalPrice = function() {
    const input = document.getElementById('modalStarsAmount');
    let stars = parseInt(input.value);
    if (isNaN(stars) || stars < 50) stars = 50;

    const usdPrice = stars * window.finalPrices.star;
    const tonPrice = usdPrice / getTonUsdRate();

    document.getElementById('modalStarsTotalUsd').textContent = `$${usdPrice.toFixed(2)}`;
    document.getElementById('modalStarsTotalAlt').textContent = `(≈ ${tonPrice.toFixed(2)} TON)`;
    document.getElementById('starsMethodsContainer').innerHTML = generatePaymentMethodsHtml('stars', state.target);
}

function getTonUsdRate() { return RATES.USD.tonUsd || 2.0; }

function formatTonPrice(tonAmount) {
    const cur = state.currency;
    if (cur === 'TON') return `${tonAmount.toFixed(2)} TON`;
    if (cur === 'USD') return `$${(tonAmount * getTonUsdRate()).toFixed(2)}`;
    if (cur === 'RUB') return `${Math.round(tonAmount * getTonUsdRate() * RUB_PER_USD)} ₽`;
    return `${tonAmount.toFixed(2)} TON`;
}

function formatUsdPrice(usdAmount) {
    const cur = state.currency;
    if (cur === 'USD') return `$${usdAmount.toFixed(2)}`;
    if (cur === 'RUB') return `${Math.round(usdAmount * RUB_PER_USD)} ₽`;
    if (cur === 'TON') return `${(usdAmount / getTonUsdRate()).toFixed(2)} TON`;
    return `$${usdAmount.toFixed(2)}`;
}

// ================= РАЗДЕЛ АРЕНДЫ =================

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
    let normSearch = normalizeName(name);
    for (const [key, val] of Object.entries(GIFT_NAME_TO_ID)) {
        let normKey = normalizeName(key);
        if (normKey === normSearch || normKey + 's' === normSearch) return val;
    }
    return null;
}

function getBaseCollectionName(name) {
    let normSearch = normalizeName(name);
    for (const key of Object.keys(GIFT_NAME_TO_ID)) {
        let normKey = normalizeName(key);
        if (normKey === normSearch || normKey + 's' === normSearch) return key; 
    }
    return name; 
}

window.toggleDropdown = function(id) {
    const wrap = document.getElementById(id);
    const isOpen = wrap.classList.contains('open');
    document.querySelectorAll('.custom-dd-wrap').forEach(el => el.classList.remove('open'));
    if (!isOpen) wrap.classList.add('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dd-wrap')) {
        document.querySelectorAll('.custom-dd-wrap').forEach(el => el.classList.remove('open'));
    }
});

async function switchRentCategory(category, btn) {
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
                let colId = getCollectionIdByName(c.Name);
                let imgSrc = colId ? `https://cdn.changes.tg/gifts/originals/${colId}/Original.png` : c.ImageUrl;
                let floorText = c.RentFloorTon > 0 ? `от ${formatTonPrice(c.RentFloorTon)}/дн` : '';
                
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
            let baseName = getBaseCollectionName(name);

            modelsRes.Models.forEach(m => {
                let mImgSrc = `https://cdn.changes.tg/gifts/models/${encodeURIComponent(baseName)}/png/${encodeURIComponent(m.ModelName)}.png`;
                let mFloorText = m.RentFloorTon > 0 ? `от ${formatTonPrice(m.RentFloorTon)}/дн` : '';
                
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
};

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

window.toggleSortDropdown = function() {
    const wrap = document.getElementById('sortDropdown');
    wrap.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('#sortDropdown')) {
        const wrap = document.getElementById('sortDropdown');
        if (wrap) wrap.classList.remove('open');
    }
});

window.selectSortOption = function(el) {
    const value = el.dataset.value;
    const icon = el.dataset.icon;
    const label = el.querySelector('.sort-item-label').textContent;

    // Обновляем триггер
    document.getElementById('rentSortIcon').textContent = icon;
    document.getElementById('rentSortLabel').textContent = label;

    // Снимаем выделение, выделяем выбранный
    document.querySelectorAll('#sortMenu .sort-dd-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');

    // Синхронизируем скрытый select
    const sel = document.getElementById('rentSort');
    if (sel) sel.value = value;

    // Закрываем дропдаун и загружаем
    document.getElementById('sortDropdown').classList.remove('open');
    loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, true);
}

// Оставляем для совместимости
window.onRentSortChange = function() {
    loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, true);
}

window.loadNextRentPage = function() {
    if (state.nextCursor) {
        loadRentOffers(state.rentCategory, state.currentCollection, state.currentModel, false);
    }
}

// --- LAZY LOAD OBSERVER для карточек аренды ---
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

                // Создаем img без src, чтобы шиммер не застревал на [src=""]
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
                if (state.nextCursor) {
                    btn.style.display = 'block';
                    btn.textContent = 'Показать еще';
                    btn.disabled = false;
                } else {
                    btn.style.display = 'none';
                }
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

// --- УНИВЕРСАЛЬНАЯ МОДАЛКА И ОПЛАТА STARS/PREMIUM ---

window.openPaymentModal = function(product) {
    const targetStr = getApiTarget(product);
    if (!targetStr) {
        safeAlert('Пожалуйста, проверьте юзернейм получателя или срок чека.');
        return;
    }

    let productName = '';
    let usdPrice = 0;
    let tonPrice = 0;
    let targetDisplay = '';

    const mode = state[`${product}RecipientMode`];
    if (mode === 'self') targetDisplay = 'На свой аккаунт';
    else if (mode === 'other') targetDisplay = document.getElementById(`${product}Target`).value.trim();
    else if (mode === 'cheque') {
        const hrs = getChequeHours(product);
        targetDisplay = hrs >= 8760 ? 'Чек (бессрочный)' : `Чек (на ${hrs} ч.)`;
    }

    if (product === 'stars') {
        const count = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount').value) || 0 : state.stars;
        if (count < 50) return safeAlert('Минимум 50 звезд');
        productName = `${count} Telegram Stars`;
        usdPrice = count * RATES.USD.perStar;
        tonPrice = usdPrice / getTonUsdRate();
    } else if (product === 'premium') {
        productName = `Telegram Premium ${state.premium} мес.`;
        tonPrice = PREMIUM_TON[state.premium];
        usdPrice = tonPrice * getTonUsdRate();
    }

    state.pay[product] = { method: 'InternalWallet', currency: 'TON' };

    let paymentMethodsHtml = '';
    
    if (mode === 'cheque') {
        // ЕСЛИ ЧЕК - ТОЛЬКО ВНУТРЕННИЙ БАЛАНС
        paymentMethodsHtml = `
            <div class="payment-methods">
                <div class="pay-method selected" style="grid-column: span 2" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">Внутренний баланс TON</div>
            </div>
            <div style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:-8px; margin-bottom:16px;">Сумма будет заморожена на балансе</div>
        `;
    } else {
        paymentMethodsHtml = `
            <div class="payment-methods">
                <div class="pay-method selected" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('${product}', this)">Внутренний TON</div>
                <div class="pay-method" data-method="CryptoTransfer" data-currency="TON" onclick="selectPayMethod('${product}', this)">Перевод TON</div>
                <div class="pay-method" data-method="BankCard" data-currency="RUB" onclick="selectPayMethod('${product}', this)">Карта (RUB)</div>
                <div class="pay-method" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('${product}', this)">Звёзды</div>
            </div>
        `;
    }

    const content = `
        <div class="page-${product}-theme" style="margin-top: 10px;">
            <div class="modal-info-row"><span class="modal-info-label">Товар</span><span class="modal-info-value" style="color:var(--${product}-primary)">${productName}</span></div>
            <div class="modal-info-row"><span class="modal-info-label">Получатель</span><span class="modal-info-value">${targetDisplay}</span></div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">К оплате:</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)">$${usdPrice.toFixed(2)}</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)">(≈ ${tonPrice.toFixed(2)} TON)</div>
                </div>
            </div>
            
            <label class="form-label" style="margin-bottom:8px;">Способ оплаты</label>
            ${paymentMethodsHtml}

            <button class="action-btn ${product}-action-btn" id="modalConfirmBtn" onclick="executePurchase('${product}')" style="width:100%; margin: 16px 0 0">Подтвердить заказ</button>
        </div>
    `;

    showModal('Оформление заказа', content);
}

window.executePurchase = async function(product) {
    const target = getApiTarget(product);
    const pm = state.pay[product].method;
    const pc = state.pay[product].currency;
    const btn = document.getElementById('modalConfirmBtn');
    
    setLoading(btn, true);

    let endpoint = '';
    let payload = { telegramId, currency: pc, method: pm, targetUsername: target };

    if (product === 'stars') {
        endpoint = '/transactions/create/stars';
        payload.stars = state.starsCustom ? parseInt(document.getElementById('starsCustomAmount').value) : state.stars;
    } else if (product === 'premium') {
        endpoint = '/transactions/create/premium';
        payload.months = state.premium;
    }

    const result = await apiCall(endpoint, payload);
    setLoading(btn, false);

    if (result && result.Success) {
        handleTxFlow(result); 
    } else if (result) {
        safeAlert('Ошибка: ' + result.Error);
    }
}

window.openRentModal = function(address) {
    const offer = window.currentRentOffers.find(o => o.NftAddress === address);
    if (!offer) return;

    state.rentNftAddress = offer.NftAddress;
    state.rentNftName = offer.Name;
    state.rentMinDays = offer.MinDays;
    state.rentMaxDays = offer.MaxDays;
    state.rentImageUrl = offer.ImageUrl; // <--- ДОБАВИТЬ ЭТУ СТРОКУ
    window.RENT_TON_PER_DAY = offer.PriceTon;
    state.rentDays = offer.MinDays;
    state.pay.rent = { method: 'InternalWallet', currency: 'TON' }; 

    const content = `
        <div style="display:flex; gap:14px; margin-bottom:16px; align-items:center" class="page-rent-theme">
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
        <div class="payment-methods page-rent-theme">
            <div class="pay-method selected" data-method="InternalWallet" data-currency="TON" onclick="selectPayMethod('rent', this)">Внутренний TON</div>
            <div class="pay-method" data-method="TelegramStars" data-currency="Stars" onclick="selectPayMethod('rent', this)">Звёзды (Telegram)</div>
        </div>

        <button class="action-btn rent-action-btn" id="modalRentBtn" onclick="apiRentGift()" style="width:100%; margin:0">Оплатить аренду</button>
    `;

    showModal('Аренда NFT', content);
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
        
        // Если выбраны Звезды, считаем цену в звездах
        if (state.pay.rent && state.pay.rent.method === 'TelegramStars') {
            const starsTotal = Math.ceil(usdTotal / RATES.USD.perStar);
            document.getElementById('modalRentTotalUsd').textContent = `${starsTotal} ⭐️`;
            document.getElementById('modalRentTotalAlt').textContent = `(≈ $${usdTotal.toFixed(2)})`;
        } else {
            // Если выбран TON
            document.getElementById('modalRentTotalUsd').textContent = `$${usdTotal.toFixed(2)}`;
            let altTotal = formatTonPrice(totalTon);
            if (state.currency === 'USD') altTotal = `${totalTon.toFixed(2)} TON`;
            document.getElementById('modalRentTotalAlt').textContent = `(≈ ${altTotal})`;
        }
    }
}

window.selectPayMethod = function(product, element) {
    const container = element.closest('.payment-methods');
    container.querySelectorAll('.pay-method').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    state.pay[product] = { method: element.dataset.method, currency: element.dataset.currency };
    
    // ДОБАВИТЬ ЭТУ СТРОКУ
    if (product === 'rent') updateRentModalPrice(); 
}

// ===== ОСТАЛЬНАЯ ЛОГИКА =====

const TAB_ORDER = ['home', 'stars', 'premium', 'rent', 'profile'];
let _currentTab = 'home';

const PAGE_BANNER_CONFIG = {
    stars: { label: 'Telegram Stars', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, theme: 'stars' },
    premium: { label: 'Telegram Premium', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, theme: 'premium' },
    rent: { label: 'Аренда NFT-подарков', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`, theme: 'rent' },
    wallet: { label: 'TON Кошелёк', icon: `<svg width="14" height="14" viewBox="0 0 56 56" fill="none"><path d="M28 4L4 18V38L28 52L52 38V18L28 4Z" fill="currentColor" opacity="0.2"/><path d="M28 4L4 18L28 32L52 18L28 4Z" fill="currentColor" opacity="0.7"/><path d="M28 32V52L52 38V18L28 32Z" fill="currentColor" opacity="0.5"/><path d="M4 18V38L28 52V32L4 18Z" fill="currentColor" opacity="0.6"/></svg>`, theme: 'wallet' }
};

function updatePageBanner(tabId) {
    const banner = document.getElementById('pageBanner'); if (!banner) return;
    const cfg = PAGE_BANNER_CONFIG[tabId];
    if (cfg) { 
        banner.className = `page-banner page-banner--${cfg.theme}`; 
        banner.innerHTML = `<div class="page-banner-inner"><span class="page-banner-icon">${cfg.icon}</span><span class="page-banner-label">${cfg.label}</span></div>`; 
        banner.style.display = 'flex'; 
    } else { 
        banner.style.display = 'none'; 
    }
}

function switchTab(tabId) {
    if (tabId === _currentTab) return;
    const oldPage = document.getElementById(`page-${_currentTab}`);
    const newPage = document.getElementById(`page-${tabId}`);
    const oldNav = document.querySelector(`.nav-item[data-tab="${_currentTab}"]`);
    const newNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const oldIdx = TAB_ORDER.indexOf(_currentTab);
    const newIdx = TAB_ORDER.indexOf(tabId);

    if (oldPage) oldPage.classList.remove('active', 'slide-from-right', 'slide-from-left');
    if (oldNav) oldNav.classList.remove('active');
    if (newNav) newNav.classList.add('active');

    if (newPage) { newPage.classList.remove('slide-from-right', 'slide-from-left'); void newPage.offsetWidth; newPage.classList.add('active', newIdx > oldIdx ? 'slide-from-right' : 'slide-from-left'); }
    _currentTab = tabId; updatePageBanner(tabId); if (tabId === 'profile') loadProfile(); updateAllPrices(); window.scrollTo({ top: 0, behavior: 'instant' });
}

function updateAllPrices() {
    [50, 100, 250, 500, 1000, 2500].forEach(count => { const el = document.getElementById(`price-stars-${count}`); if (el) el.textContent = formatUsdPrice(count * RATES.USD.perStar); });
    [3, 6, 12].forEach(m => { const el = document.getElementById(`price-premium-${m}`); if (el) el.textContent = formatTonPrice(PREMIUM_TON[m]); });
    [1, 5, 10, 25].forEach(amount => { const el = document.getElementById(`topup-price-${amount}`); if (el) el.textContent = `≈ ${formatTonPrice(amount)}`; });

    updateStarsCustomPrice(); updateStarsBtn(); updatePremiumBtn(); updateTopupBtn();
    
    if (_currentTab === 'rent' && window.currentRentOffers.length > 0) {
        document.querySelectorAll('#rentCardsContainer .rent-card-price').forEach((el, index) => {
            if (window.currentRentOffers[index]) el.textContent = `~${formatTonPrice(window.currentRentOffers[index].PriceTon)} / дн`;
        });
    }

    const label = document.getElementById('currencyLabel'); if (label) label.textContent = state.currency;
}

function updateStarsBtn() {
    const btn = document.getElementById('starsBuyBtn'); if (!btn) return;
    const count = state.starsCustom ? (parseInt(document.getElementById('starsCustomAmount')?.value) || 50) : state.stars;
    const isCheque = state.starsRecipientMode === 'cheque';
    const icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const chequeIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>`;
    const priceStr = formatUsdPrice(count * RATES.USD.perStar);
    if (isCheque) btn.innerHTML = `${chequeIcon} Создать чек · ${count} Stars · ${priceStr}`; else btn.innerHTML = `${icon} Купить ${count} Stars · ${priceStr}`;
}

function updateStarsCustomPrice() {
    const priceEl = document.getElementById('price-stars-custom'); const amountEl = document.getElementById('starsCustomAmount');
    if (!priceEl) return; const count = parseInt(amountEl?.value) || 0;
    priceEl.textContent = count >= 50 ? formatUsdPrice(count * RATES.USD.perStar) : '—';
}

function updatePremiumBtn() {
    const btn = document.getElementById('premiumBuyBtn'); if (!btn) return;
    const m = state.premium; const isCheque = state.premiumRecipientMode === 'cheque';
    const icon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    const chequeIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 12 11 14 15 10"/></svg>`;
    const priceStr = formatTonPrice(PREMIUM_TON[m]);
    if (isCheque) btn.innerHTML = `${chequeIcon} Создать чек · Premium ${m} мес · ${priceStr}`; else btn.innerHTML = `${icon} Купить Premium ${m} мес · ${priceStr}`;
}

function updateTopupBtn() {
    const btn = document.getElementById('topupBtn'); if (!btn) return;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Пополнить ${state.topupAmount} TON`;
}

function selectPackage(type, value, element) {
    if (type === 'stars') { state.stars = value; state.starsCustom = false; document.getElementById('customStarsWrapper').style.display = 'none'; }
    else state[type] = value;
    const container = element.closest('.packages-list');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    if (type === 'stars') updateStarsBtn(); if (type === 'premium') updatePremiumBtn();
}

function selectTopup(amount, element) {
    state.topupAmount = amount; state.useCustomTopup = false;
    const container = document.getElementById('topupOptions');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected'); document.getElementById('customTopupWrapper').style.display = 'none'; updateTopupBtn();
}

function toggleCustomTopup(element) {
    state.useCustomTopup = true; const container = document.getElementById('topupOptions');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected'); document.getElementById('customTopupWrapper').style.display = 'block';
    document.getElementById('topupAmount').oninput = (e) => { state.topupAmount = parseFloat(e.target.value) || 0; updateTopupBtn(); };
}

function toggleCustomStars(element) {
    state.starsCustom = true; const container = element.closest('.packages-list');
    if (container) container.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected'); document.getElementById('customStarsWrapper').style.display = 'block';
    document.getElementById('starsCustomAmount').oninput = () => { updateStarsCustomPrice(); updateStarsBtn(); };
}

function setRecipientMode(product, mode, btn) {
    state[`${product}RecipientMode`] = mode;
    const tabGroup = document.getElementById(`${product}RecipientTabs`);
    tabGroup.querySelectorAll('.rtab').forEach(t => t.classList.remove('active')); btn.classList.add('active');
    document.getElementById(`${product}RecipientSelf`).style.display = mode === 'self' ? 'flex' : 'none';
    document.getElementById(`${product}RecipientOther`).style.display = mode === 'other' ? 'block' : 'none';
    document.getElementById(`${product}RecipientCheque`).style.display = mode === 'cheque' ? 'block' : 'none';
    
    // Блокируем кнопку "Оплатить", если выбрали "Другому", но поле пустое
    const actionBtn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');
    if (mode === 'other') {
        const input = document.getElementById(`${product}Target`);
        if (!input || !input.value || !state._validatedUsername[input.value.trim().replace('@', '')]) { // Changed from _usernameCache to _validatedUsername
            if (actionBtn) actionBtn.disabled = true;
        }
    } else {
        if (actionBtn) actionBtn.disabled = false; 
        if (product === 'stars') updateStarsBtn(); 
        if (product === 'premium') updatePremiumBtn();
    }
}

function selectChequeOpt(product, element) {
    const val = element.dataset.val; const container = element.closest('.cheque-options');
    if (container) container.querySelectorAll('.cheque-opt').forEach(o => o.classList.remove('selected'));
    element.classList.add('selected'); const customWrap = document.getElementById(`${product}ChequeCustomWrap`);
    if (val === 'custom') { customWrap.style.display = 'block'; const input = document.getElementById(`${product}ChequeCustomHours`); if (input) input.oninput = () => { state[`${product}ChequeHours`] = parseInt(input.value) || 1; }; } 
    else { customWrap.style.display = 'none'; state[`${product}ChequeHours`] = parseInt(val); }
}

function onUsernameInput(product, inputEl) {
    const raw = inputEl.value.trim().replace('@', '');
    const statusMsg = document.getElementById(`${product}UsernameMsg`);
    const btn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');
    
    if (btn) btn.disabled = true;
    if (statusMsg) { statusMsg.innerHTML = ''; }
    if (!raw || raw.length < 3) return;
    
    // Кэш намеренно не используем — всегда получаем свежие данные с Fragment
    clearTimeout(state._usernameTimers[product]);
    
    if (statusMsg) { statusMsg.innerHTML = '<div class="username-checking">Проверяется...</div>'; }
    
    state._usernameTimers[product] = setTimeout(() => doCheckUsername(product, raw), 600);
}

async function doCheckUsername(product, username) {
    const type = product === 'premium' ? 'premium' : 'stars';
    const data = await apiCall(`/webapp/recipient/check?username=${username}&type=${type}`);
    // Не сохраняем в кэш — каждый раз получаем актуальные данные с Fragment
    applyUsernameResult(product, data?.Success ? data : null, username);
}

function applyUsernameResult(product, data, rawUsername) {
    const statusMsg = document.getElementById(`${product}UsernameMsg`); 
    const statusIcon = document.getElementById(`${product}UsernameStatus`);
    const btn = document.getElementById(product === 'stars' ? 'starsBuyBtn' : 'premiumBuyBtn');

    // Скрываем старый icon-контейнер (он не нужен при карточке)
    if (statusIcon) statusIcon.innerHTML = '';

    if (data) {
        const letter = (data.Name || 'X')[0].toUpperCase();
        const avatarHtml = data.AvatarUrl 
            ? `<img src="${data.AvatarUrl}" class="tpc-avatar">` 
            : `<div class="tpc-avatar-letter">${letter}</div>`;
        
        // Сохраняем подтверждённый юзернейм для отправки
        state._validatedUsername[product] = rawUsername;
        
        if (statusMsg) { 
            statusMsg.innerHTML = `
                <div class="target-profile-card recipient-found-card">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${data.Name}</div>
                        <div class="tpc-username">@${rawUsername}</div>
                    </div>
                    <div class="tpc-checkmark">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>`; 
        }
        if(btn) btn.disabled = false;
    } else {
        state._validatedUsername[product] = null;
        if (statusMsg) { 
            statusMsg.innerHTML = `
                <div class="recipient-error-card">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Пользователь не найден
                </div>`;
        }
        if(btn) btn.disabled = true;
    }
}

function getChequeHours(product) {
    const hours = state[`${product}ChequeHours`];
    if (!hours || hours <= 0) { const custom = document.getElementById(`${product}ChequeCustomHours`); return custom ? parseInt(custom.value) || 0 : 0; }
    return hours;
}

function updateHomeBalances() {
    const tonEl = document.getElementById('homeTonBalance'); 
    const frozenEl = document.getElementById('homeFrozenBalance');
    const frozenCard = document.getElementById('homeFrozenCard');
    
    if (tonEl) tonEl.textContent = tonConnect.balance !== null ? parseFloat(tonConnect.balance).toFixed(2) : '0.00';
    
    const frozen = tonConnect.frozenBalance !== null ? parseFloat(tonConnect.frozenBalance) : 0;
    if (frozenEl) frozenEl.textContent = frozen.toFixed(2);
    
    // Скрываем карточку "Заморожено", если средств нет
    if (frozenCard) {
        if (frozen <= 0) {
            frozenCard.style.display = 'none';
            // Растягиваем карточку TON на всю ширину
            const tonCard = document.getElementById('homeTonCard');
            if (tonCard) tonCard.style.gridColumn = 'span 2';
        } else {
            frozenCard.style.display = 'flex';
            const tonCard = document.getElementById('homeTonCard');
            if (tonCard) tonCard.style.gridColumn = '';
        }
    }
}
function updateTonConnectUI() {}
function onTonConnect() { safeAlert('Для подключения кошелька используйте бота или раздел Моя Аренда.'); }

function getApiTarget(product) {
    const mode = state[`${product}RecipientMode`];
    if (mode === 'self') return user.username ? `@${user.username}` : `id${telegramId}`;
    if (mode === 'cheque') { const hrs = getChequeHours(product); if (!hrs) return null; return hrs >= 8760 ? 'cheque_inf' : `cheque_${hrs}`; }
    // Используем _validatedUsername, а не кэш (каш был убран ранее)
    const validated = state._validatedUsername[product];
    if (!validated) return null;
    return validated;
}

async function apiRentGift() {
    const days = state.rentDays;
    if (days < state.rentMinDays || days > state.rentMaxDays) return safeAlert(`Доступно от ${state.rentMinDays} до ${state.rentMaxDays} дней`);
    const pm = state.pay.rent.method; const pc = state.pay.rent.currency;
    setLoading(document.getElementById('modalRentBtn'), true);
    
    // ДОБАВЛЕНЫ category и imageUrl
    const result = await apiCall('/transactions/create/rent', { 
        telegramId, currency: pc, method: pm, 
        nftAddress: state.rentNftAddress, 
        nftName: state.rentNftName, 
        days, 
        pricePerDayTon: window.RENT_TON_PER_DAY,
        category: state.rentCategory,
        imageUrl: state.rentImageUrl
    });
    
    setLoading(document.getElementById('modalRentBtn'), false);
    if (result && result.Success) { closeModal(); handleTxFlow(result); } else if (result) { safeAlert('Ошибка: ' + result.Error); }
}

async function apiTopupWallet() {
    let amount = state.useCustomTopup ? parseFloat(document.getElementById('topupAmount').value) : state.topupAmount;
    if (!amount || amount <= 0) return safeAlert('Введите корректную сумму');
    setLoading(document.getElementById('topupBtn'), true);
    const result = await apiCall('/transactions/create/topup', { telegramId, currency: 'TON', method: 'CryptoTransfer', amount });
    setLoading(document.getElementById('topupBtn'), false);
    if (result && result.Success) handleTxFlow(result); else if (result) safeAlert('Ошибка: ' + result.Error);
}

async function apiWithdrawWallet() {
    const amount = document.getElementById('withdrawAmount').value; const address = document.getElementById('withdrawAddress').value.trim();
    if (!amount || !address) return safeAlert('Заполните все поля');
    const result = await apiCall('/transactions/create/withdrawal', { telegramId, currency: 'TON', amount, targetAddress: address });
    if (result && result.Success) { safeAlert('Заявка на вывод создана!'); fetchServerData(); } else if (result) safeAlert('Ошибка: ' + result.Error);
}

function handleTxFlow(txData) {
    closeModal(); 
    
    if (txData.PaymentMethod === 'InternalWallet') {
        if (txData.TargetUsername && txData.TargetUsername.startsWith('cheque_')) {
            const link = `https://t.me/${BOT_USERNAME}?start=chk_${txData.TransactionId}`;
            showModal('🧾 Чек успешно создан!', `
                <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">Средства заморожены. Перешлите эту ссылку получателю:</p>
                <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                    <div class="cheque-link-input">${link}</div>
                    <button class="cheque-copy-btn" onclick="copyChequeLink('${link}')">Копировать</button>
                </div>
                <button class="action-btn outline-action-btn" onclick="closeModal(); fetchServerData(); loadProfile(); switchTab('profile');">Перейти в Мои чеки</button>
            `);
        } else {
            safeAlert('Заявка успешно обработана! Подробности в профиле.');
            fetchServerData();
            loadProfile();
        }
    } else if (txData.PaymentMethod === 'TelegramStars') {
        if (window.sysConfig && window.sysConfig.isTestMode) {
            safeAlert('Тестовый режим: Оплата Звездами сымитирована и прошла успешно!');
            fetchServerData();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            showModal('Оплата Звездами', `
                <div style="text-align:center; padding: 10px 0;">
                    <div style="font-size:44px; margin-bottom:12px;">⭐️</div>
                    <h3 style="margin-bottom:10px; color:var(--text)">Счет выставлен!</h3>
                    <p style="color:var(--text-secondary);font-size:14px; margin-bottom:20px;">Закройте это окно и вернитесь в чат с ботом. Мы отправили вам счет на оплату Telegram Stars.</p>
                    <button class="action-btn stars-action-btn" onclick="tg.close()" style="width:100%;">Закрыть WebApp</button>
                </div>
            `);
        }
    } else if (txData.PaymentMethod === 'CryptoTransfer') {
        showModal('Крипто-перевод', `
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">Переведите точную сумму на кошелек бота и укажите код в комментарии.</p>
            <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="color:var(--rent-primary)">${txData.Amount} ${txData.Currency}</span></div>
            
            <label class="form-label" style="margin-top:12px">Кошелек (сохраните адрес)</label>
            <div class="cheque-link-wrap" style="margin-bottom: 8px;">
                <div class="cheque-link-input">${window.sysConfig && window.sysConfig.receivingWallet ? window.sysConfig.receivingWallet : 'Загрузка...'}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${window.sysConfig && window.sysConfig.receivingWallet ? window.sysConfig.receivingWallet : ''}'); safeAlert('Кошелек скопирован');">Копировать</button>
            </div>
            
            <label class="form-label" style="margin-top:12px">Код комментария (ОБЯЗАТЕЛЬНО)</label>
            <div class="cheque-link-wrap" style="margin-bottom: 16px;">
                <div class="cheque-link-input">${txData.PaymentCode}</div>
                <button class="cheque-copy-btn" onclick="navigator.clipboard.writeText('${txData.PaymentCode}'); safeAlert('Код скопирован');">Копировать</button>
            </div>

            <div style="font-size:11.5px; color:#ff6b6b; text-align:center; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 8px; border: 1px solid rgba(255,107,107,0.2); margin-bottom:14px;">Без кода в комментарии деньги не зачислятся!</div>
        `);
    } else {
        safeAlert(`Откройте бота, чтобы завершить оплату способом: ${txData.PaymentMethod}`);
    }
}

window.selectCurrency = function(cur) {
    state.currency = cur;
    document.getElementById('currencyLabel').textContent = cur;
    document.getElementById('currencyDropdownWrap').classList.remove('open');
    updateAllPrices();
}

async function loadProfile() {
    const list = document.getElementById('historyList'); if(list) list.innerHTML = '<div class="profile-empty"><p>Загрузка...</p></div>';
    
    // Грузим историю
    const data = await apiCall('/webapp/user/history');
    if (data && data.Success) { 
        renderServerHistory(data.History); 
        renderServerCheques(data.History.filter(h => h.IsCheque && !h.IsChequeActivated && h.Status === 'Completed')); 
    }

    // Грузим аренду
    const rentData = await apiCall('/webapp/rent/my');
    if (rentData && rentData.Success) {
        renderServerRentals(rentData.Rentals);
    }
}

window.currentRentals = []; // Для сохранения в память

function renderServerRentals(rentals) {
    window.currentRentals = rentals; // Сохраняем для показа деталей
    const list = document.getElementById('rentalsList'); if (!list) return;
    if (!rentals.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активной аренды</p></div>`; return; }
    
    list.innerHTML = rentals.map(r => {
        const exp = new Date(r.ExpiresAt);
        const isExpired = exp < new Date();
        const expText = exp.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        let link = 'https://fragment.com/';
        if (r.Category === 'usernames') link = `https://t.me/${r.Name.replace('@', '')}`;
        else if (r.Category === 'numbers') link = `https://fragment.com/number/${r.Name.replace('+', '')}`;

        return `
        <div class="history-item page-rent-theme" style="flex-direction:column; align-items:stretch; padding: 14px; gap: 14px; cursor:pointer;" onclick="showRentalDetails('${r.Id}')">
            <div style="display:flex; gap:14px; align-items:center;">
                <img src="${r.ImageUrl}" style="width:54px;height:54px;border-radius:12px;object-fit:cover;background:var(--surface-3)" onerror="this.src='https://nft.fragment.com/username/telegram.webp'">
                <div style="min-width:0; flex:1">
                    <div style="font-weight:800; font-size:15px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${r.Name}</div>
                    <div style="color:${isExpired ? '#f07070' : 'var(--text-secondary)'}; font-weight:600; font-size:12px; margin-top:4px;">
                        ${isExpired ? 'Истекла: ' + expText : 'Активно до: ' + expText}
                    </div>
                </div>
                <div style="color:var(--text-secondary)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Новая функция для окна с подробностями аренды
window.showRentalDetails = function(id) {
    const r = window.currentRentals.find(x => x.Id === id);
    if (!r) return;
    
    const exp = new Date(r.ExpiresAt);
    const isExpired = exp < new Date();
    const expStr = exp.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const status = isExpired ? '<span style="color:#f07070">🔴 Истекла</span>' : '<span style="color:#4caf50">🟢 Активна</span>';
    
    const catName = r.Category === 'gifts' ? 'Подарок' : (r.Category === 'usernames' ? 'Юзернейм' : 'Номер');
    let link = 'https://fragment.com/';
    if (r.Category === 'usernames') link = `https://t.me/${r.Name.replace('@', '')}`;
    else if (r.Category === 'numbers') link = `https://fragment.com/number/${r.Name.replace('+', '')}`;

    showModal('Детали аренды', `
        <div style="text-align:center; margin-bottom: 20px;">
            <img src="${r.ImageUrl}" style="width:100px;height:100px;border-radius:16px;object-fit:cover;background:var(--surface-3);margin-bottom:12px;" onerror="this.src='https://nft.fragment.com/username/telegram.webp'">
            <div style="font-size:20px; font-weight:800; color:var(--text)">${r.Name}</div>
            <div style="font-size:13px; font-weight:600; color:var(--text-secondary); margin-top:6px;">NFT ${catName}</div>
        </div>
        
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value" style="font-weight:700">${status}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Действует до</span><span class="modal-info-value">${expStr}</span></div>
        
        <div style="display:flex; gap:10px; margin-top:20px;">
            <a href="${link}" target="_blank" class="action-btn outline-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; text-decoration:none; display:flex; justify-content:center; align-items:center;">🔗 Просмотр</a>
            <button class="action-btn rent-action-btn" style="flex:1; margin:0; padding:12px; font-size:14px; opacity: ${isExpired ? '0.5' : '1'}" onclick="${isExpired ? '' : `openTonConnectModal('${r.NftAddress}')`}">Установить</button>
        </div>
        ${isExpired ? '<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:12px">Срок аренды истек. Установка недоступна.</div>' : ''}
    `);
}

function renderServerCheques(cheques) {
    const list = document.getElementById('chequesList'); if (!list) return;
    if (!cheques.length) { list.innerHTML = `<div class="profile-empty"><p>Нет активных чеков</p></div>`; return; }
    list.innerHTML = cheques.map(c => {
        const exp = c.ChequeExpiresAt ? new Date(c.ChequeExpiresAt).toLocaleDateString('ru-RU') : 'Бессрочно';
        const link = `https://t.me/${BOT_USERNAME}?start=chk_${c.Id}`; 
        return `<div class="cheque-item" style="flex-direction:column; align-items:stretch;"><div style="display:flex; justify-content:space-between; align-items:center; width:100%"><div class="cheque-item-left"><span class="cheque-item-title">${c.Product} · ${c.Amount} ${c.Currency}</span><span class="cheque-item-meta">Код: ${c.PaymentCode} · До: ${exp}</span></div><button class="cheque-item-deact" onclick="deactivateCheque('${c.Id}')">Отменить</button></div><div class="cheque-link-wrap"><div class="cheque-link-input">${link}</div><button class="cheque-copy-btn" onclick="copyChequeLink('${link}')">Копировать</button></div></div>`;
    }).join('');
}

window.copyChequeLink = function(link) {
    try { 
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => safeAlert('Ссылка скопирована!')).catch(() => safeAlert('Ошибка копирования.')); 
        } else {
            const t = document.createElement("textarea"); t.value = link; document.body.appendChild(t); t.select(); 
            document.execCommand('copy'); document.body.removeChild(t);
            safeAlert('Ссылка скопирована!'); 
        }
    } catch(err) { safeAlert('Ошибка копирования.'); }
}

function renderServerHistory(history) {
    window.currentHistory = history; const list = document.getElementById('historyList'); if (!list) return;
    if (!history.length) { list.innerHTML = `<div class="profile-empty"><p>История пуста</p></div>`; return; }
    const statusLabel = { Pending: 'Ожидание', Completed: 'Выполнено', Failed: 'Ошибка', Cancelled: 'Отменено', Processing: 'В обработке' };
    const statusClass = { Pending: 'status-pending', Completed: 'status-completed', Failed: 'status-failed', Cancelled: 'status-cancelled', Processing: 'status-pending' };
    list.innerHTML = history.map(h => {
        const date = new Date(h.CreatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item" onclick="showTxDetails('${h.Id}')" style="cursor:pointer"><div class="history-item-left"><span class="history-item-title">${h.Product === 'None' ? h.Type : h.Product} · ${h.Amount} ${h.Currency}</span><span class="history-item-meta">${date}</span></div><span class="history-item-status ${statusClass[h.Status] || ''}">${statusLabel[h.Status] || h.Status}</span></div>`;
    }).join('');
}

window.showTxDetails = function(txId) {
    const tx = window.currentHistory.find(h => h.Id === txId); if (!tx) return;
    const date = new Date(tx.CreatedAt).toLocaleString('ru-RU');
    const statusLabel = { Pending: 'Ожидание оплаты', Completed: 'Выполнено', Failed: 'Ошибка выдачи', Cancelled: 'Отменено', Processing: 'В обработке' };
    
    let targetHtml = tx.TargetAddress ? `<div class="modal-info-row"><span class="modal-info-label">Получатель</span><span class="modal-info-value">${tx.TargetAddress}</span></div>` : '';
    let detailsHtml = tx.ProductDetails ? `<div class="modal-info-row"><span class="modal-info-label">Инфо</span><span class="modal-info-value" style="font-size:12px;text-align:right;max-width:60%">${tx.ProductDetails}</span></div>` : '';
    
    // ДОБАВЛЕНА ИНФА ОБ АКТИВАТОРЕ
    let activatorHtml = (tx.IsCheque && tx.IsChequeActivated && tx.ActivatorTelegramId) 
        ? `<div class="modal-info-row"><span class="modal-info-label">Активировал (ID)</span><span class="modal-info-value">${tx.ActivatorTelegramId}</span></div>` 
        : '';

    showModal('Детали операции', `
        <div class="modal-info-row"><span class="modal-info-label">ID Заявки</span><span class="modal-info-value">${tx.PaymentCode}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Дата</span><span class="modal-info-value">${date}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Сумма</span><span class="modal-info-value" style="color:var(--rent-primary)">${tx.Amount} ${tx.Currency}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Тип товара</span><span class="modal-info-value">${tx.Product === 'None' ? tx.Type : tx.Product}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Способ оплаты</span><span class="modal-info-value">${tx.PaymentMethod}</span></div>
        <div class="modal-info-row"><span class="modal-info-label">Статус</span><span class="modal-info-value">${statusLabel[tx.Status] || tx.Status}</span></div>
        ${targetHtml}
        ${activatorHtml}
        ${detailsHtml}
        <div style="margin-top:16px; font-size:11px; color:var(--text-muted); text-align:center;">Уникальный Hash: ${tx.Id}</div>
    `);
}

function updateRentSelectTrigger(selectId, triggerId) {
    const sel = document.getElementById(selectId); const trigger = document.getElementById(triggerId);
    if (!sel || !trigger) return; const opt = sel.options[sel.selectedIndex]; trigger.textContent = opt ? opt.text : '\u2014';
}

window.switchProfileTab = function(tab, btn) { 
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active')); 
    btn.classList.add('active'); 
    document.getElementById('profileCheques').style.display = tab === 'cheques' ? 'block' : 'none'; 
    document.getElementById('profileHistory').style.display = tab === 'history' ? 'block' : 'none'; 
    document.getElementById('profileRentals').style.display = tab === 'rentals' ? 'block' : 'none'; 
}
function showModal(title, content) { document.getElementById('modalTitle').textContent = title; document.getElementById('modalContent').innerHTML = content; document.getElementById('paymentModal').style.display = 'flex'; }
function closeModal() { document.getElementById('paymentModal').style.display = 'none'; }
document.getElementById('paymentModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

// Обновление транзакций вручную
async function checkTx(txId) { 
    await fetch(`${API_BASE}/transactions/${txId}/check`, { method: 'POST', headers: { 'Authorization': authHeader } }); 
    closeModal(); 
    safeAlert('Запрос отправлен. Баланс будет пополнен после подтверждения сети.'); 
    fetchServerData();
}

window.deactivateCheque = async function(txId) {
    safeConfirm('Деактивировать этот чек? Зарезервированные средства вернутся на баланс.', async (ok) => {
        if (!ok) return;
        try {
            const res = await fetch(`${API_BASE}/transactions/${txId}/cancel`, { 
                method: 'POST', 
                headers: { 'Authorization': authHeader } 
            });
            const data = await res.json();
            
            if (data && data.Success) {
                safeAlert(data.Message || 'Чек отменен. Средства разморожены.');
                loadProfile(); 
                fetchServerData(); 
            } else {
                safeAlert('Ошибка отмены: ' + (data?.Error || data?.Message || 'Неизвестная ошибка на сервере'));
            }
        } catch (e) {
            safeAlert('Ошибка соединения с сервером.');
        }
    });
}

function setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) { btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<span style="opacity:0.55">Загрузка...</span>'; btn.disabled = true; }
    else { btn.innerHTML = btn.dataset.orig || btn.innerHTML; btn.disabled = false; }
}

async function init() {
    const testUsername = 'alwys_online'; 
    const reqUsername = user.username || testUsername;

    // 1. Стучимся на сервер для проверки Fragment и получения наценок
    try {
        const initData = await apiCall(`/webapp/init?username=${reqUsername}`);
        if (initData && initData.Success) {
            window.finalPrices = {
                star: initData.FinalPricesUsd.Star,
                premium3: initData.FinalPricesUsd.Premium3,
                premium6: initData.FinalPricesUsd.Premium6,
                premium12: initData.FinalPricesUsd.Premium12
            };
            window.selfStatus = initData.User;
        }
    } catch (e) { console.error("Ошибка инициализации:", e); }

    // 2. ОПРЕДЕЛЯЕМ ИМЯ И ФОТО (Приоритет: Fragment -> Telegram -> Тест)
    let firstName = 'Вы';
    
    // Если Fragment вернул красивое имя и оно не равно просто юзернейму
    if (window.selfStatus && window.selfStatus.name && window.selfStatus.name.toLowerCase() !== reqUsername.toLowerCase()) {
        firstName = window.selfStatus.name;
    } else if (user && user.first_name && user.first_name !== 'Test') {
        // Иначе берем реальное имя из Telegram
        firstName = user.first_name;
    }

    const usernameDisplay = reqUsername ? `@${reqUsername}` : `id${telegramId}`; 
    const photoUrl = window.selfStatus?.PhotoUrl; // Достаем ссылку на аватарку
    const avatarLetter = firstName[0]?.toUpperCase() || 'X';
    
    // 3. Расставляем данные в модалки
    ['stars', 'premium'].forEach(prefix => {
        const ava = document.getElementById(`${prefix}AvatarSelf`); 
        const name = document.getElementById(`${prefix}NameSelf`); 
        const usr = document.getElementById(`${prefix}UsernameSelf`);
        
        if (ava) {
            if (photoUrl) {
                // Если есть реальная аватарка - ставим картинку, убираем текст
                ava.innerHTML = `<img src="${photoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                // Если картинки нет - ставим первую букву имени
                ava.textContent = avatarLetter; 
            }
        }
        
        if (name) name.textContent = firstName; 
        if (usr) usr.textContent = usernameDisplay;

        // Блокируем кнопку "Себе", если недоступно
        const isAvail = prefix === 'stars' ? window.selfStatus?.StarsAvailable : window.selfStatus?.PremiumAvailable;
        const selfTabBtn = document.querySelector(`[onclick="switchTarget('self', this)"]`) || document.querySelector(`#${prefix}MethodsContainer`)?.parentElement.querySelector('.ttab');
        
        if (selfTabBtn && window.selfStatus && isAvail === false) {
            selfTabBtn.style.opacity = '0.5';
            selfTabBtn.style.pointerEvents = 'none';
            selfTabBtn.textContent = 'Себе (Недоступно)';
            
            // Авто-переключение на "Другому"
            if (state.target === 'self') {
                const otherBtn = selfTabBtn.nextElementSibling;
                if (otherBtn) {
                    window.switchTarget('other', otherBtn);
                }
            }
        }
    });
    
    fetchServerData();
}

// --- ЛОГИКА ВКЛАДОК ПОЛУЧАТЕЛЯ (УНИВЕРСАЛЬНАЯ) ---
window.renderTargetSection = function(type) {
    const isSelfAvail = type === 'premium' ? window.selfStatus.PremiumAvailable : window.selfStatus.StarsAvailable;
    const selfBtn = `<button class="ttab ${state.target === 'self' ? 'active' : ''}" onclick="switchTarget('self', '${type}')" ${!isSelfAvail ? 'disabled style="opacity:0.5"' : ''}>Себе</button>`;
    const otherBtn = `<button class="ttab ${state.target === 'other' ? 'active' : ''}" onclick="switchTarget('other', '${type}')">Другому</button>`;
    const chequeBtn = `<button class="ttab ${state.target === 'cheque' ? 'active' : ''}" onclick="switchTarget('cheque', '${type}')">Чеком</button>`;

    let contentHtml = '';
    if (state.target === 'self') {
        if (isSelfAvail) {
            const photo = window.selfStatus.PhotoUrl;
            const letter = (window.selfStatus.name || 'X')[0].toUpperCase();
            const avatarHtml = photo ? `<img src="${photo}">` : `<div class="tpc-avatar-letter">${letter}</div>`;
            contentHtml = `
                <div class="target-profile-card">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${window.selfStatus.name}</div>
                        <div class="tpc-username">@${window.selfStatus.Username}</div>
                    </div>
                </div>`;
        } else {
            contentHtml = `<div style="color:#ff6b6b; font-size:13px; text-align:center; padding:10px 0;">Недоступно для вашего аккаунта</div>`;
        }
    } else if (state.target === 'other') {
        contentHtml = `
            <label class="form-label">Юзернейм получателя</label>
            <input type="text" id="targetUsername" class="form-input" placeholder="@username" oninput="onTargetUsernameInput('${type}')">
            <div id="targetUserPreview"></div>
        `;
    } else if (state.target === 'cheque') {
        contentHtml = `<div style="font-size:13px; color:var(--text-secondary); text-align:center; padding:10px 0;">Будет создан чек-ссылка. Вы сможете переслать её получателю.</div>`;
    }

    return `
        <div class="target-tabs">${selfBtn}${otherBtn}${chequeBtn}</div>
        <div id="targetInputWrapper" style="margin-bottom:16px">${contentHtml}</div>
    `;
}

// Проверка юзернейма в реальном времени при вводе
let checkTimeout = null;
window.onTargetUsernameInput = function(type) {
    clearTimeout(checkTimeout);
    const input = document.getElementById('targetUsername').value.trim();
    const preview = document.getElementById('targetUserPreview');
    const btn = document.getElementById(type === 'premium' ? 'modalPremiumBtn' : 'modalStarsBtn');

    if (!input) { preview.innerHTML = ''; btn.disabled = true; return; }

    preview.innerHTML = '<div style="font-size:13px; color:var(--text-secondary); margin-top:10px;">Проверка пользователя...</div>';
    btn.disabled = true;

    // Ждем 700мс после окончания ввода, чтобы не спамить сервер
    checkTimeout = setTimeout(async () => {
        const res = await apiCall(`/webapp/recipient/check?username=${input}&type=${type}`);
        if (res && res.Success) {
            const photo = res.AvatarUrl;
            const letter = (res.Name || 'X')[0].toUpperCase();
            const avatarHtml = photo ? `<img src="${photo}">` : `<div class="tpc-avatar-letter">${letter}</div>`;
            preview.innerHTML = `
                <div class="target-profile-card" style="margin-top:12px;">
                    ${avatarHtml}
                    <div class="tpc-info">
                        <div class="tpc-name">${res.Name}</div>
                        <div class="tpc-username">@${input.replace('@','')}</div>
                    </div>
                </div>`;
            btn.disabled = false;
        } else {
            preview.innerHTML = `<div style="font-size:13px; color:#ff6b6b; margin-top:10px;">${res?.Error || 'Пользователь не найден'}</div>`;
            btn.disabled = true;
        }
    }, 700);
}

window.switchTarget = function(target, type) {
    state.target = target;
    document.getElementById('modalTargetContainer').innerHTML = renderTargetSection(type);

    const btn = document.getElementById(type === 'premium' ? 'modalPremiumBtn' : 'modalStarsBtn');
    if (target === 'self') btn.disabled = (type === 'premium' ? !window.selfStatus.PremiumAvailable : !window.selfStatus.StarsAvailable);
    else if (target === 'other') btn.disabled = true; // Ждем успешного ввода юзернейма
    else if (target === 'cheque') btn.disabled = false;
}

// --- PREMIUM ---
window.openPremiumModal = function(months) {
    state.premium = months;
    state.pay.premium = { method: 'InternalWallet', currency: 'TON' };
    state.target = window.selfStatus.PremiumAvailable ? 'self' : 'other';

    showModal('Telegram Premium', `
        <div class="page-premium-theme">
            <div id="modalTargetContainer">${renderTargetSection('premium')}</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">Итого (${months} мес.):</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)" id="modalPremiumTotalUsd">$0.00</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)" id="modalPremiumTotalAlt">(≈ 0.00 TON)</div>
                </div>
            </div>

            <label class="form-label">Способ оплаты</label>
            <div id="premiumMethodsContainer"></div>
            <button class="action-btn prem-action-btn" id="modalPremiumBtn" onclick="apiBuyPremium(${months})" style="width:100%; margin: 16px 0 0">Оплатить</button>
        </div>
    `);
    
    if (state.target === 'other') document.getElementById('modalPremiumBtn').disabled = true;
    updatePremiumModalPrice(months);
}

// --- STARS ---
window.openStarsModal = function(defaultStars = 100) {
    state.pay.stars = { method: 'InternalWallet', currency: 'TON' };
    state.target = window.selfStatus.StarsAvailable ? 'self' : 'other';

    showModal('Telegram Stars', `
        <div class="page-stars-theme">
            <div id="modalTargetContainer">${renderTargetSection('stars')}</div>

            <label class="form-label">Количество звёзд</label>
            <input type="number" id="modalStarsAmount" class="form-input" value="${defaultStars}" min="50" step="50" oninput="updateStarsModalPrice()">
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin: 18px 0;">
                <span style="font-size:14px; font-weight:700; color:var(--text-secondary)">Итого:</span>
                <div style="text-align:right">
                    <div style="font-size:22px; font-weight:800; color:var(--text)" id="modalStarsTotalUsd">$0.00</div>
                    <div style="font-size:13px; font-weight:600; color:var(--text-muted)" id="modalStarsTotalAlt">(≈ 0.00 TON)</div>
                </div>
            </div>

            <label class="form-label">Способ оплаты</label>
            <div id="starsMethodsContainer"></div>
            <button class="action-btn stars-action-btn" id="modalStarsBtn" onclick="apiBuyStars()" style="width:100%; margin: 16px 0 0">Оплатить</button>
        </div>
    `);
    
    if (state.target === 'other') document.getElementById('modalStarsBtn').disabled = true;
    updateStarsModalPrice();
}

window.openTonConnectModal = function(nftAddress) {
    showModal('Установка NFT', `
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:14px">
            1. Откройте настройки Telegram -> Ваш Профиль -> Подарки.<br>
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

    const res = await apiCall('/webapp/rent/connect', { nftAddress, uri });
    
    setLoading(btn, false); 

    if (res && res.Success) {
        safeAlert('✅ Кошелек успешно подключен! NFT должен появиться в вашем профиле Telegram.');
        closeModal();
    } else {
        safeAlert('❌ Ошибка: ' + (res?.Error || 'Не удалось подключить. Убедитесь, что ссылка свежая (они живут 2-3 минуты).'));
    }
}

init();