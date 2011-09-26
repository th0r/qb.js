(function(window, document, undefined) {

  var qb = {};

  /**
   * Namespace - функция для создания областей видимости
   * @param path {String} Строка вида "ns.ns1.ns2"
   * @param [parent=qb] {Object} Опционально. Объект, в котором будут создаваться области видимости.
   * @param [finalObj={}] {Object} Опционально. Объект, который будет записан на место последней области видимости.
   */
  function ns(path, parent, finalObj) {
    var parts = path.split('.'),
        ns = parent || qb;
    for (var i = 0, len = parts.length - 1; i < len; i++) {
      var part = parts[i];
      if (part) {
        ns = ns[part] = ns[part] || {};
      }
    }
    part = parts[i];
    ns = ns[part] = finalObj || ns[part] || {};
    return ns;
  }

  /*----------   Основные утилиты   ----------*/

  /**
   * Декоратор, который первый аргумент сгенеренный функции превращает в this декорируемой.
   * Пример: var slice = Array.prototype.slice.thisToArg();
   *         slice([1, 2, 3], 1, 2) эквивалентно Array.prototype.slice.call([1, 2, 3], 1, 2)
   */
  var slice = Array.prototype.slice;
  Function.prototype.thisToArg = function() {
    var fn = this;
    return function() {
      return fn.apply(arguments[0], slice.call(arguments, 1));
    }
  };

  function merge(to, from/*, onlyOwn=false, keepExisting=false*/) {
    var onlyOwn = arguments[2],
        keepExisting = arguments[3];
    for (var prop in from) {
      if (!onlyOwn || onlyOwn && from.hasOwnProperty(prop)) {
        if (!keepExisting || keepExisting && !(prop in to)) {
          to[prop] = from[prop];
        }
      }
    }
    return to;
  }

  function fromProtoToStatic(constructor, methods) {
    var proto = constructor.prototype;
    methods.forEach(function(method) {
      if (!constructor.hasOwnProperty(method)) {
        constructor[method] = proto[method].thisToArg();
      }
    })
  }

  var toString = Object.prototype.toString.thisToArg();

  /*----------   Расширение Function   ----------*/
  merge(Function, {
    isFunction: function(obj) {
      return ( toString(obj) == '[object Function]' );
    },
    check: function(obj) {
      return Function.is(obj) ? obj : false;
    },
    from: function(obj) {
      return function() {
        return obj;
      }
    }
  }, false, true);
  Function.is = Function.isFunction;

  merge(Function.prototype, {
    bind: function(thisObj/*, arg1, arg2...*/) {
      var fn = this,
          prependedArgs = arguments.length > 1 ? Array.slice(arguments, 1) : null;
      return function() {
        var args = Array.slice(arguments);
        return fn.apply(thisObj, prependedArgs ? prependedArgs.concat(args) : args);
      }
    },
    callAfter: function(otherFn) {
      var fn = this;
      return function() {
        otherFn.apply(this, arguments);
        return fn.apply(this, arguments);
      }
    },
    callBefore: function(otherFn) {
      return otherFn.callAfter(this);
    }
  }, false, true);

  /*----------   Расширение Object   ----------*/
  merge(Object, {
    isObject: function(obj) {
      return typeof obj === 'object' && obj !== null && !Array.is(obj);
    },
    isIteratable: function(obj) {
      return obj && obj.length != null && typeof obj !== 'string' && !Function.is(obj);
    },
    keys: function(obj) {
      if (Object.is(obj)) {
        var keys = [];
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys.push(key);
          }
        }
      }
      return keys || [];
    }
  }, false, true);
  Object.is = Object.isObject;

  /*----------   Расширение Array   ----------*/
  merge(Array, {
    isArray: function(obj) {
      return ( toString(obj) == '[object Array]' );
    },
    from: function(obj) {
      if (Array.is(obj)) {
        return obj;
      } else if (obj == undefined) {
        return [];
      } else if (Object.isIteratable(obj)) {
        return Array.slice(obj);
      } else {
        return [obj];
      }
    }
  }, false, true);
  Array.is = Array.isArray;

  merge(Array.prototype, {
    // Методы из Javascript 1.6
    indexOf: function(item) {
      for (var i = 0, len = this.length; i < len; i++) {
        if (this[i] === item) {
          return i;
        }
      }
      return -1;
    },
    lastIndexOf: function(item) {
      var i = this.length;
      while (i--) {
        if (this[i] === item) {
          return i;
        }
      }
      return -1;
    },
    forEach: function(callback/*, thisObj=window*/) {
      var len = this.length;
      if (len) {
        var thisObj = arguments[1];
        for (var i = 0; i < len; i++) {
          callback.call(thisObj, this[i], i, this);
        }
      }
      return this;
    },
    filter: function(callback/*, thisObj=window*/) {
      var thisObj = arguments[1],
          res = [];
      for (var i = 0, len = this.length; i < len; i++) {
        var val = this[i];
        if (callback.call(thisObj, val, i, this)) {
          res.push(val);
        }
      }
      return res;
    },
    map: function(callback/*, thisObj=window*/) {
      var thisObj = arguments[1],
          res = [];
      for (var i = 0, len = this.length; i < len; i++) {
        res[i] = callback.call(thisObj, this[i], i, this);
      }
      return res;
    },
    every: function(callback/*, thisObj=window*/) {
      var thisObj = arguments[1];
      for (var i = 0, len = this.length; i < len; i++) {
        if (!callback.call(thisObj, this[i], i, this)) {
          return false;
        }
      }
      return true;
    },
    some: function(callback/*, thisObj=window*/) {
      var thisObj = arguments[1];
      for (var i = 0, len = this.length; i < len; i++) {
        if (callback.call(thisObj, this[i], i, this)) {
          return true;
        }
      }
      return false;
    },

    // Дополнительные методы
    last: function() {
      return this[(this.length || 1) - 1];
    },
    contains: function(item) {
      return this.indexOf(item) >= 0;
    },
    include: function(item) {
      if (!this.contains(item)) {
        this.push(item);
      }
    },
    remove: function(item/*, fromEnd=false*/) {
      var i = this[arguments[1] ? 'lastIndexOf' : 'indexOf'](item);
      if (i >= 0) {
        this.splice(i, 1);
      }
    },
    erase: function(item) {
      var i = this.length;
      while (i--) {
        if (this[i] === item) {
          this.splice(i, 1);
        }
      }
    },
    clean: function() {
      return this.filter(function(item) {
        return item || item === false;
      });
    },
    append: function(array) {
      for (var i = 0, len = array.length; i < len; i++) {
        this.push(array[i]);
      }
    },
    forEachCall: function(methodName/*, arg1...argN*/) {
      var args = Array.slice(arguments, 1);
      this.forEach(function(callable) {
        callable[methodName].apply(callable, args);
      });
    }
  }, false, true);

  fromProtoToStatic(Array, ['slice', 'splice']);

  /*----------   Расширение String   ----------*/
  var reFormatReplace = /\{(\w*)\}/g;

  merge(String.prototype, {
    contains: Array.prototype.contains,
    format: function(replaceObj) {
      return this.replace(reFormatReplace, function(fullExpr, expr) {
        if (expr) {
          return replaceObj.hasOwnProperty(expr) ? replaceObj[expr] : '';
        } else {
          return replaceObj;
        }
      });
    },
    startsWith: function(str) {
      return this.substr(0, str.length) === str;
    },
    endsWith: function(str) {
      return this.substr(-str.length) === str;
    },
    escapeRegexp: function() {
      return this.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
  }, false, true);

  /*----------   Расширение Date   ----------*/
  merge(Date.prototype, {
    now: function() {
      return +new Date();
    }
  }, false, true);

  /*----------   Дополнительные утилиты   ----------*/
  function each(obj, fn/*, onlyOwn=false*/) {
    var onlyOwn = arguments[2];
    if (Object.isIteratable(obj)) {
      obj = Array.from(obj);
      for (var i = 0, len = obj.length; i < len; i++) {
        if (fn.call(obj, obj[i], i, obj) === false) {
          break;
        }
      }
    } else if (Object.is(obj)) {
      for (var prop in obj) {
        if (!onlyOwn || onlyOwn && obj.hasOwnProperty(prop)) {
          if (fn.call(obj, obj[prop], prop, obj) === false) {
            break;
          }
        }
      }
    }
  }

  /*----------   Реализация Class   ----------*/
  function Empty() {}

  function Class(info) {
    var Name = info.Name,
        Extends = info.Extends,
        Implements = Array.from(info.Implements),
        Static = info.Static,
        init = info.init;

    var constructor = function() {
      var self = this;
      // Вызов конструкторов примесей (для добавления необходимых атрибутов создаваемому объекту)
      // Вызываем даже в вызове конструктора примесей, т.е. если примесь имплементит другую примесь,
      // будет вызван конструктор этой другой примеси TODO: 1) правильно ли? (связано с 2)
      //if( self instanceof constructor ) {
      Implements.forEach(function(Mixin) {
        Mixin.call(this);
      }, self);
      //}

      // Вызов собственного конструктора
      if (init) {
        init.apply(self, arguments);
      }
    };

    // Статичные атрибуты
    if (Static) {
      merge(constructor, Static, true);
    }
    // Наследование (часть 1)
    var proto = constructor.prototype;
    if (Extends) {
      Empty.prototype = Extends.prototype;
      proto = constructor.prototype = new Empty();
    }
    // Примеси
    Implements.forEach(function(Mixin) {
      // Мержим всю ветку прототипов, а не конкретный прототип примеси TODO: 2) правильно ли?
      merge(this, Mixin.prototype, false/*true*/, true);
    }, proto);
    // Собственные атрибуты
    delete info.Name;
    delete info.Extends;
    delete info.Implements;
    delete info.Static;
    delete info.init;
    merge(proto, info, true);
    proto.constructor = constructor;
    // Наследование (часть 2)
    if (Extends) {
      // Вешаем имена на методы, чтобы можно было использовать метод super
      each(info, function(attr, name) {
        if (Function.is(attr)) {
          attr.$name = name;
        }
      });
      proto.$super = function() {
        var func = Extends.prototype[arguments.callee.caller.$name];
        return arguments.length ? func.apply(this, arguments) : func;
      }
    }
    // Название класса
    if (Name) {
      constructor.toString = Function.from(Name);
    }

    return constructor;
  }

  /*----------   Новый загрузчик   ------------*/
  /**
   *    1) Загрузка скриптов из root-js директории (расширение ".js" можно опускать - если его нет, оно добавится автоматически):
   *      'jquery/widgets: widget1, widget2, widget3; qb/classes: Collection, Events, Lazy;'
   *    2) Загрузка скриптов не из-под root-js или извне.
   *       В данном случае обработка урлов не проходит - в них не ищутся шорткаты, пакеты (см. ниже) и не добавляется расширение ".js"
   *      'http://domain/a.js; https://domain/b.js; www.domain.com/c.js; //domain.com/d.js; /static/other-js/c.js'
   * TODO: 3) Загрузка приоритетных скриптов:
   *       Такие скрипты будут загружены первыми из списка.
   *       Полезно, например, при загрузке jquery и плагинов к нему (jquery должен быть загружен перед плагинами).
   *       Для этого перед названием скрипта нужно поставить знак "!"
   *      '!jquery; jquery/plugins: jquery.form; jquery.ui
   *
   *    Также существуют шоткаты и пакеты.
   *    Шоткат - сокращение какой-нибудь части запроса, например для шотката '$ = jquery':
   *    '!$; $/plugins: $.form, $.ui' => '!jquery; jquery/plugins: jquery.form, jquery.ui'
   *    Последовательность символов является шоткатом, если она окружена спец-символами [!,;:./] или началом/концом строки
   *    Шоткатом может быть любая строка - она будет подставлена в запрос без преобразований.
   *
   *    Пакет - короткое название для нескольких скриптов, например 'qb.ClassesFull' = 'qb/classes: Collection, Events, Lazy, Sync'
   *    Пакеты определяются после подставления всех шоткатов.
   *    Последовательность символов является пакетом, если она окружена символами [;,] или началом/концом строки
   *
   */

  var HEAD_ELEM = document.getElementsByTagName('head')[0];

  var Shortcuts = new Class({
    Name: 'Shortcuts',

    init: function(edgeChars) {
      this.shortcuts = {};
      this.edgeChars = edgeChars;
    },
    add: function(shortcuts) {
      var currentShortcuts = this.shortcuts;
      each(shortcuts, function(value, shortcut) {
        currentShortcuts[shortcut] = normalizeQuery(value);
      });
      this._generateRegexp();
    },
    _generateRegexp: function() {
      var shortcuts = Object.keys(this.shortcuts).map(function(shortcut) {
        return shortcut.escapeRegexp();
      }).join('|');
      if (shortcuts) {
        var regexp = '(^|[{edges}])({shortcuts})(?=[{edges}]|$)'.format({
          edges: this.edgeChars,
          shortcuts: shortcuts
        });
      }
      this.regexp = regexp ? new RegExp(regexp, 'g') : null;
    },
    replaceIn: function(str) {
      var shortcuts = this.shortcuts;
      return this.regexp ? str.replace(this.regexp, function(_, left, shortcut) {
        return left + shortcuts[shortcut];
      }) : str;
    }
  });

  var Script = new Class({
    Name: Script,
    Static: {
      UNLOADED: 0,
      LOADING: 1,
      LOADED: 2,
      LOAD_ERROR: 3
    },

    init: function(url) {
      this.src = url;
      this.elem = null;
      this.status = Script.UNLOADED;
      this.callbacks = [];
      this.loaded = null;
    },
    load: function() {
      if (this.status === Script.UNLOADED) {
        this.status = Script.LOADING;
        var elem = this.elem = document.createElement('script');
        this._bindLoadHandler();
        elem.src = this.src;
        HEAD_ELEM.appendChild(elem);
      }
    },
    onload: function(callback) {
      var status = this.status;
      if (status === Script.LOADED) {
        this._executeCallback(callback);
      } else {
        this.callbacks.push(callback);
      }
    },
    defer: function() {
      var elem = this.elem;
      elem.onreadystatechange = elem.onload = null;
    },
    _executeCallback: function(callback) {
      callback.call(this, this);
    },
    _bindLoadHandler: function() {
      var self = this,
          elem = this.elem,
          loaded = this.loaded = function() {
            elem.onreadystatechange = elem.onload = elem.onerror = null;
            self.status = Script.LOADED;
            var callbacks = self.callbacks, callback;
            while (callback = callbacks.shift()) {
              self._executeCallback(callback);
            }
          };
      elem.onreadystatechange = function() {
        console.log( '"{0}": readyState = "{1}"'.format([self.src, this.readyState]) );
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
          loaded();
        }
      };
      elem.onload = loaded;
      elem.onerror = function(message, file, line) {
        self.status = Script.LOAD_ERROR;
        throw 'Не удалось загрузить скрипт "{1}":\n  Ошибка на строке {2}: "{0}"'.format([message, file, line]);
      }
    },
    toString: function() {
      return 'Script [{}]'.format(this.src);
    }
  });

  /**
   * Нормализует строку запроса (удаляет все пробельные символы)
   * @param {String} query  Строка запроса
   * @returns {String}
   */
  function normalizeQuery(query) {
    return query.replace(/\s/g, '');
  }

  /**
   * Разделяет строку запроса на части и удаляет из них пустые
   * @param {String} query  Строка запроса
   * @returns {Array}
   */
  function splitQuery(query) {
    return query.split(';').clean();
  }

  /**
   * Преобразует часть запроса вида "qb/classes:Sync,!Events" в массив ["qb/classes/Sync", "!qb/classes/Events"]
   * @param {String} part  Часть запроса
   * @param {String} joiner  Строка, которая будет соединять части слева и справа от ":"
   * @param {Boolean} checkPriority  Нужно ли проверять на наличие знака приоритета "!" и помещать его вначале парта
   * @returns {Array}
   */
  function splitPart(part, joiner, checkPriority) {
    var chunks = part.split(':').slice(0, 2),
        base = (chunks.length > 1) ? chunks[0] + joiner : '',
        childs = (chunks[1] || chunks[0]).split(',');
    return base ? childs.map(function(child) {
      return (checkPriority && child.charAt(0) === '!') ? '!' + base + child.substr(1) : base + child;
    }) : childs;
  }

  var Handler = new Class({
    Name: 'Handler',

    init: function(loader, scripts, callback, exports) {
      var self = this,
          count = scripts.length;
      this.loader = loader;
      this.callback = callback;
      this.scripts = scripts;
      this.args = exports ? exports.args : null;
      this.flags = exports ? exports.flags : null;
      if (count) {
        var handler = function() {
            if (--count === 0) {
              console.log( 'Callback for scripts', scripts, 'executed' );
              self._executeCallback();
            }
          };

        scripts.forEach(function(script) {
          script.onload(handler);
          script.load();
        });
      } else {
        this._executeCallback();
      }
    },
    _parseArgs: function() {
      var args = this.args,
          result = [];
      if (args) {
        // Заменяем шорткаты
        args = this.loader.exportShortcuts.replaceIn(args);
        splitQuery(args).forEach(function(part) {
          splitPart(part, '.').forEach(function(_export) {
            this.push( ns(_export, window) );
          }, result);
        });
      }
      return result;
    },
    _executeCallback: function() {
      var self = this,
          args = this._parseArgs(),
          flags = this.flags,
          _call = function() {
            self.callback.apply(null, args);
          };
      // Оборачиваем в $.ready
      if (flags && flags.ready) {
        // TODO: попробовать избавиться от jQuery
        window.$(function() {
          _call();
        });
      // Обычный вызов
      } else {
        _call();
      }
    }
  });

  var Loader = new Class({
    Name: 'Loader',

    init: function(rootUrl) {
      this.rootUrl = rootUrl.toLowerCase();
      this.queryShortcuts = new Shortcuts(',.:;/!');
      this.exportShortcuts = new Shortcuts(',.:;');
      this.scripts = {};
    },
    require: function(query/*, exports*/, callback/*, module*/) {
      var self = this,
          scripts = this.scripts,
          module = arguments[arguments.length-1];
      if (!Function.is(callback)) {
        var exports = callback;
        callback = arguments[2];
      }
      // Если указано название модуля, значит в модуле используется require и нужно отложить загрузку скрипта
      if (typeof module === 'string') {
        module = this._normalizeUrl(module);
        scripts[module].defer();
        callback = callback.callBefore(function() {
          scripts[module].loaded();
        });
      }
      exports = this._parseExports(exports);
      if (exports && exports.flags.ready) {
        // Принудительно добавляем к загружаемым скриптам jQuery
        // TODO: как-то избавиться от этого говна (написать свой ready?)
        query = 'jQuery;' + query;
      }
      var urls = this._parseQuery(query),
          loadNormalScripts = function() {
            self._loadScripts(urls.normal, callback, exports);
          };
      // Если есть приоритетные скрипты, загружаем сначала их, а потом остальные
      if (urls.priority.length) {
        this._loadScripts(urls.priority, loadNormalScripts);
      } else {
        loadNormalScripts();
      }
    },
    _loadScripts: function(urls, callback, exports) {
      var scripts = this.scripts,
          requiredScripts = urls.map(function(url) {
            return ( scripts[url] = scripts[url] || new Script(url) );
          });
      new Handler(this, requiredScripts, callback, exports);
    },
    _parseQuery: function(query) {
      if (typeof query === 'string') {
        query = this.queryShortcuts.replaceIn( normalizeQuery(query) );
        var replaced = true,
            parts = splitQuery(query);
      } else {
        replaced = false;
        parts = query;
      }
      var urls = {};
      parts.forEach(function(part) {
        if (part) {
          var url = this._parsePriority(part),
              _part = this._normalizePart(url.part);
          // Начинается с "/", "http://" или "https://"
          if ( /^(\/|https?:\/\/)/i.test(_part) ) {
            urls[_part] = url.priority;
          } else {
            if (!replaced) {
              part = this.queryShortcuts.replaceIn(part);
            }
            merge(urls, this._parsePart(part));
          }
        }
      }, this);
      var priorityUrls = [],
          normalUrls = [];
      each(urls, function(priority, url) {
        priority ? priorityUrls.push(url) : normalUrls.push(url);
      });
      return {
        normal: normalUrls,
        priority: priorityUrls
      };
    },
    _parsePart: function(part) {
      var chunks = splitPart(part, '/', true),
          scripts = {};
      chunks.forEach(function(chunk) {
        var url = this._parsePriority(chunk);
        scripts[this._normalizeUrl(url.part)] = url.priority;
      }, this);
      return scripts;
    },
    _parsePriority: function(part) {
      var priority = (part.charAt(0) === '!');
      return {
        part: priority ? part.substr(1) : part,
        priority: priority
      }
    },
    _parseExports: function(exports) {
      if (exports) {
        var flags = [],
            args = normalizeQuery(exports).replace(/(?:^|\|)\{(\w+)\}$/i, function(_, _flags) {
              _flags.split(',').forEach(function(flag) {
                this[flag] = true;
              }, flags);
              return '';
            });
        return {
          args: args || null,
          flags: flags
        }
      } else {
        return null;
      }
    },
    _normalizePart: function(part) {
      if ( part.startsWith('//') ) {
        part = 'http:' + part;
      } else if ( part.startsWith('www.') ) {
        part = 'http://' + part;
      }
      return part;
    },
    _normalizeUrl: function(url) {
      url = url.toLowerCase();
      if (!url.endsWith('.js')) {
        url += '.js';
      }
      return this.rootUrl + url;
    }
  });

  // Определяем директорию со скриптами
  var scripts = document.getElementsByTagName('script'),
      rootRegEx = /(.*?)qb\/core\.js$/,
      rootJS = '/static/js/';
  for (var i = 0, len = scripts.length; i < len; i++) {
    if (rootJS = rootRegEx.exec(scripts[i].getAttribute('src'))) {
      rootJS = rootJS[1];
      break;
    }
  }

  var loader = new Loader(rootJS);
  loader.queryShortcuts.add({
    '$': 'jquery',
    'cls': 'qb/classes'
  });
  loader.exportShortcuts.add({
    'win': 'window',
    'doc': 'document',
    'def': 'qb; document; window'
  });

  loader.require('$.jgrowl; qb/dom/resourceLoader; !$', 'qb.loadCSS; $ | {ready}', function(loadCSS, $) {
    loadCSS('/static/css/jquery.jgrowl.css');
    $.jGrowl('Аааааааааааааааааааааа!!!', {sticky: true});
  });

  /*loader.require('cls: Sync, Events, Collection; qb/dom/View; !$',
                 'qb: each, Class, Sync, Events, Collection, View; $; def',
                 function() {
    console.debug(arguments);
  });*/

  /*----------   Проброс в глобальную область   ----------*/
  merge(qb, {
    loader: loader,
    require: loader.require.bind(loader),
    ns: ns,
    merge: merge,
    each: each,
    Class: Class
  });

  window.qb = qb;

})(window, document);