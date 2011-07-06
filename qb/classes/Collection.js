qb.module('classes.Collection', 'Class', function(Class, qb, document, window, undefined) {

  var Collection = new Class({
    Name: 'Collection',
    Extends: Array,
    init: function(/*items=[]*/) {
      if (Array.is(arguments[0])) {
        this.append(arguments[0]);
      }
    }
  });

  return Collection;

});