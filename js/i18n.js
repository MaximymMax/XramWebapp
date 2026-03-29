const translations = {
    ru: {
        // Navigation
        nav_home: 'Главная',
        nav_stars: 'Stars',
        nav_premium: 'Premium',
        nav_rent: 'Аренда',
        nav_profile: 'Профиль',

        // Common
        loading: 'Загрузка...',

        // Home page
        home_balances: 'Ваши балансы',
        home_ton_wallet: 'TON Кошелёк',
        home_frozen: 'Заморожено (Чеки)',
        btn_topup_balance: 'Пополнить баланс',
        home_services: 'Сервисы',
        home_account: 'Аккаунт',

        // Services
        svc_stars_title: 'Telegram Stars',
        svc_stars_sub_price: 'от $0.015 за штуку',
        svc_prem_title: 'Telegram Premium',
        svc_prem_sub_months: '3, 6 или 12 месяцев',
        svc_rent_title: 'Аренда NFT-подарков',
        svc_rent_sub: 'Цифровые коллекции',
        svc_prof_title: 'Профиль и история',
        svc_prof_sub: 'Мои чеки, транзакции',

        // Recipient tabs
        label_recipient: 'Получатель',
        tab_self: 'Себе',
        tab_other: 'Другому',
        tab_cheque: 'Чек',
        badge_me: 'Я',
        label_cheque_duration: 'Срок действия чека',

        // Packages
        pkg_custom_amount: 'Своё количество',
        pkg_3_months: '3 месяца',
        pkg_6_months: '6 месяцев',
        pkg_12_months: '12 месяцев',

        // Rent
        rent_tab_gifts: 'Подарки',
        rent_tab_usernames: 'Юзернеймы',
        rent_tab_numbers: 'Номера',
        label_collection: 'Коллекция',
        label_model: 'Модель',
        label_sort: 'Сортировка',
        label_available_nft: 'Доступные NFT',
        btn_show_more: 'Показать еще',
        hint_click_card: 'Нажмите на карточку для аренды',

        // Wallet
        title_topup: 'Пополнение',
        title_withdraw: 'Вывод средств',
        label_amount: 'Сумма',
        label_recipient_address: 'Адрес получателя',
        placeholder_address: 'EQ... или UQ...',
        placeholder_amount: 'Введите сумму TON',
        btn_topup: 'Пополнить TON',
        btn_withdraw: 'Вывести средства',

        // Profile
        tab_my_cheques: 'Мои чеки',
        tab_history: 'История',
        loading: 'Загрузка...',
        empty_no_cheques: 'Нет активных чеков',
        empty_cheques_hint: 'Создайте чек при покупке Stars или Premium',
        empty_history: 'История пуста',
        empty_history_hint: 'Здесь будут отображаться ваши покупки',
        empty_no_rentals: 'Нет активной аренды',
        empty_gw_my: 'У вас нет созданных розыгрышей',
        empty_gw_all: 'Нет активных розыгрышей',
        empty_gw_part: 'Вы не участвуете в активных розыгрышах',

        // Modal / Payment
        modal_order: 'Оформление заказа',
        modal_balance: 'Баланс:',
        modal_product: 'Товар',
        modal_recipient: 'Получатель',
        modal_total: 'К оплате:',
        modal_pay_method: 'Способ оплаты',
        modal_pay_internal: 'Оплатить со счета',
        modal_pay_topup: 'Пополнить',
        modal_pay_transfer: 'Перевод TON',
        modal_pay_card: 'Карта (RUB)',
        modal_pay_stars: 'Звёзды',
        modal_confirm: 'Подтвердить заказ',
        modal_frozen_note: 'Сумма будет заморожена на балансе',
        modal_target_self: 'На свой аккаунт',
        modal_target_cheque_inf: 'Чек (бессрочный)',
        modal_target_cheque: 'Чек (на {hours} ч.)',
        modal_topup_title: 'Пополнение баланса',
        modal_topup_amount: 'Сумма пополнения',
        modal_topup_btn: 'Пополнить',

        // Crypto transfer modal
        crypto_title: 'Крипто-перевод',
        crypto_desc: 'Переведите точную сумму на кошелек бота и укажите код в комментарии.',
        crypto_amount: 'Сумма',
        crypto_wallet_label: 'Кошелек (сохраните адрес)',
        crypto_copy_wallet: 'Копировать',
        crypto_code_label: 'Код комментария (ОБЯЗАТЕЛЬНО)',
        crypto_copy_code: 'Копировать',
        crypto_warning: 'Без кода в комментарии деньги не зачислятся!',
        crypto_wallet_copied: 'Кошелек скопирован',
        crypto_code_copied: 'Код скопирован',

        // Stars modal
        stars_invoice_title: 'Оплата Звездами',
        stars_invoice_sent: 'Счет выставлен!',
        stars_invoice_desc: 'Закройте это окно и вернитесь в чат с ботом. Мы отправили вам счет на оплату Telegram Stars.',
        stars_close_webapp: 'Закрыть WebApp',
        stars_test_ok: 'Тестовый режим: Оплата Звездами сымитирована и прошла успешно!',

        // Cheque modal
        cheque_created: '🧾 Чек успешно создан!',
        cheque_desc: 'Средства заморожены. Перешлите эту ссылку получателю:',
        cheque_copy: 'Копировать',
        cheque_go_to: 'Перейти в Мои чеки',

        // Alerts
        alert_check_target: 'Пожалуйста, проверьте юзернейм получателя или срок чека.',
        alert_min_stars: 'Минимум 50 звезд',
        alert_order_success: 'Заявка успешно обработана! Подробности в профиле.',
        alert_tx_sent: 'Запрос отправлен. Баланс будет пополнен после подтверждения сети.',
        alert_min_topup: 'Минимальная сумма пополнения 0.1 TON',
        alert_min_withdraw: 'Минимальная сумма вывода 0.1 TON',
        alert_fill_fields: 'Заполните все поля',
        alert_withdraw_ok: 'Заявка на вывод создана!',
        alert_wallet_info: 'Для подключения кошелька используйте бота или раздел Моя Аренда.',

        // Other
        hdr_tonconnect: 'TON Connect',
        btn_support: 'Связаться с поддержкой',
        wait_tx: 'Ожидайте создания транзакции...',
        username_checking: 'Проверяется...',
        username_not_found: 'Пользователь не найден',
        test_mode_banner: '⚙️ ТЕСТОВЫЙ РЕЖИМ (ДЕНЬГИ НЕ СПИСЫВАЮТСЯ)',

        // Buy buttons
        btn_buy_stars: 'Купить {count} Stars',
        btn_buy_premium: 'Купить Premium {months} мес',

        // Rent per day
        rent_per_day: '/ дн',

        // Giveaways
        gw_tab_create: 'Создать',
        gw_tab_part: 'Участвую',
        gw_tab_my: 'Мои',
        gw_prize_type: 'Что разыгрываем?',
        gw_amount_stars: 'Звезд на победителя (мин. 50)',
        gw_amount_ton: 'TON на победителя (мин. 0.5)',
        gw_amount_prem: 'Длительность Premium',
        gw_winners: 'Количество победителей',
        gw_end_date: 'Дата и время окончания (не менее 24ч)',
        gw_total: 'Итого к оплате:',
        gw_insufficient: 'Недостаточно TON на балансе',
        gw_btn_pay: 'Оплатить и запустить',
        gw_topup: 'Пополнить баланс',
        gw_min_duration_err: 'Минимальная длительность - 1 день (24ч)',

        // Referrals
        tab_referrals: 'Рефералы',
        ref_title: 'Реферальная программа',
        ref_home_sub: 'Зарабатывайте 10% с каждой покупки друга',
        ref_desc: 'Приглашайте друзей по вашей ссылке и получайте <b>10% от чистой прибыли</b> сервиса с каждой их покупки! Деньги моментально зачисляются на ваш TON-баланс.',
        ref_invited: 'Приглашено:',
        ref_earned: 'Заработано (10%):',
        ref_link_label: 'Ваша ссылка для приглашения',
        home_referrals: 'Реферальная программа',
        home_api: 'API для разработчиков',
        
        // API
        tab_api: 'API',
        api_title: 'API для разработчиков',
        api_home_sub: 'Интегрируйте Xram в свои сервисы',
        api_desc: 'Используйте API-ключ для интеграции с вашими сервисами. Храните ключ в секрете.',
        api_key_label: 'Ваш API-ключ',
        api_reset_btn: 'Сбросить ключ',
        api_reset_confirm: 'Вы уверены, что хотите сбросить API-ключ? Старый ключ перестанет работать.',
        api_reset_ok: 'API-ключ успешно сброшен!',
        api_reset_err: 'Ошибка при сбросе ключа',
        api_docs_title: 'Документация',
        api_doc_auth: '🔐 Авторизация',
        api_doc_auth_note: 'Передавайте API-ключ в заголовке запроса:',
        api_doc_baseurl: '🌐 Base URL',
        api_doc_user: '👤 Пользователь',
        api_doc_tx_params: '?status=Pending|Completed|Failed|Cancelled',
        api_doc_balance: '💰 Баланс и история',
        api_doc_transactions: '💳 Транзакции',
        api_doc_rent: '🎁 Аренда NFT',
        api_doc_giveaway: '🎰 Розыгрыши',
        api_doc_misc: '⚙️ Прочее',
    },
    en: {
        // Navigation
        nav_home: 'Home',
        nav_stars: 'Stars',
        nav_premium: 'Premium',
        nav_rent: 'Rent',
        nav_profile: 'Profile',

        // Common
        loading: 'Loading...',

        // Home page
        home_balances: 'Your balances',
        home_ton_wallet: 'TON Wallet',
        home_frozen: 'Frozen (Cheques)',
        btn_topup_balance: 'Top up balance',
        home_services: 'Services',
        home_account: 'Account',

        // Services
        svc_stars_title: 'Telegram Stars',
        svc_stars_sub_price: 'from $0.015 each',
        svc_prem_title: 'Telegram Premium',
        svc_prem_sub_months: '3, 6 or 12 months',
        svc_rent_title: 'NFT Gift Rentals',
        svc_rent_sub: 'Digital collections',
        svc_prof_title: 'Profile & History',
        svc_prof_sub: 'My cheques, transactions',

        // Recipient tabs
        label_recipient: 'Recipient',
        tab_self: 'Myself',
        tab_other: 'Other',
        tab_cheque: 'Cheque',
        badge_me: 'Me',
        label_cheque_duration: 'Cheque validity',

        // Packages
        pkg_custom_amount: 'Custom amount',
        pkg_3_months: '3 months',
        pkg_6_months: '6 months',
        pkg_12_months: '12 months',

        // Rent
        rent_tab_gifts: 'Gifts',
        rent_tab_usernames: 'Usernames',
        rent_tab_numbers: 'Numbers',
        label_collection: 'Collection',
        label_model: 'Model',
        label_sort: 'Sort by',
        label_available_nft: 'Available NFTs',
        btn_show_more: 'Show more',
        hint_click_card: 'Tap a card to rent',

        // Wallet
        title_topup: 'Top Up',
        title_withdraw: 'Withdrawal',
        label_amount: 'Amount',
        label_recipient_address: 'Recipient address',
        placeholder_address: 'EQ... or UQ...',
        placeholder_amount: 'Enter TON amount',
        btn_topup: 'Top Up TON',
        btn_withdraw: 'Withdraw',

        // Profile
        tab_my_cheques: 'My Cheques',
        tab_history: 'History',
        loading: 'Loading...',
        empty_no_cheques: 'No active cheques',
        empty_cheques_hint: 'Create a cheque when buying Stars or Premium',
        empty_history: 'History is empty',
        empty_history_hint: 'Your purchases will be displayed here',
        empty_no_rentals: 'No active rentals',
        empty_gw_my: 'You have not created any giveaways',
        empty_gw_all: 'No active giveaways',
        empty_gw_part: 'You are not participating in any active giveaways',

        // Modal / Payment
        modal_order: 'Place Order',
        modal_balance: 'Balance:',
        modal_product: 'Product',
        modal_recipient: 'Recipient',
        modal_total: 'Total:',
        modal_pay_method: 'Payment method',
        modal_pay_internal: 'Pay from balance',
        modal_pay_topup: 'Top up',
        modal_pay_transfer: 'TON Transfer',
        modal_pay_card: 'Card (RUB)',
        modal_pay_stars: 'Stars',
        modal_confirm: 'Confirm order',
        modal_frozen_note: 'Amount will be frozen on balance',
        modal_target_self: 'To my account',
        modal_target_cheque_inf: 'Cheque (permanent)',
        modal_target_cheque: 'Cheque ({hours} hrs)',
        modal_topup_title: 'Top Up Balance',
        modal_topup_amount: 'Top up amount',
        modal_topup_btn: 'Top up',

        // Crypto transfer modal
        crypto_title: 'Crypto Transfer',
        crypto_desc: 'Send the exact amount to the bot wallet and include the code in the comment.',
        crypto_amount: 'Amount',
        crypto_wallet_label: 'Wallet (save the address)',
        crypto_copy_wallet: 'Copy',
        crypto_code_label: 'Comment code (REQUIRED)',
        crypto_copy_code: 'Copy',
        crypto_warning: 'Without the code in the comment, funds will not be credited!',
        crypto_wallet_copied: 'Wallet copied',
        crypto_code_copied: 'Code copied',

        // Stars modal
        stars_invoice_title: 'Pay with Stars',
        stars_invoice_sent: 'Invoice sent!',
        stars_invoice_desc: 'Close this window and return to the bot chat. We have sent you an invoice to pay with Telegram Stars.',
        stars_close_webapp: 'Close WebApp',
        stars_test_ok: 'Test mode: Stars payment simulated successfully!',

        // Cheque modal
        cheque_created: '🧾 Cheque created!',
        cheque_desc: 'Funds are frozen. Share this link with the recipient:',
        cheque_copy: 'Copy',
        cheque_go_to: 'Go to My Cheques',

        // Alerts
        alert_check_target: 'Please check the recipient username or cheque duration.',
        alert_min_stars: 'Minimum 50 stars',
        alert_order_success: 'Order processed successfully! Details in profile.',
        alert_tx_sent: 'Request sent. Balance will be updated after network confirmation.',
        alert_min_topup: 'Minimum top-up amount is 0.1 TON',
        alert_min_withdraw: 'Minimum withdrawal amount is 0.1 TON',
        alert_fill_fields: 'Please fill in all fields',
        alert_withdraw_ok: 'Withdrawal request created!',
        alert_wallet_info: 'To connect a wallet, use the bot or the My Rentals section.',

        // Other
        hdr_tonconnect: 'TON Connect',
        btn_support: 'Contact support',
        wait_tx: 'Waiting for transaction...',
        username_checking: 'Checking...',
        username_not_found: 'User not found',
        test_mode_banner: '⚙️ TEST MODE (NO CHARGES)',

        // Buy buttons
        btn_buy_stars: 'Buy {count} Stars',
        btn_buy_premium: 'Buy Premium {months} mo',

        // Rent per day
        rent_per_day: '/ day',

        // Giveaways
        gw_tab_create: 'Create',
        gw_tab_part: 'Participating',
        gw_tab_my: 'My',
        gw_prize_type: 'What is the prize?',
        gw_amount_stars: 'Stars per winner (min 50)',
        gw_amount_ton: 'TON per winner (min 0.5)',
        gw_amount_prem: 'Premium duration',
        gw_winners: 'Number of winners',
        gw_end_date: 'End date and time (min 24h)',
        gw_total: 'Total to pay:',
        gw_insufficient: 'Insufficient TON balance',
        gw_btn_pay: 'Pay and start',
        gw_topup: 'Top up balance',
        gw_min_duration_err: 'Minimum duration is 1 day (24h)',

        // Referrals
        tab_referrals: 'Referrals',
        ref_title: 'Referral Program',
        ref_home_sub: 'Earn 10% from every friend\'s purchase',
        ref_desc: 'Invite friends using your link and get <b>10% of net profit</b> from each of their purchases! Money is instantly credited to your TON balance.',
        ref_invited: 'Invited:',
        ref_earned: 'Earned (10%):',
        ref_link_label: 'Your referral link',
        home_referrals: 'Referral Program',
        home_api: 'API for Developers',
        
        // API
        tab_api: 'API',
        api_title: 'Developer API',
        api_home_sub: 'Integrate Xram into your services',
        api_desc: 'Use the API key to integrate with your services. Keep the key secret.',
        api_key_label: 'Your API key',
        api_reset_btn: 'Reset key',
        api_reset_confirm: 'Are you sure you want to reset the API key? The old key will stop working.',
        api_reset_ok: 'API key successfully reset!',
        api_reset_err: 'Error resetting key',
        api_docs_title: 'Documentation',
        api_doc_auth: '🔐 Authorization',
        api_doc_auth_note: 'Pass the API key in the request header:',
        api_doc_baseurl: '🌐 Base URL',
        api_doc_user: '👤 User',
        api_doc_tx_params: '?status=Pending|Completed|Failed|Cancelled',
        api_doc_balance: '💰 Balance & History',
        api_doc_transactions: '💳 Transactions',
        api_doc_rent: '🎁 NFT Rentals',
        api_doc_giveaway: '🎰 Giveaways',
        api_doc_misc: '⚙️ Other',
    }
};

