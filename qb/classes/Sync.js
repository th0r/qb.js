qb.module('classes.Sync', 'Class, classes.Events', function(Class, Events, qb, document, window, undefined) {

  var Sync =  new Class({
    Name: 'Sync',
    Implements: Events,
    init: function(events) {
      var self = this;
      self.counter = 0;
      self.addEvents(events);
    },
    wrap: function(fn) {
      var self = this;
      self.counter++;
      return function() {
        fn.apply(this, arguments);
        if (--self.counter == 0) {
          self.fireEvent('onSuccess');
        }
      }
    }
  });

  return Sync;

});