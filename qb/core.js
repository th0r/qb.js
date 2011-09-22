(function(window, document, undefined) {

  var DEFAULT_ARGS = [qb, document, window];

  function qb(callback) {
    callback.apply(qb, DEFAULT_ARGS);
  }

  /**
   * Namespace - функция для создания областей видимости
   * @param path {String} Строка вида "ns.ns1.ns2"
   * @param [parent=qb] {Object} Опционально. Объект, в котором будут создаваться области видимости.
   * @param [finalObj={}] {Object} Опционально. Объект, который будет записан на место последней области видимости.
   */
  function ns(path, parent, finalObj) {
    var parts = path.split('.'),
        ns = parent || qb;
    finalObj = finalObj || {};
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
  Function.prototype.thisToArg = function() {
    var fn = this;
    return function() {
      return fn.apply(arguments[0], Array.prototype.slice.call(arguments, 1));
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

    init: function(shortcuts) {
      this.shortcuts = Object.is(shortcuts) ? shortcuts : {};
      this._generateRegexp();
    },
    add: function(shortcut, value) {
      this.shortcuts[shortcut] = value;
      this._generateRegexp();
    },
    _generateRegexp: function() {
      var shortcuts = Object.keys(this.shortcuts).map(function(shortcut) {
        return shortcut.escapeRegexp();
      }).join('|');
      if (shortcuts) {
        var regexp = '(^|[{edges}])({shortcuts})(?=[{edges}]|$)'.format({
          edges: '!,:./',
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
      LOADED: 2
    },

    init: function(url) {
      this.src = url;
      this.elem = null;
      this.status = Script.UNLOADED;
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
    _bindLoadHandler: function() {
      var self = this,
          script = this.elem;
      var handler = function() {
        console.log( '"{}": onload; arguments:'.format(self.src) );
        console.log(arguments);
        this.onreadystatechange = this.onload = this.onerror = null;
        self.status = Script.LOADED;
        console.log('Скрипт {} загружен'.format(self.src), this);
      };
      script.onreadystatechange = function() {
        console.log( '"{0}": readyState = "{1}"'.format([self.src, this.readyState]) );
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
          handler.call(this);
        }
      };
      script.onload = handler;
      script.onerror = function(message, file, line) {
        console.log( 'Не удалось загрузить скрипт "{1}":\n  Ошибка на строке {2}: "{0}"'.format([message, file, line]) );
      }
    }
  });

  var Loader = new Class({
    Name: 'Loader',

    init: function(rootUrl) {
      this.rootUrl = rootUrl;
      this.scripts = {};
    },
    require: function(query/*, exports*/, callback) {
      var scripts = this.scripts,
          urls = this._parseQuery(query);
      urls.forEach(function(url) {
        if (!scripts[url]) {
          var script = scripts[url] = new Script(url);
          script.load();
        }
      });
    },
    _parseQuery: function(query) {
      var self = this;
      if (typeof query === 'string') {
        var parts = this._getQueryParts(query);
      } else {
        parts = query;
      }
      var urls = {};
      parts.forEach(function(part) {
        if (part) {
          part = self._normalizePart(part);
          // Начинается с "/", "http://" или "https://"
          if ( /^(\/|https?:\/\/)/i.test(part) ) {
            urls[part] = true;
          } else {
            part = shortcuts.replaceIn(part);
            qb.merge(urls, self._parsePart(part));
          }
        }
      });
      urls = Object.keys(urls);
      return urls;
    },
    _getQueryParts: function(query) {
      return query.replace(/\s/g, '').split(';');
    },
    _normalizePart: function(part) {
      if ( part.startsWith('//') ) {
        part = 'http:' + part;
      } else if ( part.startsWith('www.') ) {
        part = 'http://' + part;
      }
      return part;
    },
    _parsePart: function(part) {
      var chunks = part.split(':').slice(0, 2),
          base = (chunks.length > 1) ? chunks[0] + '/' : '',
          childs = chunks[1] || chunks[0],
          scripts = {},
          normalizeUrl = this._normalizeUrl.bind(this);
      childs.split(',').forEach(function(child) {
        var script = normalizeUrl(base + child);
        scripts[script] = true;
      });
      return scripts;
    },
    _normalizeUrl: function(url) {
      if (!url.endsWith('.js')) {
        url += '.js';
      }
      url = this.rootUrl + url;
      return url;
    }
  });

  var shortcuts = new Shortcuts({
        '$': 'jquery',
        'cls': 'qb/classes'
      });

  var loader = window.loader = new Loader('/static/js/');

  // Тесты
  var test_queries = [
    'jquery',
    '$',
    '   $;  ',
    '$; $: $.form, $.widget; qb/classes: Collection; cls: Events;',
    'http://cls.com; https://www.cls.$.com; //cls.com; www.cls.com; //www.cls.com; /static/other_js/lib'
  ];

  test_queries.forEach(function(query) {
    loader._parseQuery(query);
  });

  loader.require('$');

  /*----------   Загрузчик модулей   ----------*/
  var UNLOADED = 0,
      LOADING = 1,
      LOADED = 2,
      HEAD_ELEM = document.getElementsByTagName('head')[0];

  var Module = function(path/*, moduleObj=null*/) {
    this.path = path;
    var obj = this.moduleObj = arguments[1] || null;
    this.state = obj ? LOADED : UNLOADED;
  };

  merge(Module.prototype, {
    load: function() {
      if (this.state === UNLOADED) {
        this.state = LOADING;
        var script = document.createElement('script');
        script.src = qb.jsRoot + this.path.split('.').join('/') + '.js';
        HEAD_ELEM.appendChild(script);
      }
    },
    loadedCallback: function(moduleObj) {
      this.moduleObj = moduleObj;
      ns(this.path, null, moduleObj);
      this.state = LOADED;
    }
  });

  var Handler = function(modules, callback, exports) {
    this.modules = modules;
    this.unloaded = modules.filter(function(module) {
      return module.state !== LOADED;
    });
    this.callback = callback;
    this.exports = exports;
    this.executed = !callback;
    if (this.isReady()) {
      this.execute();
    }
  };

  merge(Handler.prototype, {
    notifyModuleLoaded: function(module) {
      this.unloaded.remove(module);
    },
    execute: function() {
      if (!this.executed) {
        this.executed = true;
        var args = DEFAULT_ARGS,
            exports = this.exports;
        if (exports) {
          args = exports.map(
              function(path) {
                return this[path].moduleObj;
              }, Loader.storage).concat(args);
        }
        this.callback.apply(qb, args);
      }
    },
    isReady: function() {
      return !this.unloaded.length;
    },
    loadNewModules: function() {
      this.unloaded.forEach(function(module) {
        if (module.state === UNLOADED) {
          module.load();
        }
      });
    }
  });

  var Loader = {
    storage: {
      'qb.core': new Module('qb.core', qb),
      'qb.Class': new Module('qb.Class', Class)
    },
    handlers: [],
    packages: {},
    /*
     *  Метод для парсинга строки запроса модулей и строки экспорта модулей
     *  Примеры строк запроса:
     *   "Class" -> ["Class"]
     *   "Class; jQuery" -> ["Class", "jQuery"]
     *   "Class; classes: Collection, Events" -> ["Class", "classes.Collection", "classes.Events"]
     */
    parseQuery: function(query) {
      var parts = query.replace(/\s/g, '').split(';'),
          packages = this.packages,
          modules = [];
      parts.forEach(function(part) {
        if (part) {
          if (packages[part]) {
            modules.append(packages[part]);
          } else {
            var chunks = part.split(':').slice(0, 2),
                parent = (chunks.length > 1) ? chunks[0] + '.' : '',
                childs = chunks[1] || chunks[0];
            childs.split(',').forEach(function(child) {
              modules.push(parent + child);
            });
          }
        }
      });
      return modules;
    },
    /*
     *  Основной метод для выполнения js-кода, использующего дополнительные модули
     *  "modules" - строка запроса модулей
     *  "exports" - строка экспорта модулей
     *  Варианты использования:
     *   1) require(modules)  										-> загрузка указанных модулей (можно использовать для предзагрузки модулей)
     *   2) require(modules, callback) 						-> вызов callback(module1..moduleN, *defaultArgs) после загрузки всех указанных модулей
     *   3) require(modules, exports, callback)		-> вызов callback(exports1..exportsN, *defaultArgs) после загрузки всех указанных модулей
     *   4) require(modules, false, callback) 		-> вызов callback(*defaultArgs) после загрузки всех указанных модулей
     */
    require: function(modules/*...*/) {
      var callback = arguments[2] || arguments[1],
          exports = (arguments.length > 2) ? arguments[1] : null,
          storage = this.storage;
      modules = this.parseQuery(modules);
      if (exports) {
        exports = this.parseQuery(exports);
      } else if (exports === null) {
        exports = modules;
      }
      modules = modules.map(function(path) {
        return storage[path] || ( storage[path] = new Module(path) );
      });
      var handler = new Handler(modules, callback, exports);
      if (!handler.executed) {
        this.handlers.push(handler);
      }
      handler.loadNewModules();
    },
    /*
     *  Метод для создания нового модуля.
     *  Варианты использования:
     *   1) module(modulePath, moduleImpl) 							-> создание модуля без зависимостей
     *   2) module(modulePath, dependences, moduleImpl) -> создание модуля с зависимостями
     */
    module: function(modulePath/*, dependences=null*/, moduleImpl) {
      var self = this,
          args = arguments;
      if (args.length == 2) {
        qb(function() {
          self.moduleLoaded(modulePath, moduleImpl.apply(this, arguments));
        });
      } else {
        self.require(args[1], function() {
          self.moduleLoaded(modulePath, args[2].apply(this, arguments));
        });
      }
    },
    /*  Добавляет пакеты модулей, на которые можно ссылаться из методов "module" или "require" по имени.
     *  Варианты использования:
     *   1) addPackages(name, query)
     *   2) addPackages({'name1': 'query1', 'name2': 'query2'})
     *  Пример:
     *   qb.addPackages('Classes', 'classes: Collection, Events, Sync');
     *   qb.require('Classes; jQuery', function(Collection, Events, Sync, jQuery) {...});
     *
     *   Также можно создавать новый пакет из существующих:
     *   qb.addPackages({
     *     'Pack1', 'Classes; $',
     *     'Pack2', 'Pack1; Class'
     *   });
     */
    addPackages: function(/*...*/) {
      var self = this,
          packages = arguments[0];
      if (arguments.length > 1) {
        packages = {};
        packages[ arguments[0] ] = arguments[1];
      }
      each(packages, function(query, name) {
        self.packages[name] = self.parseQuery(query);
      });
    },
    moduleLoaded: function(path, moduleObj) {
      var module = this.storage[path];
      module.loadedCallback(moduleObj);
      var ready = [];
      this.handlers = this.handlers.filter(function(handler) {
        handler.notifyModuleLoaded(module);
        return handler.isReady() ? !ready.push(handler) : true;
      });
      ready.forEachCall('execute');
    }
  };

  // Определяем директорию со скриптами
  var scripts = document.getElementsByTagName('script'),
      rootRegEx = /(.*?)qb\/core\.js$/,
      root = null;
  for (var i = 0, len = scripts.length; i < len; i++) {
    if (root = rootRegEx.exec(scripts[i].getAttribute('src'))) {
      root = root[1];
      break;
    }
  }

  // Добавляем сокращения
  Loader.addPackages('$', 'jQuery');

  /*----------   Проброс в глобальную область   ----------*/
  merge(qb, {
    jsRoot: root || '/js/',
    loader: Loader,
    ns: ns,
    merge: merge,
    each: each,
    Class: Class
  });

  // Добавляем ярлыки в qb для работы с модулями
  ['require', 'module', 'moduleLoaded', 'addPackages'].forEach(function(method) {
    qb[method] = Loader[method].bind(Loader);
  });

  window.qb = qb;

})(window, document);