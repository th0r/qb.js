/*----------   Реализация deferred-а DOMReady (аналог $(document).ready) ----------*/
var DOMReady = new Deferred(),
    windowLoad = new Deferred(),
    ready = DOMReady.resolve.bind(DOMReady),
    winLoaded = windowLoad.resolve.bind(windowLoad);

if (document.readyState === 'complete') {
    ready();
    winLoaded();
} else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', ready, false);
    window.addEventListener('load', winLoaded, false);
} else if (document.attachEvent) {
    var loaded = function () {
        if (document.readyState === 'complete') {
            ready();
        }
    };
    document.attachEvent('onreadystatechange', loaded);
    window.attachEvent('onload', winLoaded);
    // Хак для мониторинга загрузки DOM в IE
    try {
        var toplevel = (window.frameElement == null);
    } catch(e) {}

    if (toplevel && document.documentElement.doScroll) {
        (function () {
            try {
                document.documentElement.doScroll('left');
            } catch(e) {
                window.setTimeout(arguments.callee, 10);
                return;
            }
            loaded();
        })();
    }
}

qb.ready = DOMReady.done.bind(DOMReady);
qb.load = windowLoad.done.bind(windowLoad);