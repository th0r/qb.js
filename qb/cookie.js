(function(qb, each, document, undefined) {
  
  var encode = encodeURIComponent,
      decode = decodeURIComponent;

  /**
   * Возвращает document.cookie, преобразованный в объект
   * @param {Boolean} [parse]  Нужно ли преобразовывать строковые значения кук в другие js-типы (см. String.prototype.parse в core.js)
   *                           Опционально.
   * @returns {Object}  Объект вида {'key': 'value', ...}
   */
  function getCookies(parse) {
    var cookies = {};
    document.cookie.split('; ').forEach(function(part) {
      var ind = part.indexOf('='),
          value = decode( part.substr(ind+1) );
      cookies[decode( part.substr(0, ind) )] = parse ? value.parse() : value;
    });
    return cookies;
  }

  /**
   * Возвращает значение куки
   * @param {String} key  Ключ, значение которого нужно получить
   * @param {Boolean} [parse]  Нужно ли его преобразовывать из строки
   * @returns  Возвращает undefined, если такого ключа в куках нет или его значение, если он есть
   */
  function get(key, parse) {
    var regex = new RegExp(';\\s' + encode(key).escapeRegexp() + '=(.*?);'),
        result = regex.exec('; ' + document.cookie + ';');
    if (result) {
      result = decode(result[1]);
      return parse ? result.parse() : result;
    }
    return undefined;
  }

  /**
   * Устанавливает куку
   * @param {String} key  Ключ куки. Он будет преобразован в строку методом encode.
   * @param value  Значение куки. Оно будет преобразовано в строку методом encode.
   * @param {Number|Date} till  Если указано число, то это время жизни куки в секундах
   *                            Если указан объект Date, то кука будет жить до этой даты
   * @param {String} domain  Домен, для которого активна данная кука
   * @param {Boolean} secure  Будет ли кука доступна только по защищенному соединению
   * @returns {String}  Сформированная строка, которая присвоилась document.cookie для установки этой куки
   */
  function set(key, value, till, domain, secure) {
    if (till != null) {
      if (typeof till === 'number') {
        till = '; max-age=' + till;
      } else if (Date.is(till)) {
        till = '; expires=' + till.toUTCString();
      } else {
        till = null;
      }
    }
    return (document.cookie = encode(key) + '=' + encode(value) + (till || '') +
                              (domain ? '; domain=' + domain : '') + (secure ? '; secure' : '') );
  }

  /**
   * Удаляет куку
   * @param {String} key  Ключ удаляемой куки
   */
  function remove(key) {
    set(key, '', 0);
  }

  /**
   * Удаляет все доступные куки
   * @returns {Boolean}  Возвращает true, если после очистки document.cookie пуст
   */
  function clear() {
    each( getCookies(), function(value, key) {
      remove(key);
    });
    return !document.cookie;
  }

  qb.cookie = {
    all: getCookies,
    get: get,
    set: set,
    remove: remove,
    clear: clear
  };

})(qb, qb.each, document);