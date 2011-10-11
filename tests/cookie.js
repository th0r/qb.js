
qb.require('qb/cookie', 'qb.cookie', function(cookie) {

  module('cookie');

  test('get', 4, function() {

    document.cookie = 'a=b';
    strictEqual( cookie.get('a'), 'b', 'Запись значения' );

    document.cookie = 'a=replace-value';
    strictEqual( cookie.get('a'), 'replace-value', 'Перезапись значения' );

    document.cookie = 'fake_equal=b=c';
    strictEqual( cookie.get('fake_equal'), 'b=c', 'Обработка нескольких знаков "равно"' );

    document.cookie = 'empty=';
    strictEqual( cookie.get('empty'), '', 'Запись пустого значения' );

  });

  test('set', function() {

    var key = 'key with space',
        val = 'new value';
    cookie.set(key, val);
    strictEqual( cookie.get(key), val, 'Записывание ключа и значения с пробелами' );

    key = 'some complex =!; "  " key',
    val = 'some complex =!; "  " : value';
    cookie.set(key, val);
    strictEqual( cookie.get(key), val, 'Экрнирование ключей и значений' );

  });

});