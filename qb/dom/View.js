qb.require('jquery', 'qb: each, Class; qb; jQuery; document', function(each, Class, qb, $, document, undefined) {

  /*
   * Usage:
   *
   *  HTML:
   *  <div id="itemTmpl" class="hidden">
   *		<div class="icon">
   *			<img src="" alt="">
   *		</div>
   *		<div class="info">
   *			<span class="name">Item</span>
   *			<span class="descr">Description</span>
   *		</div>
   *		<span class="price-usa">$100</span>
   *		<span class="price-rus">3000 руб</span>
   *	</div>
   *
   *  JS:
   *  var $item = new View({
   *		holder: '{*} #itemTmpl',
   *		icon: '{iconWrap} > img',
   *		iconWrap: '{>}.icon',
   *		data: {
   *			holder: '{>} .info',
   *			name: '{parent.data|>} .name',
   *			description: '.descr',
   *			prices: {
   *				usa: '{root|>} .price-usa',
   *				rus: '{root} .price-rus'
   *			}
   *		}
   *	}).useAsTemplate('hidden');
   *
   *	for( var i = 0, len = 100; i < len; i++ ) {
   *		$item.cloneView().$holder.appendTo(document.body);
   *	}
   /*

   /*----------   ViewError   ----------*/
  var ViewError = new Class({
    Name: 'ViewError',
    Static: {
      NO_SUCH_HANDLER: 'Can\'t find handler "{handler}"',
      NO_SUCH_CONTEXT: 'Can\'t find context "{context}"',
      CLONE_HOLDER_MISSING: 'Can\'t clone view without holder',
      TEMPLATE_HOLDER_MISSING: 'View must have it\'s own holder to be used as template'
    },
    Extends: Error,
    init: function(name/*, data=null*/) {
      var self = this,
          data = arguments[1] || null;
      self.code = name;
      self.name = 'VIEWERROR_' + name;
      var message = ViewError[name].format(data),
          dump = '';
      each(data, function(val, prop) {
        dump += prop + ' = "' + (val instanceof $ ? val.selector : String(val)) + '";\n';
      }, true);
      if (dump) {
        message += '\n\nError info dumb:\n' + dump
      }
      self.message = message;
    }
  });

  /*----------   View   ----------*/
  function $_(prop) {
    return '$' + prop;
  }

  var $DOC = $(document),
      HOLDER_PROP = 'holder',
      $HOLDER_PROP = $_(HOLDER_PROP),
      UNTOUCHED_PROPS = ['parent'];

  var View = new Class({
    Name: 'View',
    Static: {
      handlers: {
        '>': 'children'
      },
      contexts: {
        '*': $DOC
      }
    },
    init: function(map/*, ParentView=null*/) {
      var self = this,
          hp = HOLDER_PROP,
          $hp = $HOLDER_PROP;

      var parent = self.parent = arguments[1] || null,
          holder = self.getHolder();
      self.delayed = [];
      self.childs = [];
      self.map = map;

      // Ищем holder
      if (map.hasOwnProperty(hp)) {
        var _holder = map[hp];
        if (_holder instanceof $) {
          // Поддержка self.cloneView()
          holder = self[$hp] = _holder;
        } else {
          holder = self.findElemBySelector(_holder, holder, $hp);
        }
        delete map[hp];
      }
      // Ищем элементы
      each(map, function(part, name) {
        var $name = $_(name);
        if (Object.is(part)) {
          self.childs.push(self[$name] = new View(part, self));
        } else if (typeof part == 'string') {
          self.findElemBySelector(part, holder, $name);
        }
      });
      // Выполняем отложенные действия (начинаем с коренного элемента)
      if (!parent) {
        self.findDelayedElems();
      }
    },
    getHolder: function() {
      var self = this;
      return self[$HOLDER_PROP] || ( self.parent && self.parent.getHolder() ) || $DOC;
    },
    getOwnHolder: function() {
      return this[$HOLDER_PROP] || null;
    },
    getRoot: function() {
      var view = this;
      while (view.parent) {
        view = view.parent;
      }
      return view;
    },
    findElemBySelector: function(selector, holder, $prop) {
      var self = this,
          delayed = false,
          info = {
            $prop: $prop,
            originalSelector: selector,
            context: holder,
            handler: 'find'
          },
          contexts = View.contexts,
          handlers = View.handlers;
      // Определяем контекст и функцию поиска
      selector = selector.replace(/^\{(.+?)(?:\|(.+?))?\}/, function(_, _context, _handler) {
        var change = {
          context: true,
          handler: true
        };
        // Пытаемся понять, что же мы нашли
        if (!_handler) {
          // Если получили упрощенное выражение (без разделителя)
          if (handlers[_context]) {
            // Это - хэндлер
            change.context = false;
            _handler = _context;
          } else {
            // Значит - контекст
            change.handler = false;
          }
        }
        // Изменяем параметры
        if (change.handler) {
          if (handlers[_handler]) {
            info.handler = handlers[_handler];
          } else {
            info.handler = _handler;
            throw new ViewError('NO_SUCH_HANDLER', info);
          }
        }
        if (change.context) {
          if (contexts[_context]) {
            // Нашли простой контекст
            info.context = contexts[_context];
          } else {
            // Получили сложный контекст. Если это не холдер, то откладываем поиск данного элемента.
            delayed = ($prop !== $HOLDER_PROP);
            info.context = _context;
          }
        }
        return '';
      });
      info.selector = selector;
      if (delayed) {
        self.delayed.push(info);
        return null;
      } else {
        return self.findElemByInfo(info);
      }
    },
    findElemByInfo: function(info) {
      var self = this;
      if (typeof info.context == 'string') {
        // Ищем контекст по строке
        var context = self.getContextElem(info.context);
        if (!context) {
          throw new ViewError('NO_SUCH_CONTEXT', info);
        } else {
          info.context = context;
        }
      }
      return ( self[info.$prop] = info.context[info.handler](info.selector) );
    },
    findDelayedElems: function() {
      var self = this,
          delayed = self.delayed,
          childs = self.childs;
      // Ищем отложенные элементы
      delayed.forEach(self.findElemByInfo, self);
      delete self.delayed;
      // Ищем отложенные у детей
      childs.forEach(function(child) {
        child.findDelayedElems();
      });
    },
    getContextElem: function(name) {
      // Пытаемся найти данный элемент
      try {
        name = name.split('.');
        var obj = this;
        if (name[0] == 'root') {
          obj = this.getRoot();
          name.shift();
        }
        name.forEach(function(prop) {
          obj = obj[ UNTOUCHED_PROPS.contains(prop) ? prop : $_(prop) ];
        });
        if (obj instanceof View) {
          return obj.getHolder();
        } else if (obj instanceof $) {
          return obj;
        } else {
          return null;
        }
      } catch(e) {
        return null;
      }
    },
    /*
     cloneView: Функция получения клона вьюхи. Удобно для получения item-ов из шаблона-вьюхи.
     Для того, чтобы вьюха была успешно склонирована и все ее дочерние элементы нашлись правильно, она должна соблюдать следующие условия:
     1) У нее должен быть собственный холдер.
     2) Элементы вьюхи не должны ссылаться на элементы родительских вьюх.
     3) У элементов вьюхи не должно присутствовать атрибутов id.
     */
    cloneView: function(/*withEvents=false*/) {
      var self = this,
          holder = self.getOwnHolder();
      if (!holder) {
        throw new ViewError('CLONE_HOLDER_MISSING');
      }
      var map = $.extend(true, {}, self.map),
          withEvents = !!arguments[0];
      map.holder = holder.clone(withEvents, withEvents);
      return new View(map);
    },
    /*
     useAsTemplate: Функция подготавливает вьюху для использования в качестве шаблона (вызова cloneView).
     Эта функция делает следующее:
     1) Удаляет у всех элементов вьюхи (включая холдер) атрибут id.
     2) Опционально удаляет у холдера указанные классы (удобно, например, для удаления класса, изначально скрывающего холдер)
     3) Опционально выдирает холдер из DOM
     */
    useAsTemplate: function(/*removeClasses='', detachFromDom=true*/) {
      var self = this,
          holder = self.getOwnHolder();
      if (!holder) {
        throw new ViewError('TEMPLATE_HOLDER_MISSING');
      }
      var removeClasses = arguments[0] || '',
          detachFromDom = (arguments[1] === undefined) ? true : !!arguments[1];
      holder.find('*').andSelf().removeAttr('id');
      if (detachFromDom) {
        holder.detach();
      }
      if (removeClasses) {
        holder.removeClass(removeClasses);
      }
      return self;
    }
  });

  qb.View = View;

}, 'qb/dom/View');