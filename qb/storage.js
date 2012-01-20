(function(storage, undefined) {

    if (storage && !qb.debug.forceCookieStorage) {

        /**
         * Сохраняет значение в хранилище.
         * Используется localStorage или, если он не доступен, document.cookie.
         * @param {String} key  Ключ, по которому сохранить значение.
         * @param [value='']  Опционально. Значение, которое необходимо сохранить.
         * @param {Number|Date} [till]  Опционально. Если указано число, то это время жизни устанавливаемого значения в секундах.
         *                              Если указан объект Date, то значение будет жить до этой даты.
         *                              Если не указан, то значение устанавливается "навсегда".
         */
        function set(key, value, till) {
            if (value === undefined) {
                value = '';
            }
            value = ('' + value).replace(/\|\|/g, '\\||');
            if (typeof till === 'number' && till > 0) {
                till = Date.now() + till * 1000;
            } else if (Date.is(till)) {
                till = +till;
            } else {
                till = null;
            }
            if (till !== null) {
                value = ['||', till, '||', value].join('');
            }
            storage.setItem(key, value);
        }

        /**
         * Возвращает значение их хранилища.
         * @param {String} key  Ключ, значение которого нужно получить.
         * @param {Boolean} [parse=false]  Опционально. Нужно ли его преобразовывать из строки.
         * @returns  Возвращает undefined, если такого ключа в хранилище нет (или оно уже протухло) или его значение, если он есть.
         */
        function get(key, parse) {
            var val = storage.getItem(key);
            if (val !== null) {
                // Проверяем наличие даты протухания
                if (val.startsWith('||')) {
                    var withDate = false,
                        alive;
                    val = val.replace(/^\|\|(\d+)\|\|/, function(str, till) {
                        withDate = true;
                        alive = (+till > Date.now());
                        return '';
                    });
                    if (withDate && !alive) {
                        storage.removeItem(key);
                        return undefined;
                    }
                }
                // Декодируем
                val = val.replace(/\\\|\|/g, '||');
            }
            return (val === null) ? undefined : parse ? val.parse() : val;
        }

        function getAll(parse) {
            var res = {};
            for (var i = 0, len = storage.length; i < len; i++) {
                var key = storage.key(i),
                    val = get(key, parse);
                if (val !== undefined) {
                    res[key] = val;
                }
            }
            return res;
        }

        /**
         * Проверяет, установлено ли какое-нибудь значение по указанному ключу в хранилище.
         * @param key  Проверяемый ключ
         */
        function has(key) {
            return get(key) !== undefined;
        }

        // BUGFIX: в IE8 у методов localStorage нет "bind", объявленного в qb.core, поэтому его заюзать нельзя.
        function storageDecorator(method) {
            return function() {
                return storage[method].apply(storage, arguments);
            }
        }

        // Удаляем протухшие записи из хранилища
        getAll();
        qb.storage = {
            type: 'localStorage',
            set: set,
            get: get,
            all: getAll,
            has: has,
            remove: storageDecorator('removeItem'),
            clear: storageDecorator('clear')
        }

    } else {

        qb.require('qb/cookie', 'qb.cookie; qb', function(cookie, qb) {

            // Префикс, чтобы отделять обычные куки от storage-кук.
            var prefix = 'qs!';

            function cookieDecorator(method, argsCount) {
                return function(key) {
                    var args = Array.slice(arguments, 0, argsCount);
                    // Изменяем название ключа
                    args[0] = prefix + args[0];
                    return cookie[method].apply(cookie, args);
                }
            }

            function set(key, val, till) {
                // Меняем поведение: "на сессию" => "вечно"
                cookie.set(prefix + key, val, (till == null ? true : till));
            }

            function getAll(parse) {
                return Object.makeFrom(cookie.all(parse), function(key) {
                    return key.startsWith(prefix) ? key.substr(prefix.length) : false;
                });
            }

            function clear() {
                for (var key in cookie.all()) {
                    if (key.startsWith(prefix)) {
                        cookie.remove(key);
                    }
                }
            }

            qb.storage = {
                type: 'cookie',
                set: set,
                get: cookieDecorator('get', 2),
                all: getAll,
                has: cookieDecorator('has', 1),
                remove: cookieDecorator('remove', 1),
                clear: clear
            }

        }, 'qb/storage');

    }

})(window.localStorage);