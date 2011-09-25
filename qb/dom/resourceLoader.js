(function(qb, document) {

  var headElem = document.getElementsByTagName('head')[0];

  function loadCSS(src) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = src;
    headElem.appendChild(css);
    return css;
  }

  qb.loadCSS = loadCSS;

})(qb, document);
