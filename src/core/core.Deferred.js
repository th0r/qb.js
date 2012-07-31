/*----------   Реализация Deferred   ----------*/
var DEFERRED_STATUS = {
    UNRESOLVED: 0,
    RESOLVED: 1,
    REJECTED: 2
};

function makeCallbackMethod(prop, callStatus) {
    return function (callbacks) {
        var status = this.$status;
        if (this.isUnresolved()) {
            this[prop].append(Array.from(callbacks));
        } else if (status === callStatus || callStatus === true) {
            this._callDeferredCallbacks(callbacks);
        }
        return this;
    }
}

function makeResolveMethod(prop, resolveStatus) {
    return function (/*args*/) {
        if (this.isUnresolved()) {
            this.$status = resolveStatus;
            this.$args = Array.slice(arguments);
            this._callDeferredCallbacks(this[prop].concat(this.$always));
            delete this.$done;
            delete this.$fail;
            delete this.$always;
        }
        return this;
    }
}

function makeResolveWithMethod(method) {
    return function (thisObj/*, args*/) {
        if (this.isUnresolved()) {
            this.$with = thisObj;
            return this[method].apply(this, Array.slice(arguments, 1));
        }
    }
}

var Deferred = new Class({
    Name: 'Deferred',
    Static: merge({
        when: function (/*deferreds*/) {
            var result = new Deferred(),
                defs = Array.slice(arguments),
                unresolved = defs.length,
                args = [];

            function fail() {
                var args = Array.slice(arguments);
                args.unshift(this);
                result.reject.apply(result, args);
            }

            defs.forEach(function (def, i) {
                if (def instanceof Deferred) {
                    def.done(function () {
                        args[i] = Array.slice(arguments);
                        if (!--unresolved) {
                            result.resolve.apply(result, args);
                        }
                    });
                    def.fail(fail);
                } else {
                    args[i] = def;
                    unresolved--;
                }
            });
            if (!unresolved) {
                result.resolve.apply(result, args);
            }
            return result;
        }
    }, DEFERRED_STATUS),

    init: function () {
        this.$done = [];
        this.$fail = [];
        this.$always = [];
        this.$status = DEFERRED_STATUS.UNRESOLVED;
        this.$with = this;
        this.$args = null;
    },
    _callDeferredCallbacks: function (callbacks) {
        var thisObj = this.$with,
            args = this.$args;
        Array.from(callbacks).forEach(function (callback) {
            callback.apply(thisObj, args);
        });
    },
    done: makeCallbackMethod('$done', DEFERRED_STATUS.RESOLVED),
    fail: makeCallbackMethod('$fail', DEFERRED_STATUS.REJECTED),
    then: function (doneCallbacks, failCallbacks) {
        return this.done(doneCallbacks).fail(failCallbacks);
    },
    always: makeCallbackMethod('$always', true),
    resolve: makeResolveMethod('$done', DEFERRED_STATUS.RESOLVED),
    resolveWith: makeResolveWithMethod('resolve'),
    reject: makeResolveMethod('$fail', DEFERRED_STATUS.REJECTED),
    rejectWith: makeResolveWithMethod('reject'),
    pipe: function (doneFilter, failFilter) {
        var result = new Deferred();
        [doneFilter, failFilter].forEach(function (filter, i) {
            if (Function.is(filter)) {
                this[i ? 'fail' : 'done'](function () {
                    var args = Array.from(filter.apply(this, arguments));
                    args.unshift(this);
                    result[(i ? 'reject' : 'resolve') + 'With'].apply(result, args);
                });
            }
        }, this);
        return result;
    }
});

// Делаем методы isResolved, isRejected и isUnresolved
each(DEFERRED_STATUS, function (statusVal, statusName) {
    this['is' + statusName.toLowerCase().capitalize()] = function () {
        return this.$status === statusVal;
    }
}.bind(Deferred.prototype));

qb.Deferred = Deferred;
qb.when = Deferred.when;