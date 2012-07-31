/**
 * Повторяет строку несколько раз.
 * @param {Number} times  Сколько раз повторить строку.
 * @param {String} [separator='']  Строка-разделитель между повторениями.
 */
String.prototype.repeat = function (times, separator) {
    separator = separator || '';
    var res = [];
    for (var i = 0; i < times; i++) {
        res.push(this);
    }
    return res.join(separator);
};