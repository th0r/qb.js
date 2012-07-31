/*----------   Расширение Date   ----------*/
merge(Date, {
    now: function () {
        return +new Date();
    },
    isDate: function (obj) {
        return (toString(obj) === '[object Date]');
    }
}, false, true);
Date.is = Date.isDate;