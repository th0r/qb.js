qb.require('jQuery; qb/classes/Lazy', 'jQuery; qb: Class, Lazy; qb', function($, Class, Lazy, qb) {

  qb.$$ = new Class({
    Name: 'LazyjQuerySelector',
    Extends: Lazy,

    action: function() {
      return $(this.value);
    }
  });

}, 'qb/classes/Lazy/jQuerySelector');