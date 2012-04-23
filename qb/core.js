/*. if (!options.nodejs) { -.*/
(function(window, document, location, undefined) {
/*. } -.*/

/*. // ns
    if (ns) {
-.*/
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
        // BUGFIX: тут иногда коробит IE ( window['document'] = undefined || window['document'] || {}; )
        try {
            ns[part] = finalObj || ns[part] || {};
        } catch(e) {}
        return ns[part];
    }
/*. } -.*/

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

    var _toString = Object.prototype.toString,
        toString = _toString.thisToArg();

/*. if (!options.nodejs) { -.*/
    // Метод для преобразования относительного урла в абсолютный
    // Проверка, работает ли преобразование урла в абсолютный через установку href у ссылки (не работает в IE<8)
    var LINK = document.createElement('a');
    LINK.href = 'a';
    if (LINK.href === 'a') {
        var DIV = document.createElement('div'),
            toAbsoluteUrl = function(url) {
                DIV.innerHTML = '<a href="' + url.escapeHtml() + '"></a>';
                return DIV.firstChild.href;
            };
    } else {
        toAbsoluteUrl = function(url) {
            LINK.href = url;
            return LINK.href;
        }
    }
/*. } -.*/

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
                var args = prependedArgs ? prependedArgs.concat(Array.slice(arguments)) : arguments;
                return fn.apply(thisObj, args);
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
                fn.apply((this === lazy ? null : this), arguments);
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
            return obj && (typeof obj.length === 'number') && typeof obj !== 'string' && !Function.is(obj);
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
        },
/*. // Object_dump(String_repeat)
    if (Object_dump) {
-.*/
        /**
         * Преобразует объект в строку. Обходятся только собственные атрибуты объекта.
         * @param obj  Преобразуемый объект любого типа.
         * @param {Number|Boolean} [depth=1]  Глубина преобразования объекта, т.е. на сколько уровней функция будет
         *                                    "погружаться" в объект, если его атрибутами являются другие объекты.
         *                                    Если true, то берется максимальное значение (Object.QB_MAX_DUMP_DEPTH).
         * @param {Number|String} [indent=0]  По-умолчанию объект преобразуется в одну строку.
         *                                    Если указана строка, то результат будет многострочным и она будет использована
         *                                    в качестве отступа для каждого нового уровня вложенности объекта.
         *                                    Если указано число, то отспупом будет указанное кол-во пробелов.
         */
        QB_MAX_DUMP_DEPTH: 10,
        dump: function(obj, depth, indent, _shift) {
            indent = (indent > 0) ? ' '.repeat(indent) : indent || '';
            _shift = _shift || '';
            if (depth === true) {
                depth = Object.QB_MAX_DUMP_DEPTH;
            } else if (!depth && depth !== 0) {
                depth = 1;
            }
            if (depth && (Object.is(obj) || Array.is(obj)) && !(obj instanceof RegExp)) {
                var isArr = Array.is(obj),
                    tail = (indent ? '\n' : ''),
                    space = (indent ? ' ' : ''),
                    fullIndent = _shift + indent,
                    str = '';
                each(obj, function(val, key) {
                    str += (str ? ',' : '') + tail + fullIndent + (isArr ? '{val}' : '{key}:{val}').format({
                        key: key,
                        val: space + Object.dump(val, depth-1, indent, fullIndent)
                    });
                }, true);
                str = (isArr ? '[]' : '{}').insert(1, (str ? str + tail + _shift : '' ));
            } else {
                if (typeof obj === 'string') {
                    str = '"' + obj + '"';
                } else if (Array.is(obj)) {
                    str = '[' + obj + ']';
                } else if (Function.is(obj)) {
                    str = '{function}';
                } else if (obj && obj.toString === _toString) {
                    str = '{...}';
                } else {
                    str = '' + obj;
                }
            }
            return str;
        },
