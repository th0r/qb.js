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
        fn.apply(thisObj, prependedArgs ? prependedArgs.concat(args) : args);
      }
    }
  }, false, true);

  /*----------   Расширение Object   ----------*/
  merge(Object, {
    isObject: function(obj) {
      return typeof obj === 'object' && obj !== null;
    },
    isIteratable: function(obj) {
      return obj && obj.length != null && typeof obj !== 'string' && !Function.is(obj);
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
        return replaceObj.hasOwnProperty(expr) ? replaceObj[expr] : '';
      });
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

  // Загрузчик модулей
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
        script.src = qb.modulesRoot + this.path.split('.').join('/') + '.js';
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
      core: new Module('core', qb)
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

  // Определяем root-директорию библиотеки (TODO: подумать над безопасностью)
  var scripts = document.getElementsByTagName('script'),
      rootRegEx = /(.*?qb\/)core\.js$/,
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
    modulesRoot: root || '/js/qb/',
    loader: Loader,
    ns: ns,
    // Other tools
    merge: merge,
    each: each
  });

  // Добавляем ярлыки в qb для работы с модулями
  ['require', 'module', 'moduleLoaded', 'addPackages'].forEach(function(method) {
    qb[method] = Loader[method].bind(Loader);
  });

  window.qb = qb;

})(window, document);