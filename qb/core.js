(function(window, document, undefined) {

  var qb = {};

  /**
   * Namespace - функция для создания областей видимости
   * @param {String} path  Строка вида "ns.ns1.ns2"
   * @param {Object} [parent=window]  Опционально. Объект, в котором будут создаваться области видимости.
   * @param {Object} [finalObj={}]  Опционально. Объект, который будет записан на место последней области видимости.
   */
  function ns(path, parent, finalObj) {
    var parts = path.split('.'),
        ns = parent || window;
    for (var i = 0, len = parts.length - 1; i < len; i++) {
      var part = parts[i];
      if (part) {
        ns = ns[part] = ns[part] || {};
      }
    }
    part = parts[i];
    // BUGFIX: тут иногда коробит IE ( window[document] = undefined || window[document] || {}; )
    try {
      ns[part] = finalObj || ns[part] || {};
    } catch(e) {}
    return ns[part];
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

  /**
   * Копирует атрибуты из одного объекта в другой
   * @param {Object} to  Объект, в который нужно скопировать свойства
   * @param {Object} from  Объект, из которого нужно скопировать свойства
   * @param {Boolean} [onlyOwn=false]  Опционально. Если true, то будет копироваться только личные атрибуты
   *                                   объекта from (from.hasOwnProperty() === true)
   * @param {Boolean} [keepExisting=false]  Опционально. Если true, то атрибут из from будет копироваться в to
   *                                        только если его там еще нет.
   */
  function merge(to, from, onlyOwn, keepExisting) {
    for (var prop in from) {
      if (!onlyOwn || onlyOwn && from.hasOwnProperty(prop)) {
        if (!keepExisting || keepExisting && !(prop in to)) {
          to[prop] = from[prop];
        }
      }
    }
    return to;
  }

  function makeStatic(constructor, methods) {
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
      return ( toString(obj) === '[object Function]' );
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
    /**
     * Превращает функцию в "ленивую", т.е. если между двумя вызовами функции прошло меньше timeout,
     * ее вызов откладывается на timeout.
     * Полезно использовать в местах, когда "дорогая" функия вызывется очень часто и это ощутимо затормаживает браузер.
     * Например, хэндлер на ресайз окна: $(window).resize( function() {...}.lazy(100) );
     * @param {Number} timeout  Минимальный интервал между вызовами функции для ее отработки
     * @returns {Function}      Возвращает "ленивую" функцию, у которой есть 2 метода:
     *                            reset() - отменяет запланированный вызов функции
     *                            exec() - принудительно немедленно вызывает функцию (отменяя запланированную)
     */
    lazy: function(timeout) {
      var fn = this,
          timeoutId = null;
      function lazy() {
        var fnThis = this,
            fnArgs = arguments;
        reset();
        timeoutId = setTimeout(function() {
          fn.apply(fnThis, fnArgs);
        }, timeout);
      }
      function reset() { clearTimeout(timeoutId) }
      lazy.reset = reset;
      lazy.exec = function() {
        reset();
        fn.apply( (this === lazy ? null : this), arguments);
      };
      return lazy;
    }
  }, false, true);

 /**
  * Пустая функция
  */
  function pass() {}

  /*----------   Расширение Object   ----------*/
  merge(Object, {
    isObject: function(obj) {
      return typeof obj === 'object' && obj !== null && !Array.is(obj);
    },
    isIteratable: function(obj) {
      return obj && obj.length != null && typeof obj !== 'string' && !Function.is(obj);
    },
    keys: function(obj) {
      var keys = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          keys.push(key);
        }
      }
      return keys;
    },
    values: function(obj) {
      var values = [];
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          values.push(obj[key]);
        }
      }
      return values;
    }
  }, false, true);
  Object.is = Object.isObject;

  /*----------   Расширение Array   ----------*/
  merge(Array, {
    isArray: function(obj) {
      return ( toString(obj) === '[object Array]' );
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
    forEach: function(callback, thisObj) {
      for (var i = 0, len = this.length; i < len; i++) {
        callback.call(thisObj, this[i], i, this);
      }
      return this;
    },
    filter: function(callback, thisObj) {
      var res = [];
      for (var i = 0, len = this.length; i < len; i++) {
        var val = this[i];
        if (callback.call(thisObj, val, i, this)) {
          res.push(val);
        }
      }
      return res;
    },
    map: function(callback, thisObj) {
      var res = [];
      for (var i = 0, len = this.length; i < len; i++) {
        res[i] = callback.call(thisObj, this[i], i, this);
      }
      return res;
    },
    every: function(callback, thisObj) {
      for (var i = 0, len = this.length; i < len; i++) {
        if (!callback.call(thisObj, this[i], i, this)) {
          return false;
        }
      }
      return true;
    },
    some: function(callback, thisObj) {
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
    /**
     * Удаляет один указанный элемент из массива (по строгому соответствию).
     * Модифицируется исходный массив.
     * @param item  Удаляемый элемент.
     * @param {Boolean} [fromEnd=false]  Опционально. Искать элемент с конца.
     * @returns {Array}  Модифицированный исходный массив.
     */
    remove: function(item, fromEnd) {
      var i = this[fromEnd ? 'lastIndexOf' : 'indexOf'](item);
      if (i >= 0) {
        this.splice(i, 1);
      }
      return this;
    },
    /**
     * Удаляет все указанные элементы из массива (по строгому соответствию).
     * Модифицируется исходный массив.
     * @param item  Удаляемый элемент.
     * @returns {Array}  Модифицированный исходный массив.
     */
    erase: function(item) {
      var i = this.length;
      while (i--) {
        if (this[i] === item) {
          this.splice(i, 1);
        }
      }
      return this;
    },
    clean: function() {
      return this.filter(function(item) {
        return item || item === false;
      });
    },
    append: function(array) {
      var shift = this.length;
      for (var i = 0, len = array.length; i < len; i++) {
        this[shift + i] = array[i];
      }
    },
    forEachCall: function(methodName/*, arg1...argN*/) {
      var args = Array.slice(arguments, 1);
      return this.forEach(function(callable) {
        callable[methodName].apply(callable, args);
      });
    }
  }, false, true);

  makeStatic(Array, ['slice', 'splice']);

  /*----------   Расширение String   ----------*/
  var reFormatReplace = /\{(\w*)\}/g,
      parseObj = {
        'true': true,
        'false': false,
        'null': null,
        'NaN': NaN
      };

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
      // BUGFIX: отрицательные индексы не работают в методе substr в IE 7-8
      return this.slice(-str.length) === str;
    },
    capitalize: function() {
      return this.substr(0, 1).toUpperCase() + this.substr(1);
    },
    escapeRegexp: function() {
      return this.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    },
    /**
     * Преобразует строку в примитивы
     * ('null' -> null; 'true' -> true и т.д.)
     */
    parse: function() {
      var str = '' + this;
      if (str === 'undefined') {
        return undefined;
      }
      var result = parseObj[this];
      if (result === undefined) {
        result = +this;
        if (isNaN(result)) {
          result = str;
        }
      }
      return result;
    }
  }, false, true);

  /*----------   Расширение Date   ----------*/
  merge(Date, {
    now: function() {
      return +new Date();
    },
    isDate: function(obj) {
      return ( toString(obj) === '[object Date]' );
    }
  }, false, true),
  Date.is = Date.isDate;

  /*----------   Расширение Number   ----------*/
  var Math = window.Math;
  merge(Number, {
    random: function(min, max) {
      return min + Math.random() * (max - min);
    }
  }, false, true);

  merge(Number.prototype, {
    limit: function(min, max) {
      return Math.min( max, Math.max(min, this) );
    }
  }, false, true);

  ['abs', 'ceil', 'floor', 'round'].forEach(function(method) {
    var fn = Math[method];
    this[method] = function() {
      return fn.call(Math, this);
    }
  }, Number.prototype);

  /*----------   Дополнительные утилиты   ----------*/
  /**
   * Выполняет функцию для всех атрибутов объекта
   * @param {Object} obj  Итерируемый объект.
   * @param {Function} fn  Выполняемая функция. Если из нее возвратить false, то итерация прекращется.
   * @param {Boolean} [onlyOwn=false]  Опционально. Выполнять функцию только для "личных" атрибутов объекта.
   */
  function each(obj, fn, onlyOwn) {
    if (Object.isIteratable(obj)) {
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
        return init.apply(self, arguments);
      }
    };

    // Статичные атрибуты
    if (Static) {
      merge(constructor, Static, true);
    }
    // Наследование (часть 1)
    if (Extends) {
      Empty.prototype = Extends.prototype;
      constructor.prototype = new Empty();
    }
    var proto = constructor.fn = constructor.prototype;
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

    // Название класса
    if (Name) {
      constructor.toString = Function.from(Name);
    }

    return constructor;
  }

  /*----------   Реализация Events   ----------*/
  function getEventInfo(name) {
    var info = name.split('.', 2);
    return {
      ns: info[1] || 'default',
      name: info[0]
    }
  }

  var Events = new Class({

    Name: 'Events',
   /**
    * @param {Object} [events=null]  Объект с событиями, которые будут добавлены при создании Events-объекта
    */
    init: function(events) {
      this.$events = this.$events || {};
      if (events) {
        this.addEvents(events);
      }
    },
   /**
    * Добавляет обработчики на события. Поддерживает области видимости (NS).
    * Области видимости указываются через точку после названия события: 'click.some-namespace'.
    * Их можно использовать для последующего удобного (возможно массового) удаления навешанных хэндлеров (см. removeEvents).
    * Способы вызова:
    *   - addEvents(name, handler, [triggerOnce])
    *   - addEvents(eventsObj, [triggerOnce]), где eventsObj = {<name>: <handler>, ...}
    * @param {String} name  Имя события.
    * @param {Function} handler  Обработчик (слушатель) события.
    * @param {Boolean} [triggerOnce=false]  Опционально. Вызвать данный обработчик только один раз (затем удалить).
    */
    addEvents: function(name, handler, triggerOnce) {
      if (typeof name === 'string') {
        var eventsObj = {};
        eventsObj[name] = handler;
      } else {
        eventsObj = name;
        triggerOnce = handler;
      }
      triggerOnce = !!triggerOnce;
      if (eventsObj) {
        var events = this.$events;
        each(eventsObj, function(handler, name) {
          var info = getEventInfo(name),
              ns = info.ns;
          name = info.name;
          ns = events[ns] = events[ns] || {};
          (ns[name] = ns[name] || []).push([handler, triggerOnce]);
        });
      }
    },
   /**
    * Удаляет обработчики событий. Поддерживает области видимости (NS).
    * Можно использовать следующими способами:
    *   - removeEvents('click', handlerFn) --> удаляет обработчик handlerFn из NS по-умолчанию ('default')
    *   - removeEvents('click.some-namespace', handlerFn) --> удаляет обработчик handlerFn из NS 'some-namespace'
    *   - removeEvents('click') --> удаляет обработчики события 'click' из всех NS
    *   - removeEvents('click.some-namespace') --> удаляет все обработчики события 'click' из NS 'some-namespace'
    *   - removeEvents('.some-namespace') --> удаляет все обработчики из NS 'some-namespace'
    * @param {String} name  Имя или паттерн (см. описание), указывающий на обработчики, которые нужно удалить.
    * @param {Function} [handler]  Опционально. Обработчик, который нужно удалить.
   */
    removeEvents: function(name, handler) {
      var info = getEventInfo(name),
          ns = info.ns,
          events = this.$events;
      name = info.name;
      // Если указано 'click', то удаляем обработчики на событие 'click' из всех ns
      if (ns === 'default' && !handler) {
        each(events, function(ns) {
          delete ns[name];
        });
      // Если указано '.someNS', то удаляем данный ns
      } else if (!name) {
        delete events[ns];
      } else if (ns = events[ns]) {
        // Если указано 'click.someNS' и handler, то удаляем этот хэндлер на click из этой ns
        if (handler) {
          var handlers = ns[name];
          if (handlers && handlers.length) {
            for (var i = 0, len = handlers.length; i < len; i++) {
              if (handlers[i][0] === handler) {
                handlers.splice(i--, 1);
                len--;
              }
            }
          }
        // Если указано 'click.someNS' без handler-а, то удаляем все хэндлеры на click из этой ns
        } else {
          delete ns[name];
        }
      }
    },
   /**
    * Триггерит указанное событие.
    * Здесь использовать NS нельзя, т.е. вызываются обработчики из всех областей видимости.
    * @param {String} name  Имя вызываемого события (например, 'click').
    * @param {Array} [args=[]]  Опционально. Аргументы, с которыми будет вызван каждый обработчик.
    * @apram [thisObj=self]  Опционально. Объект, который станет this в обработчиках.
    */
    triggerEvent: function(name, args, thisObj) {
      args = args || [],
      thisObj = (arguments.length > 2) ? arguments[2] : this;
      each(this.$events, function(ns) {
        var handlers = ns[name];
        if (handlers && handlers.length) {
          for (var i = 0, len = handlers.length; i < len; i++) {
            var handler = handlers[i];
            handler[0].apply(thisObj, args);
            if (handler[1]) {
              handlers.splice(i--, 1);
              len--;
            }
          }
        }
      });
    }
  });

  var signals = new Events(),
      p = Events.prototype;
  merge(signals, {
    listen: p.addEvents,
    remove: p.removeEvents,
    send: p.triggerEvent
  });

  /*----------   Реализация Deferred   ----------*/
  var UNRESOLVED = 0,
      RESOLVED = 1,
      REJECTED = 2;

  function makeCallbackMethod(prop, callStatus) {
    return function(callbacks) {
      var status = this.$status;
      if (status === UNRESOLVED) {
        this[prop].append( Array.from(callbacks) );
      } else if (status === callStatus || callStatus === true) {
        this._callDeferredCallbacks(callbacks);
      }
      return this;
    }
  }

  function makeResolveMethod(prop, resolveStatus) {
    return function(/*args*/) {
      if (this.$status === UNRESOLVED) {
        this.$status = resolveStatus;
        this.$args = Array.slice(arguments);
        this._callDeferredCallbacks( this[prop].concat(this.$always) );
        delete this.$done;
        delete this.$fail;
        delete this.$always;
      }
      return this;
    }
  }

  function makeResolveWithMethod(method) {
    return function(thisObj/*, args*/) {
      if (this.$status === UNRESOLVED) {
        this.$with = thisObj;
        return this[method].apply( this, Array.slice(arguments, 1) );
      }
    }
  }

  var Deferred = new Class({
    Name: 'Deferred',
    Static: {
      when: function(/*deferreds*/) {
        var result = new Deferred(),
            defs = Array.slice(arguments),
            unresolved = defs.length,
            args = [];
        function fail() {
          var args = Array.slice(arguments);
          args.unshift(this);
          result.reject.apply(result, args);
        }
        defs.forEach(function(def, i) {
          if (!(def instanceof Deferred)) {
            args[i] = def;
            unresolved--;
          } else {
            def.done(function() {
              args[i] = Array.slice(arguments);
              if (!--unresolved) {
                result.resolve.apply(result, args);
              }
            });
            def.fail(fail);
          }
        });
        if (!unresolved) {
          result.resolve.apply(result, args);
        }
        return result;
      }
    },

    init: function() {
      this.$done = [];
      this.$fail = [];
      this.$always = [];
      this.$status = UNRESOLVED;
      this.$with = this;
      this.$args = null;
    },
    _callDeferredCallbacks: function(callbacks) {
      var thisObj = this.$with,
          args = this.$args;
      Array.from(callbacks).forEach(function(callback) {
        callback.apply(thisObj, args);
      });
    },
    done: makeCallbackMethod('$done', RESOLVED),
    fail: makeCallbackMethod('$fail', REJECTED),
    then: function(doneCallbacks, failCallbacks) {
      return this.done(doneCallbacks).fail(failCallbacks);
    },
    always: makeCallbackMethod('$always', true),
    resolve: makeResolveMethod('$done', RESOLVED),
    resolveWith: makeResolveWithMethod('resolve'),
    reject: makeResolveMethod('$fail', REJECTED),
    rejectWith: makeResolveWithMethod('reject'),
    pipe: function(doneFilter, failFilter) {
      var result = new Deferred();
      [doneFilter, failFilter].forEach(function(filter, i) {
        if (filter) {
          this[i ? 'fail' : 'done'](function() {
            var args = Array.from( filter.apply(this, arguments) );
            args.unshift(this);
            result[(i ? 'reject' : 'resolve') + 'With'].apply(result, args);
          });
        }
      }, this);
      return result;
    },
    isResolved: function() {
      return this.$status === RESOLVED;
    },
    isRejected: function() {
      return this.$status === REJECTED;
    }
  });

  /*----------   Реализация deferred-а DOMReady (аналог $(document).ready) ----------*/
  var DOMReady = new Deferred(),
      resolve = DOMReady.resolve.bind(DOMReady);

  if (document.readyState === 'complete') {
    resolve();
  } else if (document.addEventListener) {
    DOMReady.done(function() {
      document.removeEventListener('DOMContentLoaded', resolve);
    });
    document.addEventListener('DOMContentLoaded', resolve, false);
  } else if (document.attachEvent) {
    var loaded = function() {
      if (document.readyState === 'complete') {
        document.detachEvent('onreadystatechange', loaded);
        resolve();
      }
    };
    document.attachEvent('onreadystatechange', loaded);
    // Хак для мониторинга загрузки DOM в IE
    try {
      var toplevel = (window.frameElement == null);
    } catch(e) {}

    if (toplevel && document.documentElement.doScroll) {
      (function() {
        try {
          document.documentElement.doScroll('left');
        } catch(e) {
          setTimeout(arguments.callee, 10);
          return;
        }
        loaded();
      })();
    }
  }

  /*   *** Загрузчик ресурсов ***
   *
   *    qb.js - модульная библиотека, т.е. для ее использования на страницу достаточно поместить только скрипт "core.js",
   *    а с его помощью уже грузить остальные необходимые ресурсы: модули (скрипты) и файлы стилей (css).
   *
   *    Для этого служит класс qb.Loader (см. ниже).
   *    Конструктор загрузчика требует один параметр rootUrl - это урл (полный, относительный или абсолютный), по которому лежат
   *    все скрипты сайта (например, '/static/js/'). Он должен заканчиваться символом '/'.
   *    В состав библиотеки уже входит один загрузчик - qb.loader.
   *    rootUrl для него определяется автоматически исходя из того, где находится данный скрипт (core.js): <rootUrl>/qb/core.js
   *    Для удобства предположим, что вся статика находится в "/static", скрипты - в "/static/js", а стили - в "/static/css", тогда
   *    rootUrl загрузчика qb.loader будет "/static/js/".
   *
   *    Для загрузки ресурсов используется метод require загрузчика. Для загрузчика по-умолчанию (qb.loader) он напрямую вынесен
   *    в объект qb: qb.loader.require === qb.require. Это сделано для удобства.
   *
   *    Для использования данного метода, ему нужно передать строку запроса ресурсов или же массив частей строки запроса (см. ниже).
   *    Части запроса отделяются друг от друга символом точки с запятой (;).
   *
   *    Пример простого запроса:
   *      qb.require('qb/cookie', callbackFn) ==> загрузит модуль (скрипт) '/static/js/qb/cookie.js' и после этого вызовет callbackFn
   *    Здесь 'qb/cookie' - строка запроса, а callbackFn - обязательная функция, которая будет вызвана после загрузки данного модуля.
   *
   *    В строке запроса можно указывать не только пути относительно rootUrl, но и абсолютные пути к ресурсам.
   *    Путь считается абсолютным, если он начинается с '/', '//', 'http://', 'https://' или 'www.'
   *    'qb/cookie; /static/other-js/widget.js; /static/css/widget.css'
   *    При использовании относительных и абсолютных путей существуют некоторые отличия:
   *      1) Во время формирования урла в случае относительного пути ('qb/cookie') к нему всегда дописывается расширение '.js',
   *         т.е. таким методом можно загружать только скрипты. В абсолютных урлах необходимо указывать полный путь до ресурса,
   *         включая расширение.
   *      2) Шорткаты обрабатываются только в относительных урлах (см. описание шорткатов ниже). Несмотря на это, можно создать
   *         шорткат, например, 'CSS' = '/static/css' и загружать стили так: 'CSS/extra-style.css'. Это работает, так как до замены
   *         шорткатов данный урл считается относительным (не начинается с '/' и т.д.)
   *    Абсолютные пути нормализуются, т.е. для урлов, начинающихся с '//' и 'www.', к ним будет добавлен текущий протокол (http или https)
   *
   *    Пример строки запроса из нескольких частей (загрузка нескольких ресурсов):
   *      'jquery; qb/cookie' ==> загрузка '/static/js/jquery.js' и '/static/js/qb/cookie.js'.
   *    Вместо данной строки запроса можно было передать массив из ее частей:
   *      ['jquery', 'qb/cookie'] === 'jquery; qb/cookie'
   *
   *    Скрипты для загрузки в строке запроса можно группировать, используя символ двоеточия:
   *      'qb/classes: Lazy, Collection; jquery' ==> '<root>/qb/classes/Collection.js' + '<root>/qb/classes/Lazy.js' + '<root>/jquery.js'
   *
   *    *** Шорткаты ***
   *    В частях запроса можно использовать шорткаты - сокращения запроса.
   *    Например, в состав qb.loader входит шорткат "$", который при разборе запроса заменяется на "jquery".
   *    Пример:
   *      '$; $/plugins/growl; $.ui' === 'jquery; jquery/plugins/growl; jquery.ui'
   *    Все шорткаты для строк запроса содержатся в свойстве queryShortcuts объекта загрузчика (qb.loader.queryShortcuts).
   *    Это объект класса Shortcuts (см. код ниже). Для добавления в него шорткатов используется метод add:
   *      qb.loader.queryShortcuts.add({
   *        'CLS': 'qb/classes',
   *        'main': 'qb: cookie, classes/Collection; jquery'
   *      });
   *    Есть несколько правил использования шорткатов:
   *      1) Шорткаты регистро-зависимы. Т.е. 'cls' и 'CLS' - разные шорткаты.
   *      2) В описании шортката нельзя использовать другие шорткаты (они не заменятся).
   *      3) Шорткаты в строке запроса заменяются только в случае, если они окружены спец-символами ,.:;/!}
   *         или находятся в начале/конце строки запроса.
   *
   *    *** Очередь загрузки ***
   *    Для ресурсов в строке запроса можно указать очередность их загрузки. Для этого перед путем к ресурсу нужно указать
   *    его номер в очереди загружаемых ресурсов.
   *    Пример:
   *      '{1}CSS/growl.css; {2}$.ui; {1}$; {2}$/plugins/growl; {3}$.ui/plugins/some-widget; qb/cookie'
   *    В этом случае, порядок загрузки ресурсов можно описать так:
   *      1) jquery.js + growl.css
   *      2) jquery.ui.js + jquery/plugins/growl.js
   *      3) jquery.ui/plugins/some-widget.js
   *      4) qb/cookie.js
   *    Ресурсы, у которых не установлена очередность, загружаются последними.
   *    Вместо указания очередности "{1}" можно указывать знак "!" (это сделано для удобства)
   *
   *    *** Строка экспорта ***
   *    После загрузки всех указанных в строке запроса ресурсов обязательно вызывается callback.
   *    Для удобства, в него в качестве параметров можно пробросить указанные в строке экспорта объекты (указание
   *    строки экспорта - опционально).
   *    Пример:
   *      qb.require('$; qb: cookie, classes/Collection', '$; window.location; qb: Class, cookie, Collection; qb; document; window',
   *                 function($, location, Class, cookie, Collection, qb, document, window) {...});
   *    Строка экспорта многим похожа на строку запроса: в ней так же можно использовать группировку и шорткаты.
   *    Шорткаты экспорта находятся в объекте exportShortcuts загрузчика (qb.loader.exportShortcuts).
   *    Для их добавления так же используется метод "add".
   *    При использовании шорткатов экспорта действуют все те же правила, что и для шорткатов запроса.
   *    Различаются только спец-символы - для шорткатов экспорта это ,.:;
   *
   *    Также в строке экспорта можно использовать флаги. Сейчас поддерживается один флаг - "ready".
   *    Если он указан, callback будет вызван только после загрузки всех ресурсов И после загрузки
   *    страницы (аналог $(document).ready() ).
   *    Флаги указываются следующим образом (показана строка экспорта):
   *      '<export_string> | {flag1, flag2...flagN}'
   *    Пример:
   *      '$; $.growl | {ready}'
   *
   *    Также есть возможность в строке экспорта указать ТОЛЬКО флаги. Тогда она будет выглядеть так:
   *      '{ready}'
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

  var STATUS = {
    UNLOADED: 0,
    LOADING: 1,
    LOADED: 2,
    LOAD_ERROR: 3
  };

  var LoadingElement = new Class({
    Name: 'Element',
    Extends: Deferred,

    init: function(url) {
      Deferred.call(this);
      this.url = url;
      this.elem = null;
      this.status = STATUS.UNLOADED;
    },
    load: function() {
      if (this.status === STATUS.UNLOADED) {
        this.status = STATUS.LOADING;
        this._createElem();
      }
    },
    _createElem: function() {
      throw 'Перегрузите этот метод. Здесь должен создаваться DOM-элемент';
    },
    resolve: function() {
      this.status = STATUS.LOADED;
      Deferred.fn.resolve.call(this, this);
    },
    reject: function() {
      this.status = STATUS.LOAD_ERROR;
      Deferred.fn.reject.apply(this, arguments);
    }
  });

  var Stylesheet = new Class({
    Name: 'Stylesheet',
    Extends: LoadingElement,
    Static: STATUS,

    init: function(url) {
      LoadingElement.call(this, url);
      this.img = null;
    },
    _createElem: function() {
      // BUGFIX: Для браузеров, которые не поддерживают onload на <link/>, используем метод с картинкой
      // (http://stackoverflow.com/questions/2635814/javascript-capturing-load-event-on-link/5371426#5371426)
      var link = this.elem = document.createElement('link'),
          img = this.img = document.createElement('img'),
          url = this.url,
          resolve = this.resolve.bind(this);
      link.type = 'text/css';
      link.rel = 'stylesheet',
      link.href = url;
      img.onerror = link.onload = resolve;
      HEAD_ELEM.appendChild(img);
      img.src = url;
      HEAD_ELEM.appendChild(link);
    },
    resolve: function() {
      var link = this.elem,
          img = this.img;
      link.onload = img.onerror = null;
      // BUGFIX: Удаляем src, иначе IE8 показывает, что грузит эту мнимую картинку
      img.removeAttribute('src');
      img.parentNode.removeChild(img);
      LoadingElement.fn.resolve.call(this);
    },
    toString: function() {
      return 'Stylesheet [{}]'.format(this.url);
    }
  });

  var Script = new Class({
    Name: 'Script',
    Extends: LoadingElement,
    Static: STATUS,

    init: function(url) {
      LoadingElement.call(this, url);
    },
    _createElem: function() {
      var script = this.elem = document.createElement('script');
      this._bindLoadHandler();
      script.src = this.url;
      HEAD_ELEM.appendChild(script);
    },
    resolve: function() {
      var elem = this.elem;
      elem.onreadystatechange = elem.onload = elem.onerror = null;
      LoadingElement.fn.resolve.call(this);
    },
    reject: function(message, file, line) {
      var errorMsg = 'Error on line {1}: "{0}"'.format([message, line]);
      LoadingElement.fn.reject.call(this, errorMsg);
    },
    deferLoad: function() {
      var elem = this.elem;
      elem.onreadystatechange = elem.onload = null;
    },
    _bindLoadHandler: function() {
      var elem = this.elem,
          loaded = this.resolve.bind(this);
      elem.onreadystatechange = function() {
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
          loaded();
        }
      };
      elem.onload = loaded;
      elem.onerror = this.reject.bind(this);
    },
    toString: function() {
      return 'Script [{}]'.format(this.url);
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
   * Преобразует часть запроса вида "qb/classes:Sync,Events" в массив ["qb/classes/Sync", "qb/classes/Events"]
   * @param {String} part  Часть запроса
   * @param {String} joiner  Строка, которая будет соединять части слева и справа от ":"
   * @returns {Array}
   */
  function splitPart(part, joiner) {
    var chunks = part.split(':', 2),
        base = (chunks.length > 1) ? chunks[0] + joiner : null,
        childs = (chunks[1] || chunks[0]).split(',');
    return base ? childs.map(function(child) {
      return base + child;
    }) : childs;
  }

  var Handler = new Class({
    Name: 'Handler',
    Extends: Deferred,

    init: function(loader, resources, exports) {
      Deferred.call(this);

      this.resources = resources;
      this.loader = loader;
      this.args = exports ? exports.args : null;
      this.flags = exports ? exports.flags : null;
      Deferred.when.apply(null, resources).then(
          this._parseArgs.bind(this),
          this._handleLoadError.bind(this)
      );
    },
    load: function() {
      this.resources.forEachCall('load');
    },
    // Переопределяет метод Deferred
    _callDeferredCallbacks: function(callbacks) {
      var flags = this.flags,
          _super = Deferred.fn._callDeferredCallbacks.bind(this, callbacks);
      flags && flags.ready ?
        DOMReady.done(function() {
          _super();
        }) : _super();
    },
    _parseArgs: function() {
      var args = this.args,
          exports = [];
      if (args) {
        // Заменяем шорткаты
        args = this.loader.exportShortcuts.replaceIn(args);
        splitQuery(args).forEach(function(part) {
          splitPart(part, '.').forEach(function(_export) {
            this.push( ns(_export) );
          }, exports);
        });
      }
      this.resolve.apply(this, exports);
    },
    _handleLoadError: function(resource, error) {
      this.reject(resource, error);
      throw 'Failed to load resource "{0}"\nError: "{1}"'.format(arguments);
    }
  });

  var PARTS_PRIORITY = /^!|^\{(\d+)}/i,
      EXPORTS_FLAGS = /(?:^|\|)\{(\w+)\}$/i;

  var Loader = new Class({
    Name: 'Loader',
    Static: {
      FULL_URL: /^(\/|https?:\/\/)/i
    },

    init: function(rootUrl) {
      this.rootUrl = rootUrl.toLowerCase();
      this.queryShortcuts = new Shortcuts(',.:;/!}');
      this.exportShortcuts = new Shortcuts(',.:;');
      this.resources = {};
    },
    require: function(query/*, exports*/, callback/*, module*/) {
      var self = this,
          resources = this.resources,
          module = arguments[arguments.length-1];
      if (!Function.is(callback)) {
        var exports = callback;
        callback = arguments[2];
      }
      var callbacks = [callback];
      // Если указано название модуля, значит в модуле используется require и нужно отложить загрузку скрипта
      if (typeof module === 'string') {
        module = resources[this._normalizeScriptUrl(module)];
        module.deferLoad();
        callbacks.push( module.resolve.bind(module) );
      }
      var urls = this._parseQuery(query),
          handlers = urls.map(function(part) {
            var _exports = ( part === this.last() ) ? self._parseExports(exports) : null;
            return self._getLoadHandler(part, _exports);
          }, urls);
      handlers.forEach(function(handler, i) {
        var next = this[i+1];
        handler.done(next ? function() { next.load() } : callbacks);
      }, handlers);
      handlers[0].load();
      return handlers.last();
    },
    _getLoadHandler: function(urls, exports) {
      var resources = this.resources,
          required = urls.map(function(url) {
            return ( resources[url] = resources[url] || new (this._isStylesheet(url) ? Stylesheet : Script)(url) );
          }, this);
      return new Handler(this, required, exports);
    },
    _parseQuery: function(query) {
      var parts = (typeof query === 'string') ? splitQuery( normalizeQuery(query) ) : query,
          urls = {},
          fullUrl = Loader.FULL_URL;
      parts.forEach(function(part) {
        if (part) {
          var url = this._parsePriority(part),
              _part = this._normalizePart(url.part);
          // Начинается с "/", "http://" или "https://"
          if ( fullUrl.test(_part) ) {
            urls[_part] = url.priority;
          } else {
            part = this.queryShortcuts.replaceIn(part);
            merge(urls, this._parsePart(part));
          }
        }
      }, this);
      return this._prioritizeUrls(urls);
    },
    _parsePart: function(part) {
      var chunks = splitPart(part.toLowerCase(), '/'),
          urls = {};
      chunks.forEach(function(chunk) {
        var info = this._parsePriority(chunk),
            url = this._isStylesheet(info.part) ? info.part : this._normalizeScriptUrl(info.part);
        urls[url] = info.priority;
      }, this);
      return urls;
    },
    _parsePriority: function(part) {
      var priority = null;
      part = part.replace(PARTS_PRIORITY, function(_, num) {
        priority = +num || 1;
        return '';
      });
      return {
        part: part,
        priority: priority
      }
    },
    _parseExports: function(exports) {
      if (exports) {
        var flags = [],
            args = normalizeQuery(exports).replace(EXPORTS_FLAGS, function(_, _flags) {
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
      part = part.toLowerCase();
      if ( part.startsWith('//') ) {
        part = window.location.protocol + part;
      } else if ( part.startsWith('www.') ) {
        part = window.location.protocol + part;
      }
      return part;
    },
    _normalizeScriptUrl: function(url) {
      return this.rootUrl + url.toLowerCase() + '.js';
    },
    _isStylesheet: function(url) {
      return url.endsWith('.css');
    },
    _prioritizeUrls: function(urls) {
      var result = [];
      each(urls, function(priority, url) {
        priority = priority || 0;
        var urls = result[priority] = result[priority] || [];
        urls.push(url);
      });
      result.push(result.shift());
      return result.clean();
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
    'CLS': 'qb/classes',
    'CSS': '/static/css'
  });
  loader.exportShortcuts.add({
    'win': 'window',
    'doc': 'document',
    'def': 'qb; document; window'
  });

  /*----------   Проброс в глобальную область   ----------*/
  merge(qb, {
    // Утилиты
    ns: ns,
    merge: merge,
    each: each,
    pass: pass,
    when: Deferred.when,
    signals: signals,
    ready: DOMReady.done.bind(DOMReady),
    // Загрузчик
    Loader: Loader,
    loader: loader,
    require: loader.require.bind(loader),
    // Классы
    Class: Class,
    Events: Events,
    Deferred: Deferred,
    Script: Script
  });

  window.qb = qb;

})(window, document);