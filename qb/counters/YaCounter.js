(function(qb, ns, Class, Script, document, window) {

  var YaCounter = new Class({
    Name: 'YaCounter',
    Extends: Script,

    init: function(params) {
      Script.call(this, '//mc.yandex.ru/metrika/watch.js', true);
      this.onload(function() {
        this.counter = new Ya.Metrika(params);
      })
    },
    hit: function(params) {
      this.onload(function() {
        this.counter.hit(window.location.href, document.title, null, params);
      });
    }
  });

  ns('counters.YaCounter', qb, YaCounter);

})(qb, qb.ns, qb.Class, qb.Script, document, window);