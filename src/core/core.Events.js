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
    init: function (events) {
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
     * @param {Boolean} [triggerOnce=false]  Вызвать данный обработчик только один раз (затем удалить).
     */
    addEvents: function (name, handler, triggerOnce) {
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
            each(eventsObj, function (handler, name) {
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
     * @param {Function} [handler]  Обработчик, который нужно удалить.
     */
    removeEvents: function (name, handler) {
        var info = getEventInfo(name),
            ns = info.ns,
            events = this.$events;
        name = info.name;
        // Если указано 'click', то удаляем обработчики на событие 'click' из всех ns
        if (ns === 'default' && !handler) {
            each(events, function (ns) {
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
     * @param {Array} [args=[]]  Аргументы, с которыми будет вызван каждый обработчик.
     * @apram [thisObj=self]  Объект, который станет this в обработчиках.
     */
    triggerEvent: function (name, args, thisObj) {
        args = args || [];
        thisObj = (arguments.length > 2) ? arguments[2] : this;
        each(this.$events, function (ns) {
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

qb.Events = Events;
qb.signals = signals;