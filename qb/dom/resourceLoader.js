(function(qb, Script, document) {

  var headElem = document.getElementsByTagName('head')[0];

  function getCSS(src) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = src;
    headElem.appendChild(css);
    return css;
  }

  function getJS(src, callbacks) {
    return new Script(src, true).onload(callbacks);
  }

  qb.getCSS = getCSS;
  qb.getJS = getJS;

})(qb, qb.Script, document);
