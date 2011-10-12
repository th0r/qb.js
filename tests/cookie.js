
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

    cookie.clear();
    strictEqual( document.cookie, '', 'Очистка всех значений куки' );

    key = 'temporary';
    val = 'max-age';
    cookie.set(key, val, 2);
    strictEqual( cookie.get(key), val, 'Кука с max-age установлена' );
    stop();
    setTimeout(function() {
      strictEqual( cookie.get(key), undefined, 'Кука с max-age успешно протухла' );
      start();
    }, 2000);

    var after_2_secs = new Date( Date.now() + 2*1000 );
    val = 'expires';
    strictEqual( cookie.get(key), val, 'Кука с expires установлена' );
    stop();
    setTimeout(function() {
      strictEqual( cookie.get(key), undefined, 'Кука с expires успешно протухла' );
      start();
    }, 2000);

  });

});