qb.require('qb/classes/Events', 'qb: Class, Events; qb', function(Class, Events, qb) {

  qb.Sync = new Class({
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
        if (!--self.counter) {
          self.triggerEvent('onSuccess');
        }
      }
    }
  });

}, 'qb/classes/Sync');