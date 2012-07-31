(function(qb, each, document, undefined) {

    var encode = encodeURIComponent,
        decode = decodeURIComponent;

    /**
     * Возвращает document.cookie, преобразованный в объект.
     * @param {Boolean} [parse=false]  Опционально. Нужно ли преобразовывать строковые значения кук в другие js-типы.
     *                                 (см. String.prototype.parse в core.js).
     * @returns {Object}  Объект вида {'key': 'value', ...}
     */
    function getAll(parse) {
        var cookies = {};
        document.cookie.split('; ').forEach(function(part) {
            var ind = part.indexOf('='),
                key = (ind > -1) ? decode(part.substr(0, ind)) : part,
                value = (ind > -1) ? decode(part.substr(ind + 1)) : '';
            if (key) {
                cookies[key] = parse ? value.parse() : value;
            }
        });
        return cookies;
    }

    /**
     * Возвращает значение куки.
     * @param {String} key  Ключ, значение которого нужно получить.
     * @param {Boolean} [parse=false]  Опционально. Нужно ли его преобразовывать из строки.
     * @returns  Возвращает undefined, если такого ключа в куках нет или его значение, если он есть.
     */
    function get(key, parse) {
        var regex = new RegExp(';\\s' + encode(key).escapeRegexp() + '(?:=(.*?))?;'),
            result = regex.exec('; ' + document.cookie + ';');
        if (result) {
            result = decode(result[1] || '');
            return parse ? result.parse() : result;
        }
        return undefined;
    }

    /**
     * Устанавливает куку.
     * @param {String} key  Ключ куки. Он будет преобразован в строку методом encode.
     * @param [value='']  Опционально. Значение куки. Оно будет преобразовано в строку методом encode.
     * @param {Number|Date|Boolean} [till]  Опционально. Если указано число, то это время жизни куки в секундах.
     *                                      Если указан объект Date, то кука будет жить до этой даты.
     *                                      Если указано true, то кука будет "вечной" (около 10 лет)
     *                                      Если не указан, то кука будет жить до конца текущей сессии.
     * @param {String} [domain]  Опционально. Домен, для которого активна данная кука.
     * @param {Boolean} [secure]  Опционально. Будет ли кука доступна только по защищенному соединению.
     * @returns {String}  Сформированная строка, которая присвоилась document.cookie для установки этой куки.
     */
    function set(key, value, till, domain, secure) {
        if (value === undefined) {
            value = '';
        }
        var expires = till;
        if (!Date.is(expires)) {
            expires = null;
            if (till === true) {
                // "Вечная" кука (около 10 лет)
                till = 3E8;
            }
            if (typeof till === 'number') {
                expires = new Date();
                expires.setSeconds(expires.getSeconds() + till);
            }
        }
        // Используется только expires, так как max-age не поддерживает IE6-8
        return (document.cookie = [encode(key), '=', encode(value),
                                   (expires ? '; expires=' + expires.toUTCString() : ''),
                                   (domain ? '; domain=' + domain : ''),
                                   (secure ? '; secure' : '')].join(''));
    }

    /**
     * Удаляет куку
     * @param {String} key  Ключ удаляемой куки
     */
    function remove(key) {
        // Отнимаем день от текущей даты
        set(key, '', new Date(Date.now() - 864e5));
    }

    /**
     * Проверяет, установлена ли кука
     * @param key  Ключ проверяемой куки
     */
    function has(key) {
        return get(key) !== undefined;
    }

    /**
     * Удаляет все доступные куки
     * @returns {Boolean}  Возвращает true, если после очистки document.cookie пуст
     */
    function clear() {
        each(getAll(), function(value, key) {
            remove(key);
        });
        return !document.cookie;
    }

    qb.cookie = {
        all: getAll,
        get: get,
        set: set,
        has: has,
        remove: remove,
        clear: clear
    };

})(qb, qb.each, document);