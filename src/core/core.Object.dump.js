Object.QB_MAX_DUMP_DEPTH = 10;

/**
 * Преобразует объект в строку. Обходятся только собственные атрибуты объекта.
 * @param obj  Преобразуемый объект любого типа.
 * @param {Number|Boolean} [depth=1]  Глубина преобразования объекта, т.е. на сколько уровней функция будет
 *   "погружаться" в объект, если его атрибутами являются другие объекты.
 *   Если true, то берется максимальное значение (Object.QB_MAX_DUMP_DEPTH).
 * @param {Number|String} [indent=0]  По-умолчанию объект преобразуется в одну строку.
 *   Если указана строка, то результат будет многострочным и она будет использована
 *   в качестве отступа для каждого нового уровня вложенности объекта.
 *   Если указано число, то отспупом будет указанное кол-во пробелов.
 */
Object.dump = function (obj, depth, indent, _shift) {
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
        each(obj, function (val, key) {
            str += (str ? ',' : '') + tail + fullIndent + (isArr ? '{val}' : '{key}:{val}').format({
                key: key,
                val: space + Object.dump(val, depth - 1, indent, fullIndent)
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
};