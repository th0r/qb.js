(function(qb, each, document, undefined) {
  
  var encode = encodeURIComponent,
      decode = decodeURIComponent;

  function getCookies(parse) {
    var cookies = {};
    document.cookie.split('; ').forEach(function(part) {
      var ind = part.indexOf('='),
          value = decode( part.substr(ind+1) );
      cookies[decode( part.substr(0, ind) )] = parse ? value.parse() : value;
    });
    return cookies;
  }

  function get(key, parse) {
    var regex = new RegExp(';\\s' + encode(key).escapeRegexp() + '=(.*?);'),
        result = regex.exec('; ' + document.cookie + ';');
    if (result) {
      result = decode(result[1]);
      return parse ? result.parse() : result;
    }
    return undefined;
  }

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

  function remove(key) {
    set(key, '', 0);
  }

  qb.cookie = {
    all: getCookies,
    get: get,
    set: set,
    remove: remove
  };

})(qb, qb.each, document);