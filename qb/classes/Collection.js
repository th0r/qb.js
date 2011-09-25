qb.Collection = new qb.Class({
  Name: 'Collection',
  Extends: Array,
  init: function(/*items=[]*/) {
    if (Array.is(arguments[0])) {
      this.append(arguments[0]);
    }
  }
});