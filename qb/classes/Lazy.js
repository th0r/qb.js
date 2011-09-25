(function(qb, Class) {

  qb.Lazy = new Class({
    Name: 'Lazy',

    init: function(value) {
      this.value = value;
    },
    change: function(value) {
      delete this.result;
      this.value = value;
    },
    action: function() {
      throw 'No action specified. You must override this method and return result using "this.value".';
    },
    get: function(/*forceAction=false*/) {
      if ( arguments[0] || !this.hasOwnProperty('result') ) {
        this.result = this.action();
      }
      return this.result;
    }
  });

})(qb, qb.Class);