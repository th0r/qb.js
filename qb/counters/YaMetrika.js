qb.require('//mc.yandex.ru/metrika/watch.js', 'Ya.Metrika; qb: Class, ns; def', function(Metrika, Class, ns, qb, document, window) {

  var YaMetrika = new Class({
    Name: 'YaMetrika',
    Extends: Metrika,

    init: function() {
      Metrika.apply(this, arguments);
    },
    send: function(params) {
      this.hit.call(this, window.location.href, document.title, null, params);
    }
  });

  ns('counters.YaMetrika', qb, YaMetrika);

}, 'qb/counters/YaMetrika');