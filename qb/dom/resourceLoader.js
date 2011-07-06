qb.module('dom.resourceLoader', function(qb, document, window, undefined) {

  var headElem = document.getElementsByTagName('head')[0];

  function loadCSS(src) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = src;
    headElem.appendChild(css);
    return css;
  }

  // TODO: не работает в opera 9.64, так как вызывается 3 события с readyState = 'loaded'. Также, вроде бы, изредка не работает в IE6.
  function loadJS(src/*, loadCallback=null*/) {
    var loadCallback = Function.check(arguments[1]),
        script = document.createElement('script');
    if (loadCallback) {
      var handler = function() {
        script.onreadystatechange = script.onload = null;
        loadCallback();
      };
      script.onreadystatechange = function() {
        if (this.readyState == 'loaded' || this.readyState == 'complete') {
          handler();
        }
      };
      script.onload = handler;
    }
    headElem.appendChild(script);
    script.src = src;
    return script;
  }

  return {
    loadJS: loadJS,
    loadCSS: loadCSS
  }

});