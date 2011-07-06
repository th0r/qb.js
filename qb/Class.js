qb.module('Class', function(qb, document, window, undefined) {

  function Empty() {}

  function Class(info) {
    var Name = info.Name,
        Extends = info.Extends,
        Implements = Array.from(info.Implements),
        Static = info.Static;

    var constructor = function() {
      var self = this;
      // Вызов конструкторов примесей (для добавления необходимых атрибутов создаваемому объекту)
      // Вызываем даже в вызове конструктора примесей, т.е. если примесь имплементит другую примесь,
      // будет вызван конструктор этой другой примеси TODO: 1) правильно ли? (связано с 2)
      //if( self instanceof constructor ) {
      Implements.forEach(function(Mixin) {
        Mixin.call(this);
      }, self);
      //}

      // Вызов собственного конструктора
      if (self.init) {
        self.init.apply(self, arguments);
      }
    };

    // Статичные атрибуты
    if (Static) {
      qb.merge(constructor, Static, true);
    }
    // Наследование (часть 1)
    var proto = constructor.prototype;
    if (Extends) {
      Empty.prototype = Extends.prototype;
      proto = constructor.prototype = new Empty();
    }
    // Примеси
    Implements.forEach(function(Mixin) {
      // Мержим всю ветку прототипов, а не конкретный прототип примеси TODO: 2) правильно ли?
      qb.merge(this, Mixin.prototype, false/*true*/, true);
    }, proto);
    // Собственные атрибуты
    delete info.Name;
    delete info.Extends;
    delete info.Implements;
    delete info.Static;
    qb.merge(proto, info, true);
    proto.constructor = constructor;
    // Наследование (часть 2)
    if (Extends) {
      proto.$parent = Extends;
      proto.$parentProto = Extends.prototype;
    }
    // Название класса
    if (Name) {
      constructor.toString = Function.from(Name);
    }

    return constructor;
  }

  return Class;

});