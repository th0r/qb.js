/**
 * DOM-консоль для отладки скриптов.
 * Удобно использовать в браузерах с отсутствующей/неудобной/неинформативной консолью.
 * Управление:
 *   - (Клик на контроле со стрелкой) - скрытие/раскрытие консоли
 *   - (Ctrl/Cmd + Клик на контроле со стрелкой) - смена положения консоли (сверху/справа)
 *   - (Ctrl/Cmd + Движение мышью над консолью) - изменение размера консоли
 */
qb.require('qb/storage; CSS/qb/debug.css', 'qb.storage', function(storage) {

    var CONSOLE_HIDDEN_CLASS = 'qb-console-wrap-hidden',
        CONSOLE_VERT_CLASS = 'qb-console-wrap-vert',
        CONSOLE_HIDDEN_VERT_CLASS = 'qb-console-wrap-vert-hidden',
        TOGGLE_ARROWS = [['&uArr;', '&dArr;'], ['&lArr;', '&rArr;']],
        STORAGE_HIDDEN = 'qb-console-hidden',
        STORAGE_VERT = 'qb-console-vertical',
        STORAGE_SIZE = 'qb-console-size',
        INNER_TEXT_SUPPORT = null,
        consoleVisible = !storage.has(STORAGE_HIDDEN),
        consoleVertical = storage.has(STORAGE_VERT),
        consoleSize = storage.get(STORAGE_SIZE, true) || 300;

    function toggleClass(elem, className, flag) {
        var classes = elem.className.split(' ');
        flag ? classes.include(className) : classes.erase(className);
        elem.className = classes.join(' ');
    }

    function toggleConsole(flag, save) {
        flag = (typeof flag === 'boolean') ? flag : !consoleVisible;
        consoleVisible = flag;
        setSize(flag ? consoleSize : null);
        toggleClass(consoleWrap, CONSOLE_HIDDEN_CLASS, !flag);
        toggleClass(consoleWrap, CONSOLE_HIDDEN_VERT_CLASS, consoleVertical && !flag);
        var lastChild = consoleElem.lastChild;
        lastChild && lastChild.scrollIntoView(true);
        if (save) {
            storage[flag ? 'remove' : 'set'](STORAGE_HIDDEN);
        }
        toggler.innerHTML = TOGGLE_ARROWS[+consoleVertical][+flag];
    }

    function makeVertical(flag, save) {
        flag = (typeof flag === 'boolean') ? flag : !consoleVertical;
        if (consoleVertical !== flag) {
            setSize(null);
            consoleVertical = flag;
            setSize(consoleSize);
        }
        toggleClass(consoleWrap, CONSOLE_VERT_CLASS, flag);
        toggleConsole(consoleVisible);
        if (save) {
            flag ? storage.set(STORAGE_VERT) : storage.remove(STORAGE_VERT);
        }
    }

    function setSize(size) {
        var reset = (size === null);
        if (!reset) {
            consoleSize = size;
        }
        consoleWrap.style[consoleVertical ? 'width' : 'height'] = reset ? '' : size + 'px';
    }

    // Создаем DOM-элемент консоли
    var tempElem = document.createElement('div');
    INNER_TEXT_SUPPORT = ('innerText' in tempElem);
    tempElem.innerHTML = '<div class="qb-console-wrap"><div class="qb-console"></div><div class="qb-console-toggle"></div></div>';
    var consoleWrap = tempElem.firstChild,
        consoleElem = consoleWrap.firstChild,
        toggler = consoleElem.nextSibling;
    tempElem = null;
    makeVertical(consoleVertical);
    toggler.onclick = function(e) {
        e = e || event;
        (e.ctrlKey || e.metaKey) ? makeVertical(null, true) : toggleConsole(null, true);
    };
    // Обработка увеличения размера консоли
    var coord0 = null,
        height0 = null;
    consoleWrap.onmousemove = function(e) {
        if (consoleVisible) {
            e = e || event;
            var coord = consoleVertical ? 'pageX' : 'pageY',
                withModifier = (e.metaKey || e.ctrlKey);
            if (coord0) {
                var newSize = height0 + coord0 - e[coord];
                if (withModifier) {
                    // Изменяем размер консоли
                    setSize(newSize);
                } else {
                    coord0 = null;
                    // Запоминаем размер
                    storage.set(STORAGE_SIZE, newSize);
                }
            } else if (withModifier) {
                coord0 = e[coord];
                height0 = consoleWrap[consoleVertical ? 'offsetWidth' : 'offsetHeight'];
            }
        }
    };
    qb.ready(function() {
        document.body.appendChild(consoleWrap);
    });

    var timers = {},
        config = qb.config.debug = {
            depth: 3,
            indent: 2
        };

    var qbConsole = {
        log: function() {
            var msg = [];
            qb.each(arguments, function(arg) {
                msg.push(Object.dump(arg, config.depth, config.indent));
            });
            msg = msg.join('\n\n');
            var line = document.createElement('div');
            line.className = 'qb-console-line';
            if (INNER_TEXT_SUPPORT) {
                line.innerText = msg;
            } else {
                line.appendChild(document.createTextNode(msg));
            }
            consoleElem.appendChild(line);
            line.scrollIntoView(true);
        },

        time: function(name) {
            timers[name] = Date.now();
        },

        timeEnd: function(name) {
            if (name in timers) {
                var time = Date.now() - timers[name];
                this.log('{name}: {time}ms'.format({
                    name: name,
                    time: time
                }));
                delete timers[name];
            }
        }
    };

    qb.merge(qb, qbConsole);

}, 'qb/debug');