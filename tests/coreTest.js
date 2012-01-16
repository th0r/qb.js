module('core');

test('ns', 9, function() {
    var obj = {},
        res;

    res = qb.ns('test', qb);
    strictEqual(res, qb.test, "qb.ns('test') === qb.test");
    deepEqual(qb.test, {}, "qb.ns('test') - qb.test - пустой объект");
    delete qb.test;

    res = qb.ns('test.shit', qb);
    strictEqual(res, qb.test.shit, "qb.ns('test.shit') === qb.test.shit");
    deepEqual(qb.test, { shit: {} }, "qb.ns('test.shit') - qb.test является объектом { shit: {} }");
    delete qb.test;

    res = qb.ns('test', obj);
    strictEqual(res, obj.test, "qb.ns('test', obj) === obj.test");
    deepEqual(obj, { test: {} }, "qb.ns('test', obj) - obj является объектом { test: {} }");
    delete qb.test;

    var subObj = {};
    res = qb.ns('test.subObj', obj, subObj);
    deepEqual(obj, { test: { subObj: subObj } }, "qb.ns('test.subObj', obj, subObj) - obj является объектом { test: { 'subObj': subObj } }");
    strictEqual(obj.test.subObj, subObj);
    strictEqual(res, subObj);
    delete qb.test;

});

test('Function.prototype.thisToArg', 2, function() {

    var thisObj = {};

    function tester(var1, var2) {
        strictEqual(this, thisObj, 'this === thisObj');
        deepEqual({var1: var1, var2: var2, 'arguments.length': arguments.length, 'arguments[2]': arguments[2]},
            {var1: 1, var2: 2, 'arguments.length': 3, 'arguments[2]': 3},
            'Проверяем переданные аргументы');
    }

    var newTester = tester.thisToArg();
    newTester(thisObj, 1, 2, 3);

});

test('"".parse', function() {

    var canBeParsed = {
        '1': 1,
        '.5': 0.5,
        '-.5': -0.5,
        '-1': -1,
        '   10': 10,
        '   10e2': 1000,
        '   10E-2': 0.1,
        '  0xFF ': 0xFF,
        // Это НЕ 8-ричная система, а 10-ричная
        '  088 ': 88,
        'null': null,
        'NaN': function(result) {
            return isNaN(result);
        },
        'false': false,
        'true': true
    };

    for (var str in canBeParsed) {
        var val = canBeParsed[str],
            res = str.parse(),
            msg = '"{}" пробразовано успешно'.format(str);
        Function.is(val) ? ok(val(res), msg) : strictEqual(res, val, msg);
    }

    var cantBeParsed = ['1a', 'a1', '-', 'FF', 'undefined', 'toString', 'hasOwnProperty', ' null', 'Null', '   ', ''];
    cantBeParsed.forEach(function(str) {
        strictEqual(str.parse(), str, '"{}" не преобразовано'.format(str))
    });
});

asyncTest('qb.require', 1, function() {

    var root = 'tests/data/scripts';
    qb.loader.queryShortcuts.add({
        'test': root,
        'priority': root + '/priority'
    });

    qb.require('{3}priority/c(a+b), {2}priority/b(a), {1}priority/a', function() {
        deepEqual(a, {
            b: {
                c: {}
            }
        }, '"{3}c(a+b); {2}b(a); {1}a" - Скрипты загружены в правильном порядке');
        start();
    });

});