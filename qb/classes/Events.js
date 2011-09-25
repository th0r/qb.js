(function(Class, each, qb, undefined) {

  qb.Events = new Class({

    Name: 'Events',
    init: function(/*events=null*/) {
      var events = arguments[0] || null;
      this.$events = this.$events || {};
      if (events) {
        this.addEvents(events);
      }
    },
    addEvent: function(name, handler) {
      var events = this.$events;
      events[name] = events[name] || [];
      events[name].push(handler);
      return this;
    },
    addEvents: function(eventsObj) {
      if (eventsObj) {
        var events = this.$events;
        each(eventsObj, function(val, name) {
          events[name] = events[name] || [];
          events[name][ Array.is(val) ? 'append' : 'push' ](val);
        });
      }
      return this;
    },
    removeEvent: function(name, handler) {
      var events = this.$events[name];
      if (events && events.length) {
        events.erase(handler);
      }
      return this;
    },
    removeEvents: function(name) {
      delete this.$events[name];
      return this;
    },
    removeAllEvents: function() {
      this.$events = {};
      return this;
    },
    fireEvent: function(name/*, args=null, thisObj=self*/) {
      var self = this,
          handlers = self.$events[name];
      if (handlers && handlers.length) {
        var args = arguments[1] || [],
            thisObj = (arguments[2] === undefined) ? self : arguments[2];
        for (var i = 0, len = handlers.length; i < len; i++) {
          handlers[i].apply(thisObj, args);
        }
      }
      return self;
    }
  });

})(qb.Class, qb.each, qb);