window.currentLang = 'ru';

/**
 * Get a translated string by key. Supports {placeholder} replacement.
 * @param {string} key Translation key
 * @param {Object} [params] Replacement params, e.g. { count: 50 }
 * @returns {string} Translated string
 */
window.t = function (key, params) {
    const lang = window.currentLang || 'ru';
    let text = (translations[lang] && translations[lang][key]) || (translations.ru && translations.ru[key]) || key;
    if (params) {
        Object.keys(params).forEach(k => {
            text = text.replace(`{${k}}`, params[k]);
        });
    }
    return text;
}

window.switchLang = function (lang) {
    window.currentLang = lang;

    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
        langLabel.textContent = lang === 'en' ? '🇬🇧 EN' : '🇷🇺 RU';
    }
    const dropdownWrap = document.getElementById('langDropdownWrap');
    if (dropdownWrap) {
        dropdownWrap.classList.remove('open');
    }

    // Translate all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else {
                if (translations[lang][key].includes('<')) {
                    el.innerHTML = translations[lang][key];
                } else {
                    let foundTextNode = false;
                    for (let i = 0; i < el.childNodes.length; i++) {
                        const child = el.childNodes[i];
                        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
                            child.textContent = translations[lang][key];
                            foundTextNode = true;
                            break;
                        }
                    }
                    if (!foundTextNode) {
                        el.textContent = translations[lang][key];
                    }
                }
            }
        }
    });

    // Update dynamic buttons
    if (typeof updateTopupBtn === 'function') updateTopupBtn();
    if (typeof updateStarsBtn === 'function') updateStarsBtn();
    if (typeof updatePremiumBtn === 'function') updatePremiumBtn();

    // Save preference
    try { localStorage.setItem('xram_lang', lang); } catch (e) { }
}

