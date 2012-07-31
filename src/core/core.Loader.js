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

    init: function (edgeChars) {
        this.shortcuts = {};
        this.edgeChars = edgeChars.escapeRegexp();
        // Служит для отслеживания бесконечной рекурсии
        this.stack = [];
    },
    add: function (shortcuts) {
        var currentShortcuts = this.shortcuts;
        each(shortcuts, function (value, shortcut) {
            currentShortcuts[shortcut] = value;
        });
        this._generateRegexp();
    },
    _generateRegexp: function () {
        var shortcuts = Object.keys(this.shortcuts).map(
            function (shortcut) {
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
    replaceIn: function (str) {
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
            result = str.replace(this.regexp, function (_, left, shortcut) {
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
    started: function () {
        if (!this.total++) {
            signals.send('loader-start');
        }
    },
    finished: function () {
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
    Static: {
        STATUS: LOAD_STATUS
    },

    init: function (url) {
        Deferred.call(this);
        this.url = url;
        this.elem = null;
        this.status = LOAD_STATUS.UNLOADED;
    },
    load: function () {
        if (this.status === LOAD_STATUS.UNLOADED) {
            this.status = LOAD_STATUS.LOADING;
            progress.started();
            this._createElem();
        }
    },
    loadFrom: function (elem) {
        this.elem = elem;
        this.status = LOAD_STATUS.LOADED;
        Deferred.fn.resolve.call(this, this);
    },
    destroy: function () {
        this._removeElem();
    },
    // Этот метод должен быть перезагружен. Здесь должен создаваться DOM-элемент.
    _createElem: pass,
    // Этот метод должен быть перезагружен. Здесь должен удаляться DOM-элемент.
    _removeElem: pass,
    resolve: function () {
        if (this.status === LOAD_STATUS.LOADING) {
            progress.finished();
        }
        this.status = LOAD_STATUS.LOADED;
        Deferred.fn.resolve.call(this, this);
    },
    reject: function () {
        this.status = LOAD_STATUS.LOAD_ERROR;
        progress.finished();
        Deferred.fn.reject.apply(this, arguments);
    }
});

var Stylesheet = new Class({
    Name: 'Stylesheet',
    Extends: LoadingElement,
    Static: {
        STATUS: LOAD_STATUS,
        getResourcesFromPage: function () {
            var resources = {};
            Array.slice(document.getElementsByTagName('link')).forEach(function (link) {
                if (link.rel === 'stylesheet' && link.href) {
                    resources[toAbsoluteUrl(link.href)] = link;
                }
            });
            return resources;
        }
    },

    init: function (url) {
        LoadingElement.call(this, url);
        this.img = null;
    },
    _createElem: function () {
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
    resolve: function () {
        var link = this.elem,
            img = this.img;
        link.onload = img.onerror = null;
        // BUGFIX: Удаляем src, иначе IE8 показывает, что грузит эту мнимую картинку
        img.removeAttribute('src');
        img.parentNode.removeChild(img);
        LoadingElement.fn.resolve.call(this);
    },
    toString: function () {
        return 'Stylesheet [{}]'.format(this.url);
    }
});

var Script = new Class({
    Name: 'Script',
    Extends: LoadingElement,
    Static: {
        STATUS: LOAD_STATUS,
        getResourcesFromPage: function () {
            var resources = {};
            Array.slice(document.getElementsByTagName('script')).forEach(function (script) {
                if (script.src) {
                    resources[toAbsoluteUrl(script.src)] = script;
                }
            });
            return resources;
        }
    },

    init: function (url) {
        LoadingElement.call(this, url);
    },
    _createElem: function () {
        var script = this.elem = document.createElement('script');
        this._bindLoadHandler();
        script.src = this.url;
        HEAD_ELEM.appendChild(script);
    },
    _removeElem: function () {
        HEAD_ELEM.removeChild(this.elem);
    },
    resolve: function () {
        var elem = this.elem;
        elem.onreadystatechange = elem.onload = elem.onerror = null;
        LoadingElement.fn.resolve.call(this);
    },
    reject: function (message, file, line) {
        var errorMsg = (typeof message === 'string') ? 'Error in line {1}: "{0}"'.format([message, line]) : '<no info>';
        LoadingElement.fn.reject.call(this, errorMsg);
    },
    deferLoad: function () {
        var elem = this.elem;
        elem.onreadystatechange = elem.onload = null;
    },
    _bindLoadHandler: function () {
        var elem = this.elem,
            loaded = this.resolve.bind(this);
        elem.onreadystatechange = function () {
            if (this.readyState == 'loaded' || this.readyState == 'complete') {
                loaded();
            }
        };
        elem.onload = loaded;
        elem.onerror = this.reject.bind(this);
    },
    toString: function () {
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
    return base ? childs.map(function (child) {
        return base + child;
    }) : childs;
}

var Handler = new Class({
    Name: 'Handler',
    Extends: Deferred,

    init: function (loader, resources, exports) {
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
    load: function () {
        this.resources.forEachCall('load');
    },
    _handleLoad: function () {
        var flags = this.options,
            parseArgs = this._parseArgs.bind(this);
        if (flags.ready || flags.load) {
            // Очередность важна - флаг load имеет приоритет
            (flags.load ? windowLoad : DOMReady).done(parseArgs);
        } else {
            parseArgs();
        }
    },
    _parseArgs: function () {
        var args = this.args,
            exports = [];
        if (args) {
            // Заменяем шорткаты
            args = removeWhitespaces(this.loader.exportShortcuts.replaceIn(args));
            splitQuery(args, ';').forEach(function (part) {
                splitPart(part, '.').forEach(function (_export) {
                    this.push(ns(_export));
                }, exports);
            });
        }
        this.resolve.apply(this, exports);
    },
    _handleLoadError: function (resource, error) {
        this.reject(resource, error);
        throw 'Failed to load resource "{0}"\nError info: "{1}"'.format(arguments);
    }
});

var PARTS_PRIORITY = /^!|^\{(\d+)}/i,
    EXPORTS_FLAGS = /(?:^|\|)\{([\w,]+)\}$/i,
    FULL_URL = /^(https?:\/\/|\/)/i;

var Loader = new Class({
    Name: 'Loader',
    Static: {
        resources: {},
        resourceTypes: [],
        requires: 0,
        ready: new Deferred(),
        getResources: function (updateFromPage) {
            var resources = this.resources;
            if (updateFromPage) {
                // Получаем список новых ресурсов со страницы
                this.resourceTypes.forEach(function (Class) {
                    if (Class.getResourcesFromPage) {
                        each(Class.getResourcesFromPage(), function (elem, url) {
                            if (!resources[url]) {
                                var resource = resources[url] = new Class(url);
                                resource.loadFrom(elem);
                            }
                        });
                    }
                });
            }
            return resources;
        },
        registerResourceTypes: function (Classes) {
            this.resourceTypes.append(Classes);
        }
    },

    init: function (rootUrl) {
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
    require: function (query, exports, callback, module) {
        var self = this,
            resources = Loader.getResources(true),
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
            callbacks.push(function () {
                if (--Loader.requires === 0) {
                    ready.resolve();
                }
            });
        }
        var urls = this._parseQuery(query),
            handlers = urls.map(function (part) {
                var _exports = ( part === this.last() ) ? self._parseExports(exports) : null;
                return self._getLoadHandler(part, _exports);
            }, urls);
        handlers.forEach(function (handler, i) {
            var next = this[i + 1];
            handler.done(next ? function () { next.load() } : callbacks);
        }, handlers);
        handlers[0].load();
        return handlers.last();
    },
    _getLoadHandler: function (urls, exports) {
        var resources = Loader.getResources(),
            isReload = exports ? exports.flags.reload : false,
            required = urls.map(function (url) {
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
    _parseQuery: function (query, _subcall) {
        var parts = (typeof query === 'string') ? splitQuery(query, '; ') : query,
            urls = {};
        parts.forEach(function (part) {
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
    _parsePart: function (part) {
        var chunks = splitPart(removeWhitespaces(part), '/'),
            urls = {};
        chunks.forEach(function (chunk) {
            var info = this._parsePriority(chunk),
                part = info.part,
                url = this._isStylesheet(part) ? toAbsoluteUrl(part) : this._normalizeScriptUrl(part);
            urls[url] = info.priority;
        }, this);
        return urls;
    },
    _parsePriority: function (part) {
        var priority = null;
        part = part.replace(PARTS_PRIORITY, function (_, num) {
            priority = +num || 1;
            return '';
        });
        return {
            part: part,
            priority: priority
        }
    },
    _parseExports: function (exports) {
        if (exports) {
            var flags,
                args = removeWhitespaces(exports).replace(EXPORTS_FLAGS, function (_, _flags) {
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
    _getPartInfo: function (part) {
        var info = {};
        if (part.startsWith('www.')) {
            info.part = 'http://' + part;
            var isUrl = true;
        }
        info.isUrl = isUrl = isUrl || FULL_URL.test(part);
        info.part = isUrl ? toAbsoluteUrl(part) : part;
        return info;
    },
    _normalizeScriptUrl: function (url) {
        return this.rootUrl + url + '.js';
    },
    _isStylesheet: function (url) {
        return /\.css$/i.test(url);
    },
    _prioritizeUrls: function (urls) {
        var result = [];
        each(urls, function (priority, url) {
            priority = priority || 0;
            var urls = result[priority] = result[priority] || [];
            urls.push(url);
        });
        result.push(result.shift());
        return result.clean();
    }
});

// Регистрируем типы ресурсов
Loader.registerResourceTypes([Script, Stylesheet]);

// Определяем директорию со скриптами
var rootJS = config.root;
if (!rootJS) {
    var scripts = document.getElementsByTagName('script'),
        rootRegEx = /(.*?)qb\/core\.js$/;
    for (var i = 0, len = scripts.length; i < len; i++) {
        if (rootJS = rootRegEx.exec(scripts[i].src)) {
            rootJS = rootJS[1];
            break;
        }
    }
    rootJS = rootJS || '/static/js/';
}

var loader = new Loader(rootJS);
loader.queryShortcuts.add({
    'jQuery': 'libs/jquery',
    '$': 'jQuery',
    'CLS': 'qb/classes',
    'CSS': '/static/css'
});
loader.exportShortcuts.add({
    'win': 'window',
    'doc': 'document',
    'def': 'qb; document; window'
});

/*----------   Замена основного объекта на функцию   ----------*/
qb = (function (oldQB) {
    
    var newQB = function (handler) {
        Loader.ready.done(handler);
    };
    
    return merge(newQB, oldQB);
    
}(qb));

merge(qb, {
    Loader: Loader,
    loader: loader,
    Shortcuts: Shortcuts,
    require: loader.require.bind(loader)
});