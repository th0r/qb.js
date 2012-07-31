/**
 * Namespace - функция для создания областей видимости
 * @param {String} path  Строка вида "ns.ns1.ns2"
 * @param {Object} [parent=window]  Объект, в котором будут создаваться области видимости.
 * @param {Object} [finalObj={}]  Объект, который будет записан на место последней области видимости.
 */
function ns(path, parent, finalObj) {
    var parts = path.split('.'),
        ns = parent || window;
    for (var i = 0, len = parts.length - 1; i < len; i++) {
        var part = parts[i];
        if (part) {
            ns = ns[part] = ns[part] || {};
        }
    }
    part = parts[i];
    // BUGFIX: тут иногда коробит IE ( window['document'] = undefined || window['document'] || {}; )
    try {
        ns[part] = finalObj || ns[part] || {};
    } catch(e) {}
    return ns[part];
}

qb.ns = ns;