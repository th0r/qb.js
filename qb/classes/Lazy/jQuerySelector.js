qb.module('classes.Lazy.jQuerySelector', 'Class; classes.Lazy; jQuery', function(Class, Lazy, qb, document, window) {

  var jQuerySelector = new Class({
    Name: 'LazyjQuerySelector',
    Extends: Lazy,
    action: function() {
      return $(this.value);
    }
  });

  return jQuerySelector;

});