/*. } -.*/
        /**
         * Делает новый объект на основе указанного.
         * @param {Object|Array} obj  Итерируемый объект, из которого нужно создать новый объект.
         * @param {Function} fn  Обработчик объекта. Вызывается для каждого ключа исходного объекта.
         *                       Контекст - создаваемый объект. Параметры - ключ исходного объекта, значение ключа, исходный объект.
         *                       Если из функции возвращается стока (str), то в новый объект записывается ключ str со значением из
         *                       исходного объекта.
         *                       Если возвращаемое значение не строка и интерпретируется как true, то в новый объект записывается
         *                       исходный ключ с исходным значением.
         *                       Если возвращаемое значение не строка и интерпретируется как false, ключ в новый объект не попадает.
         */
        makeFrom: function(obj, fn) {
            var newObj = {};
            each(obj, function(val, key) {
                var res = fn.call(newObj, key, val, this);
                if (typeof res === 'string') {
                    newObj[res] = val;
                } else if (res) {
                    newObj[key] = val;
                }
            }, true);
            return newObj;
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
            return this[this.length - 1];
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
        },
        /**
         * Преобразует массив ключей в объект (['a', 'b'] => {a: true, b: true})
         * @param [value=true]  Опционально. Значение, которое будет записано в объект для каждого ключа.
         * @returns {Object}
         */
        toObject: function(value) {
            value = arguments.length ? value : true;
            return Object.makeFrom(this, function(i, key) {
                this[key] = value;
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
        },
        HTML_ESCAPE_MAP = {
            '&': '&amp;',
            '<': '&lt;',
            '"': '&quote;',
            "'": '&#39;'
        },
        HTML_ESCAPE_REGEX = new RegExp('[' + Object.keys(HTML_ESCAPE_MAP).join('') + ']', 'g');

    merge(String.prototype, {
        trim: function() {
            return this.replace(/^\s+/, '').replace(/\s+$/, '');
        },
        contains: Array.prototype.contains,
        /**
         * Вставляет подстроку в текущую строку.
         * @param {Number} ind  Позиция, в которую вставить подстроку str.
         *                      Может быть как положительная, так и отрицательная.
         *                      Если указан отрицательный индекс, то позиция будет отсчитываться с конца текущей строки.
         *                      Индекс -1 равносилен конкатенации строк.
         * @param {String} str  Вставляемая строка.
         */
        insert: function(ind, str) {
            ind = (ind < 0) ? Math.max(0, this.length + ind + 1) : ind;
            return this.substr(0, ind) + str + this.substr(ind);
        },
/*. // String_repeat
    if (String_repeat) {
-.*/
        /**
         * Повторяет строку несколько раз.
         * @param {Number} times  Сколько раз повторить строку.
         * @param {String} [separator='']  Строка-разделитель между повторениями.
         */
        repeat: function(times, separator) {
            separator = separator || '';
            var res = [];
            for (var i = 0; i < times; i++) {
                res.push(this);
            }
            return res.join(separator);
        },
/*. } -.*/
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
        escapeHtml: function() {
            return this.replace(HTML_ESCAPE_REGEX, function(ch) {
                return HTML_ESCAPE_MAP[ch];
            });
        },
/*. if (!options.nodejs) { -.*/
        toAbsoluteUrl: function() {
            return toAbsoluteUrl(this);
        },
/*. } -.*/
        /**
         * Преобразует строку в примитивы
         * ('null' -> null; 'true' -> true и т.д.)
         * Строка 'undefined' остается нетронутой.
         */
        parse: function() {
            var str = '' + this,
                result = parseObj[str];
            // Проверка на примитивы. hasOwnProperty исключает атрибуты прототипа объекта (toString и т.д.)
            if (result === undefined || !parseObj.hasOwnProperty(str)) {
                // Пробуем преобразовать в число
                result = +str;
                // Проверяем вариант пустой строки, т.к. (+' ' === 0)
                if (isNaN(result) || (result === 0 && !str.trim().length)) {
                    // Преобразовать не получилось - возвращаем строку
                    return str;
                }
            }
            return result;
        }
    }, false, true);

/*. // Date
    if (Date) {
-.*/
    /*----------   Расширение Date   ----------*/
    merge(Date, {
        now: function() {
            return +new Date();
        },
        isDate: function(obj) {
            return (toString(obj) === '[object Date]');
        }
    }, false, true);
    Date.is = Date.isDate;
/*. } -.*/

    /*----------   Расширение Number   ----------*/
    merge(Number, {
        random: function(min, max) {
            return min + Math.random() * (max - min);
        }
    }, false, true);

    merge(Number.prototype, {
        limit: function(min, max) {
            return Math.min(max, Math.max(min, this));
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

/*. // Class
    if (Class) {
-.*/
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
        merge(proto, info, true);
        proto.constructor = constructor;

        // Название класса
        if (Name) {
            constructor.toString = Function.from(Name);
        }

        return constructor;
    }
/*. } -.*/

/*. // Events(Class)
    if (Events) {
-.*/
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
                    if (handlers) {
                        for (var i = 0, len = handlers.length; i < len; i++) {
                            if (handlers[i][0] === handler) {
                                handlers.splice(i--, 1);
                                len--;
                            }
                        }
                    }
                } else {
                    // Если указано 'click.someNS' без handler-а, то удаляем все хэндлеры на click из этой ns
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
            args = args || [];
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
/*. } -.*/

/*. // Deferred(Class)
    if (Deferred) {
-.*/
    /*----------   Реализация Deferred   ----------*/
    var DEFERRED_STATUS = {
        UNRESOLVED: 0,
        RESOLVED: 1,
        REJECTED: 2
    };

    function makeCallbackMethod(prop, callStatus) {
        return function(callbacks) {
            var status = this.$status;
            if (this.isUnresolved()) {
                this[prop].append(Array.from(callbacks));
            } else if (status === callStatus || callStatus === true) {
                this._callDeferredCallbacks(callbacks);
            }
            return this;
        }
    }

    function makeResolveMethod(prop, resolveStatus) {
        return function(/*args*/) {
            if (this.isUnresolved()) {
                this.$status = resolveStatus;
                this.$args = Array.slice(arguments);
                this._callDeferredCallbacks(this[prop].concat(this.$always));
                delete this.$done;
                delete this.$fail;
                delete this.$always;
            }
            return this;
        }
    }

    function makeResolveWithMethod(method) {
        return function(thisObj/*, args*/) {
            if (this.isUnresolved()) {
                this.$with = thisObj;
                return this[method].apply(this, Array.slice(arguments, 1));
            }
        }
    }

    var Deferred = new Class({
        Name: 'Deferred',
        Static: merge({
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
                    if (def instanceof Deferred) {
                        def.done(function() {
                            args[i] = Array.slice(arguments);
                            if (!--unresolved) {
                                result.resolve.apply(result, args);
                            }
                        });
                        def.fail(fail);
                    } else {
                        args[i] = def;
                        unresolved--;
                    }
                });
                if (!unresolved) {
                    result.resolve.apply(result, args);
                }
                return result;
            }
        }, DEFERRED_STATUS),

        init: function() {
            this.$done = [];
            this.$fail = [];
            this.$always = [];
            this.$status = DEFERRED_STATUS.UNRESOLVED;
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
        done: makeCallbackMethod('$done', DEFERRED_STATUS.RESOLVED),
        fail: makeCallbackMethod('$fail', DEFERRED_STATUS.REJECTED),
        then: function(doneCallbacks, failCallbacks) {
            return this.done(doneCallbacks).fail(failCallbacks);
        },
        always: makeCallbackMethod('$always', true),
        resolve: makeResolveMethod('$done', DEFERRED_STATUS.RESOLVED),
        resolveWith: makeResolveWithMethod('resolve'),
        reject: makeResolveMethod('$fail', DEFERRED_STATUS.REJECTED),
        rejectWith: makeResolveWithMethod('reject'),
        pipe: function(doneFilter, failFilter) {
            var result = new Deferred();
            [doneFilter, failFilter].forEach(function(filter, i) {
                if (Function.is(filter)) {
                    this[i ? 'fail' : 'done'](function() {
                        var args = Array.from(filter.apply(this, arguments));
                        args.unshift(this);
                        result[(i ? 'reject' : 'resolve') + 'With'].apply(result, args);
                    });
                }
            }, this);
            return result;
        }
    });

    // Делаем методы isResolved, isRejected и isUnresolved
    each(DEFERRED_STATUS, function(statusVal, statusName) {
        this['is' + statusName.toLowerCase().capitalize()] = function() {
            return this.$status === statusVal;
        }
    }.bind(Deferred.prototype));
/*. } -.*/

/*. // ready(Deferred)
    if (ready) {
-.*/
    /*----------   Реализация deferred-а DOMReady (аналог $(document).ready) ----------*/
    var DOMReady = new Deferred(),
        windowLoad = new Deferred(),
        ready = DOMReady.resolve.bind(DOMReady),
        winLoaded = windowLoad.resolve.bind(windowLoad);

    if (document.readyState === 'complete') {
        ready();
        winLoaded();
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', ready, false);
        window.addEventListener('load', winLoaded, false);
    } else if (document.attachEvent) {
        var loaded = function() {
            if (document.readyState === 'complete') {
                ready();
            }
        };
        document.attachEvent('onreadystatechange', loaded);
        window.attachEvent('onload', winLoaded);
        // Хак для мониторинга загрузки DOM в IE
        try {
            var toplevel = (window.frameElement == null);
        } catch(e) {}

        if (toplevel && document.documentElement.doScroll) {
            (function() {
                try {
                    document.documentElement.doScroll('left');
                } catch(e) {
                    window.setTimeout(arguments.callee, 10);
                    return;
                }
                loaded();
            })();
        }
    }
/*. } -.*/

/*. // Loader(Object_dump,ns,Class,Events,Deferred,ready)
    if (Loader) {
-.*/

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
     *    Части запроса отделяются друг от друга строкой "; " (пробел обязателен!).
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
     *      2) В описании шортката можно использовать другие шорткаты.
     *         Они подменяются на этапе использования шортката, а не на этапе его добавления.
     *         В случае бесконечной рекурсивной замены шорткатов будет вызвана ошибка с подробной информацией.
     *      3) Шорткаты в строке запроса заменяются только в случае, если они окружены символами ",.:;/!} "
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
     *    После загрузки всех указанных в строке запроса ресурсов вызывается callback (если он указан).
     *    Для удобства, в него в качестве параметров можно пробросить указанные в строке экспорта объекты (указание
     *    строки экспорта - опционально).
     *    Пример:
     *      qb.require('$; qb: cookie, classes/Collection', '$; window.location; qb: Class, cookie, Collection; qb; document; window',
     *                 function($, location, Class, cookie, Collection, qb, document, window) {...});
     *    Строка экспорта многим похожа на строку запроса: в ней так же можно использовать группировку и шорткаты.
     *    Шорткаты экспорта находятся в объекте exportShortcuts загрузчика (qb.loader.exportShortcuts).
     *    Для их добавления так же используется метод "add".
     *    При использовании шорткатов экспорта действуют все те же правила, что и для шорткатов запроса.
     *    Различаются только спец-символы - для шорткатов экспорта это символы ",.:; "
     *
     *    Также в строке экспорта можно использовать флаги.
     *    Флаги указываются следующим образом (показана строка экспорта):
     *      '<export_string> | {flag1, flag2...flagN}'
     *    Поддерживаемые флаги:
     *      ready: callback будет вызван только после загрузки всех ресурсов и после готовности DOM-дерева (аналог $(document).ready() ).
     *      load: callback будет вызван только после загрузки всех ресурсов и после полной загрузки страницы (на window.onload).
     *            Если вместе с load указан флаг ready, то load имеет приоритет.
     *      reload: все ресурсы, указанные в строке запроса будут принудительно перезагружены.
     *    Пример:
     *      '$; $.growl | {ready, reload}'
     *
     *    Также есть возможность в строке экспорта указать ТОЛЬКО флаги. Тогда она будет выглядеть так:
     *      '{ready}'
     */

    var HEAD_ELEM = document.getElementsByTagName('head')[0];

    var Shortcuts = new Class({
        Name: 'Shortcuts',
        Static: {
            MAX_DEPTH: 50
        },

        init: function(edgeChars) {
            this.shortcuts = {};
            this.edgeChars = edgeChars.escapeRegexp();
            // Служит для отслеживания бесконечной рекурсии
            this.stack = [];
        },
        add: function(shortcuts) {
            var currentShortcuts = this.shortcuts;
            each(shortcuts, function(value, shortcut) {
                currentShortcuts[shortcut] = value;
            });
            this._generateRegexp();
        },
        _generateRegexp: function() {
            var shortcuts = Object.keys(this.shortcuts).map(
                function(shortcut) {
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
            var self = this,
                shortcuts = this.shortcuts,
                result = str,
                stack = this.stack;
            if (this.regexp) {
                if (stack.length > Shortcuts.MAX_DEPTH) {
                    var err = new Error('Endless recursion during shortcuts replacing.\n' +
                                        Object.dump(this, true, 4));
                    err.name = 'qb-sc-recursion';
                    throw err;
                }
                result = str.replace(this.regexp, function(_, left, shortcut) {
                    stack.push(str + ': ' + shortcut);
                    return left + self.replaceIn(shortcuts[shortcut]);
                });
                stack.pop();
            }
            return result;
        }
    });

    /**
     * Объект, рассылающий события прогресса загрузки ресурсов.
     * Можно использовать для отображение прогресс-бара.
     * События посылаются объектом qb.signals:
     *   - "loader-start" при начале загрузки ресурсов
     *   - "loader-step" при изменении прогресса загрузки. В обработчик прокидываются 2 аргумента:
     *       1) количество загруженных на данный момент ресурсов
     *       2) общее количество загружаемых ресурсов
     *   - "loader-finish" при окончании загрузки. В аргументе передается количество загруженных ресурсов.
     */
    var progress = {
        loaded: 0,
        total: 0,
        started: function() {
            if (!this.total++) {
                signals.send('loader-start');
            }
        },
        finished: function() {
            this.loaded++;
            signals.send('loader-step', [this.loaded, this.total]);
            if (this.loaded >= this.total) {
                signals.send('loader-finish', [this.total]);
                this.loaded = this.total = 0;
            }
        }
    };

    var LOAD_STATUS = {
        UNLOADED: 0,
        LOADING: 1,
        LOADED: 2,
        LOAD_ERROR: 3
    };

    var LoadingElement = new Class({
        Name: 'LoadingElement',
        Extends: Deferred,
        Static: LOAD_STATUS,

        init: function(url) {
            Deferred.call(this);
            this.url = url;
            this.elem = null;
            this.status = LOAD_STATUS.UNLOADED;
        },
        load: function() {
            if (this.status === LOAD_STATUS.UNLOADED) {
                this.status = LOAD_STATUS.LOADING;
                progress.started();
                this._createElem();
            }
        },
        destroy: function() {
            this._removeElem();
        },
        // Этот метод должен быть перезагружен. Здесь должен создаваться DOM-элемент.
        _createElem: pass,
        // Этот метод должен быть перезагружен. Здесь должен удаляться DOM-элемент.
        _removeElem: pass,
        resolve: function() {
            this.status = LOAD_STATUS.LOADED;
            progress.finished();
            Deferred.fn.resolve.call(this, this);
        },
        reject: function() {
            this.status = LOAD_STATUS.LOAD_ERROR;
            progress.finished();
            Deferred.fn.reject.apply(this, arguments);
        }
    });

    var Stylesheet = new Class({
        Name: 'Stylesheet',
        Extends: LoadingElement,
        Static: LOAD_STATUS,

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
            link.rel = 'stylesheet';
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
        Static: LOAD_STATUS,

        init: function(url) {
            LoadingElement.call(this, url);
        },
        _createElem: function() {
            var script = this.elem = document.createElement('script');
            this._bindLoadHandler();
            script.src = this.url;
            HEAD_ELEM.appendChild(script);
        },
        _removeElem: function() {
            HEAD_ELEM.removeChild(this.elem);
        },
        resolve: function() {
            var elem = this.elem;
            elem.onreadystatechange = elem.onload = elem.onerror = null;
            LoadingElement.fn.resolve.call(this);
        },
        reject: function(message, file, line) {
            var errorMsg = (typeof message === 'string') ? 'Error in line {1}: "{0}"'.format([message, line]) : '<no info>';
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
     * Удаляет все пробельные символы
     * @param {String} query  Строка запроса
     * @returns {String}
     */
    function removeWhitespaces(query) {
        return query.replace(/\s+/g, '');
    }

    /**
     * Разделяет строку запроса на части и удаляет из них пустые
     * @param {String} query  Строка запроса
     * @returns {Array}
     */
    function splitQuery(query, splitter) {
        return query.split(splitter).clean();
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
            this.options = exports ? exports.flags : {};
            Deferred.when.apply(null, resources).then(
                this._handleLoad.bind(this),
                this._handleLoadError.bind(this)
            );
        },
        load: function() {
            this.resources.forEachCall('load');
        },
        _handleLoad: function() {
            var flags = this.options,
                parseArgs = this._parseArgs.bind(this);
            if (flags.ready || flags.load) {
                // Очередность важна - флаг load имеет приоритет
                (flags.load ? windowLoad : DOMReady).done(parseArgs);
            } else {
                parseArgs();
            }
        },
        _parseArgs: function() {
            var args = this.args,
                exports = [];
            if (args) {
                // Заменяем шорткаты
                args = removeWhitespaces(this.loader.exportShortcuts.replaceIn(args));
                splitQuery(args, ';').forEach(function(part) {
                    splitPart(part, '.').forEach(function(_export) {
                        this.push(ns(_export));
                    }, exports);
                });
            }
            this.resolve.apply(this, exports);
        },
        _handleLoadError: function(resource, error) {
            this.reject(resource, error);
            throw 'Failed to load resource "{0}"\nError info: "{1}"'.format(arguments);
        }
    });

    var PARTS_PRIORITY = /^!|^\{(\d+)}/i,
        EXPORTS_FLAGS = /(?:^|\|)\{([\w,]+)\}$/i;

    var Loader = new Class({
        Name: 'Loader',
        Static: {
            FULL_URL: /^(https?:\/\/|\/)/i,
            resources: {},
            requires: 0,
            ready: new Deferred()
        },

        init: function(rootUrl) {
            this.rootUrl = toAbsoluteUrl(rootUrl);
            this.queryShortcuts = new Shortcuts(',.:;/!} ');
            this.exportShortcuts = new Shortcuts(',.:; ');
        },
        /**
         * Загрузчик ресурсов (см. описание Loader)
         * Возможные варианты вызова:
         *   1) Простая загрузка ресурсов:
         *       require(resources)
         *   2) Загрузка ресурсов и вызов колбэка
         *       require(resources, callback)
         *   3) Загрузка ресурсов с экспортом необходимых объектов в колбэк
         *       require(resources, exports, callback)
         *   4) Объявление модуля с зависимостями
         *       require(dependances, callback, module)
         *   5) Объявление модуля с зависимостями и экспорт необходимых объектов в колбэк
         *       require(dependances, exports, callback, module)
         * @param query  Строка запроса загрузчика
         * @param {String} [exports]  Строка экспорта
         * @param {Function} [callback]  Функция, вызываемая после загрузки всех ресурсов.
         * @param {String} [module]  Название текущего модуля.
         *                           Используется в модулях, которые зависят от других ресурсов.
         */
        require: function(query, exports, callback, module) {
            var self = this,
                resources = Loader.resources,
                ready = Loader.ready,
                argsLen = arguments.length;
            if (argsLen === 2) {
                // require(query, callback)
                callback = exports;
                exports = null;
            } else if (argsLen === 3 && typeof callback === 'string') {
                // require(query, callback, module)
                module = callback;
                callback = exports;
                exports = null;
            }
            var callbacks = Function.is(callback) ? [callback] : [];
            // Если указано название модуля, значит в модуле используется require и нужно отложить загрузку скрипта
            if (module) {
                module = resources[this._normalizeScriptUrl(module)];
                module.deferLoad();
                callbacks.push(module.resolve.bind(module));
            }
            if (ready.isUnresolved()) {
                Loader.requires++;
                callbacks.push(function() {
                    if (--Loader.requires === 0) {
                        ready.resolve();
                    }
                });
            }
            var urls = this._parseQuery(query),
                handlers = urls.map(function(part) {
                    var _exports = ( part === this.last() ) ? self._parseExports(exports) : null;
                    return self._getLoadHandler(part, _exports);
                }, urls);
            handlers.forEach(function(handler, i) {
                var next = this[i + 1];
                handler.done(next ? function() { next.load() } : callbacks);
            }, handlers);
            handlers[0].load();
            return handlers.last();
        },
        _getLoadHandler: function(urls, exports) {
            var resources = Loader.resources,
                isReload = exports ? exports.flags.reload : false,
                required = urls.map(function(url) {
                    var resource = resources[url],
                        isCSS = this._isStylesheet(url);
                    if (isReload && !isCSS && resource && resource.status === LOAD_STATUS.LOADED) {
                        resource.destroy();
                        delete resources[url];
                    }
                    return (resources[url] = resources[url] || new (isCSS ? Stylesheet : Script)(url));
                }, this);
            return new Handler(this, required, exports);
        },
        _parseQuery: function(query, _subcall) {
            var parts = (typeof query === 'string') ? splitQuery(query, '; ') : query,
                urls = {};
            parts.forEach(function(part) {
                if (part) {
                    part = part.trim();
                    var priorityInfo = this._parsePriority(part),
                        partInfo = this._getPartInfo(priorityInfo.part);
                    if (partInfo.isUrl) {
                        urls[partInfo.part] = priorityInfo.priority;
                    } else {
                        if (!_subcall) {
                            part = this.queryShortcuts.replaceIn(part);
                        }
                        merge(urls, (_subcall ? this._parsePart(part) : this._parseQuery(part, true)));
                    }
                }
            }, this);
            return _subcall ? urls : this._prioritizeUrls(urls);
        },
        _parsePart: function(part) {
            var chunks = splitPart(removeWhitespaces(part), '/'),
                urls = {};
            chunks.forEach(function(chunk) {
                var info = this._parsePriority(chunk),
                    part = info.part,
                    url = this._isStylesheet(part) ? toAbsoluteUrl(part) : this._normalizeScriptUrl(part);
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
                var flags,
                    args = removeWhitespaces(exports).replace(EXPORTS_FLAGS, function(_, _flags) {
                        flags = _flags.split(',').toObject();
                        return '';
                    });
                return {
                    args: args || null,
                    flags: flags || {}
                }
            } else {
                return null;
            }
        },
        /**
         * Проверяет, является ли эта часть запроса абсолютным урлом (см. описание Loader)
         * @param part  Проверяемая часть запроса
         * @return {Object} info  Объект с информацией о парте
         * @return {String} info.part  Если парт определился, как абсолютный урл, то возвращается нормализованный урл
         *                             (добавляется протокол, доменная часть приводится к lowercase и т.д.).
         *                             Иначе возвращается исходный необработанный парт.
         * @return {Boolean} info.isUrl  Флаг, определился ли парт как урл или нет
         */
        _getPartInfo: function(part) {
            var info = {};
            if (part.startsWith('www.')) {
                info.part = 'http://' + part;
                var isUrl = true;
            }
            info.isUrl = isUrl = isUrl || Loader.FULL_URL.test(part);
            info.part = isUrl ? toAbsoluteUrl(part) : part;
            return info;
        },
        _normalizeScriptUrl: function(url) {
            return this.rootUrl + url.toLowerCase() + '.js';
        },
        _isStylesheet: function(url) {
            return /\.css$/i.test(url);
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
        rootJS;
    for (var i = 0, len = scripts.length; i < len; i++) {
        if (rootJS = rootRegEx.exec(scripts[i].src)) {
            rootJS = rootJS[1];
            break;
        }
    }
    rootJS = rootJS || '/static/js/';

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
/*. } -.*/

    /*----------   Создание основного объекта   ----------*/

/*. if (Loader) { -.*/
    function qb(handler) {
        Loader.ready.done(handler);
    }
/*. } else { -.*/
    var qb = {};
/*. } -.*/

    merge(qb, {
        // Утилиты
        merge: merge
      , each: each
      , pass: pass
/*. if (ns) { -.*/
      , ns: ns
/*. } -.*/
/*. if (Events) { -.*/
      , signals: signals
/*. } -.*/
/*. if (ready) { -.*/
      , ready: DOMReady.done.bind(DOMReady)
      , load: windowLoad.done.bind(windowLoad)
/*. } -.*/
/*. if (Loader) { -.*/
      , Loader: Loader
      , loader: loader
      , require: loader.require.bind(loader)
/*. } -.*/
/*. if (Class) { -.*/
      , Class: Class
/*. } -.*/
/*. if (Events) { -.*/
      , Events: Events
/*. } -.*/
/*. if (Deferred) { -.*/
      , Deferred: Deferred
      , when: Deferred.when
/*. } -.*/
/*. if (options.full) { -.*/
        // Объект Debug-параметров
      , debug: {}
        // Объект конфигурационных параметров
      , config: {}
/*. } -.*/
    });

/*. if (options.nodejs) { -.*/
    module.exports = qb;
/*. } else { -.*/
    window.qb = qb;
/*. } -.*/

/*. if (!options.nodejs) { -.*/
})(window, document, location);
/*. } -.*/