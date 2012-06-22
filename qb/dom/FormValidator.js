qb.require('jQuery', 'jQuery; def', function($, qb, document, window) {

    var FormValidatorField = new qb.Class({
        Name: 'FormValidatorField',
        init: function(nodes, rules, validators) {
            this.$nodes = $(nodes);
            this.type = null;
            this.rules = rules;
            this.validators = validators;
            this._fillFieldInfo();
        },
        value: function() {
            var val = this._getValue();
            if (val.length === 1) {
                val = val[0];
            } else if (!val.length) {
                val = null;
            }
            return val;
        },
        validate: function() {
            var self = this,
                val = this.value(),
                errors = {},
                rules = this.rules;
            if (rules && rules.debug) {
                delete rules.debug;
                debugger;
            }
            qb.each(this.rules, function(arg, rule) {
                var validator = self.validators[rule];
                if (!validator) {
                    throw 'There is no validator with name "' + rule + '"';
                }
                var error = validator.check(val, arg, self);
                if (error) {
                    errors[rule] = error.format({
                        val: val,
                        arg: arg
                    });
                }
            });
            return $.isEmptyObject(errors) ? true : errors;
        },
        _getCheckboxValue: function() {
            var val = [];
            this.$nodes.each(function(i, el) {
                if (el.checked && !el.disabled) {
                    val.push(el.value);
                }
            });
            return val;
        },
        _getSelectValue: function() {
            var val = [];
            $nodes.not(':disabled').find('option').each(function(i, el) {
                if (el.selected && !el.disabled) {
                    val.push(el.value);
                }
            });
            return val;
        },
        _getInputValue: function() {
            return [this.$nodes.val()];
        },
        _fillFieldInfo: function() {
            var node = this.$nodes[0],
                tag = node.tagName.toLowerCase(),
                type = this.type = (tag === 'input') ? node.getAttribute('type') : tag;
            if (type === 'radio' || type === 'checkbox') {
                this._getValue = this._getCheckboxValue;
            } else if (type === 'select') {
                this._getValue = this._getSelectValue;
            } else {
                this._getValue = this._getInputValue;
            }
        }
    });

    var FormValidator = new qb.Class({
        Name: 'FormValidator',
        Static: {
            addTypes: function(types) {
                qb.merge(this.getTypes(), types);
            },
            getTypes: function() {
                return this.prototype.types;
            },
            addValidators: function(validators) {
                qb.merge(this.getValidators(), validators);
            },
            getValidators: function() {
                return this.prototype.validators;
            },
            /**
             * Ищет все формы с атрибутом "data-qb-validate" и включает для них валидацию.
             * Правила валидации берутся из атрибута "data-qb-validate" соответствующих полей формы.
             */
            activate: function() {
                $('form[data-qb-validate]').each(function() {
                    new FormValidator(this);
                });
            }
        },

        validators: {},
        types: {},

        init: function(form, rules, opts) {
            var self = this;
            this.$form = $(form);
            // Если правила не указаны, то берем их с самих элементов.
            if (!rules) {
                rules = {};
                this.$form.find('[data-qb-validate]').attr('data-qb-validate', function(i, rule) {
                    var name = this.getAttribute('name');
                    rules[name] = rules[name] || self._parseAttr(rule);
                });
            }
            this.rules = rules;
            this.opts = opts || {};
            this.$form.data('qb-validator', this);
        },

        _parseAttr: function(str) {
            try {
                return eval('({' + str + '})');
            } catch(e) {
                return str.parse();
            }
        },

        /**
         * Вызывает валидатор для проверки значения.
         * Все аргумены после имени валидатора будут переданы этому валидатору.
         * @param {String} validator  Имя валидатора
         * @return {Boolean}  Если такой валидатор есть, возвращается результат проверки.
         *                    Если валидатора нет, но возвращается false
         */
        check: function(validator) {
            validator = this.validators[validator];
            return validator ? validator.apply(this, Array.slice(arguments, 1)) : false;
        },

        validate: function() {
            var self = this,
                form = this.$form[0],
                errors = {};
            qb.each(this.rules, function(fieldRules, fieldName) {
                var fields = form[fieldName];
                if (fields) {
                    // Проверяем, не создан ли уже валидатор для этих полей
                    var $field = $(fields),
                        field = $field.data('qb-validator-field');
                    if (!field) {
                        // Создаем валидатор для полей
                        // Получаем набор правил
                        if (typeof fieldRules === 'string') {
                            // Получили название типа
                            fieldRules = self.types[fieldRules];
                        } else {
                            // Получили объект
                            if (fieldRules.type) {
                                // Экстендим правила типа этими правилами
                                fieldRules = $.extend({}, self.types[fieldRules.type], fieldRules);
                                delete fieldRules.type;
                            }
                        }
                        field = new FormValidatorField(fields, fieldRules, self.validators);
                        $field.data('qb-validator-field', field);
                    }
                    // Валидация поля
                    var fieldErrors = field.validate();
                    if (fieldErrors !== true) {
                        errors[fieldName] = fieldErrors;
                        if (self.opts.lazy) {
                            return false;
                        }
                    }
                }
            }, true);
            return $.isEmptyObject(errors) ? true : errors;
        }
    });

    FormValidator.addValidators({
        /**
         * Валидация в зависимости от типа поля:
         *   - text: Минимальное кол-во символов в значении
         *   - radio, checkbox, select: Минимальное кол-во выбранных элементов
         */
        min: {
            errors: {
                radio: 'Выделите хотя бы одну опцию',
                text: 'Минимальное кол-во символов в этом поле: {arg}.',
                items: 'Минимальное кол-во выделенных опций: {arg}.'
            },
            check: function(val, arg, field) {
                var type = field.type;
                if (type === 'radio') {
                    if (val === null) {
                        var error = this.errors.radio;
                    }
                } else {
                    var itemsType = (type === 'checkbox' || type === 'select');
                    if (itemsType) {
                        val = Array.from(val);
                    }
                    if (!val || val.length < arg) {
                        error = this.errors[itemsType ? 'items' : 'text'];
                    }
                }
                return error;
            }
        },
        max: {
            errors: {
                text: 'Максимальное кол-во символов в этом поле: {arg}.',
                items: 'Максимальное кол-во выделенных опций: {arg}.'
            },
            check: function(val, arg, field) {
                var type = field.type,
                    itemsType = (type === 'checkbox' || type === 'select');
                if (itemsType) {
                    val = Array.from(val);
                }
                if (type !== 'radio' && val && val.length > arg) {
                    var error = this.errors[(field.type === 'checkbox' || field.type === 'select') ?
                                            'items' : 'text'];
                }
                return error;
            }
        },
        /**
         * Матчит значение поля на RegExp
         * @param val
         * @param {RegExp|String} arg  Если указана строка, то возьмется match из соответствующего типа
         * @return {Boolean}
         */
        match: function(val, arg) {
            if (typeof val === 'string') {
                // Ищем тип val и юзаем его match
                var type = this.types[arg];
                return (type && type.match) ? this.check('match', val, type.match) : false;
            } else {
                return (arg && arg.test) ? arg.test(val) : false;
            }
        }
    });

    qb.ns('dom.FormValidator', qb, FormValidator);

}, 'qb/dom/FormValidator');