(function(window, document, location, config, undefined) {

    var qb = {};
    config = config || {};
    
    include('ns');

    /*----------   Основные утилиты   ----------*/

    /**
     * Декоратор, который контекст this декорируемой функции превращает в первый аргумент сгенеренной.
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
     * @param {Boolean} [onlyOwn=false]  Если true, то будет копироваться только личные атрибуты
     *                                   объекта from (from.hasOwnProperty() === true)
     * @param {Boolean} [keepExisting=false]  Если true, то атрибут из from будет копироваться в to
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

    // Метод для преобразования относительного урла в абсолютный
    // Проверка, работает ли преобразование урла в абсолютный через установку href у ссылки (не работает в IE<8)
    var link = document.createElement('a');
    link.href = 'a';
    if (link.href === 'a') {
        var div = document.createElement('div'),
            toAbsoluteUrl = function(url) {
                div.innerHTML = '<a href="' + url.escapeHtml() + '"></a>';
                return div.firstChild.href;
            };
    } else {
        toAbsoluteUrl = function(url) {
            link.href = url;
            return link.href;
        }
    }

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
        },
        timeout: function(timeout) {
            var fn = this;
            return function() {
                var _this = this,
                    args = arguments;
                setTimeout(function() {
                    fn.apply(_this, args);
                }, timeout);
            }
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
    
    include('Object.dump', 'String.repeat');

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
         * @param {Boolean} [fromEnd=false]  Искать элемент с конца.
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
         * @param [value=true]  Значение, которое будет записано в объект для каждого ключа.
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
        toAbsoluteUrl: function() {
            return toAbsoluteUrl(this);
        },
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
    
    include('String.repeat');
    
    include('Date');

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
     * @param {Boolean} [onlyOwn=false]  Выполнять функцию только для "личных" атрибутов объекта.
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

    include('Class');
    include('Events', 'Class');
    include('Deferred', 'Class');
    include('ready', 'Deferred');
    include('Loader', 'Object.dump', 'ns', 'Class', 'Events', 'Deferred', 'ready');

    merge(qb, {
        // Утилиты
        merge: merge,
        each: each,
        pass: pass,
        // Объект Debug-параметров
        debug: {},
        // Объект конфигурационных параметров
        config: {}
    });

    window.qb = qb;

})(window, document, location, (typeof qb === 'undefined' ? {} : qb));