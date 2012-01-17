qb.require('jquery; qb/classes/Lazy', 'jQuery; qb.classes.Lazy; qb', function($, Lazy, qb) {

    var LazyjQuerySelector = new qb.Class({
        Name: 'LazyjQuerySelector',
        Extends: Lazy,

        init: function() {
            Lazy.apply(this, arguments);
        },
        action: function() {
            return $(this.value);
        }
    });

    qb.ns('classes.LazyjQuerySelector', qb, LazyjQuerySelector);

    window.$$ = function(selector) {
        return new LazyjQuerySelector(selector);
    }

}, 'qb/classes/LazyjQuerySelector');