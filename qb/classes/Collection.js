(function(qb, Class) {

    var Collection = new Class({
        Name: 'Collection',
        Extends: Array,

        init: function(/*items=[]*/) {
            if (Array.is(arguments[0])) {
                this.append(arguments[0]);
            }
        }
    });

    qb.ns('classes.Collection', qb, Collection);

})(qb, qb.Class);