// Restore saved language preference on load
try {
    const savedLang = localStorage.getItem('xram_lang');
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    const finalLang = savedLang || (tgLang === 'ru' ? 'ru' : 'en');
    
    // Call switchLang directly instead of placing in DOMContentLoaded
    // so it executes immediately on script load
    switchLang(finalLang);
    
    document.addEventListener('DOMContentLoaded', () => {
        switchLang(finalLang);
    });
} catch (e) { }

// Automatically translate dynamically added elements
const observer = new MutationObserver((mutations) => {
    let shouldTranslate = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldTranslate = true;
            break;
        }
    }
    if (shouldTranslate && window.currentLang) {
        const lang = window.currentLang;
        document.querySelectorAll('[data-i18n]:not([data-i18n-applied])').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[lang][key];
                } else {
                    if (translations[lang][key].includes('<')) {
                        el.innerHTML = translations[lang][key];
                    } else {
                        let foundTextNode = false;
                        for (let i = 0; i < el.childNodes.length; i++) {
                            const child = el.childNodes[i];
                            if (child.nodeType === Node.TEXT_NODE && child.textContent.trim() !== '') {
                                child.textContent = translations[lang][key];
                                foundTextNode = true;
                                break;
                            }
                        }
                        if (!foundTextNode) {
                            el.textContent = translations[lang][key];
                        }
                    }
                }
                el.setAttribute('data-i18n-applied', lang);
            }
        });
    }
});
observer.observe(document.body, { childList: true, subtree: true });
