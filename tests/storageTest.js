(function() {

    function runTests(storage) {

        module('storage (' + storage.type + ')', {
            setup: function() {
                storage.type === 'localStorage' ? window.localStorage.clear() : qb.cookie.clear();
            }
        });

        test('set & get', function() {

            var key = 'just a key',
                val = 'new value';
            storage.set(key, val);
            strictEqual(storage.get(key), val, 'Записывание и получение значения');

            val = 'null';
            storage.set(key, val);
            strictEqual(storage.get(key, true), null, 'Получение и парсинг');

            key = 'empty key';
            storage.set(key);
            strictEqual(storage.get(key), '', 'Запись ключа без значения = пустая строка');

            val = '||12345||value with fake timestamp';
            storage.set(key, val);
            strictEqual(storage.get(key), val, 'Значение с фэйковым timestamp (экранирование ||)');

            key = 'till-num';
            storage.set(key, val, 1);
            strictEqual(storage.get(key), val, 'Значение c till=1 установлено');
            stop();
            setTimeout(function() {
                strictEqual(storage.get(key), undefined, 'Значение c till=1 протухло');
                start();
            }, 2000);

            var key2 = 'till-date';
            storage.set(key2, val, new Date(Date.now() + 1000));
            strictEqual(storage.get(key2), val, 'Значение c till=(Date.now() + sec) установлено');
            stop();
            setTimeout(function() {
                strictEqual(storage.get(key2), undefined, 'Значение c till=(Date.now() + sec) протухло');
                start();
            }, 2000);

        });

        test('all & clear', function() {
            storage.set('a', 1);
            storage.set('b', false);
            storage.set('null', null);
            deepEqual(storage.all(true), {a: 1, b: false, 'null': null}, 'Получение всех значений успешно');

            storage.clear();
            deepEqual(storage.all(), {}, 'Хранилище успешно очистилось');
        });

        test('has & remove', function() {
            var key = 'removing';
            storage.set(key, 'eee');
            ok(storage.has(key), 'Ключ найден');
            ok(!storage.has('unset'), 'Отсутсвующий ключ не найден');
            storage.remove(key);
            ok(!storage.has(key), 'Ключ удален успешно');
        });

    }

    qb.require('qb/storage', 'qb.storage', function(storage, undefined) {

        if (storage.type === 'localStorage') {
            // Надо прогнать еще один тест с qb.debug.forceCookieStorage = true
            var additionalTest = true;
        }

        runTests(storage);

        if (additionalTest) {
            asyncTest('Reloading qb/storage with cookieStorage forced...', 1, function() {
                qb.debug.forceCookieStorage = true;
                qb.require('qb: storage, cookie', 'qb: storage, cookie | {reload}', function(storage, cookie, undefined) {
                    ok(true, 'Module qb/storage reloaded');
                    runTests(storage);
                    start();
                });
            });
        }

    });
})();