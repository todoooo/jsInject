'use strict';

(function (w) {

    var stack = {},
        isArray = function (arr) {
            return Object.prototype.toString.call(arr) === '[object Array]';
        };

    function JsInject () {
        this.container = {};
    }

    JsInject.ERROR_RECURSION = 'Recursive failure : Circular reference for dependency ';
    JsInject.ERROR_REGISTRATION = 'Already registered.';
    JsInject.ERROR_ARRAY = 'Must pass array.';
    JsInject.ERROR_FUNCTION = 'Must pass function to invoke.';
    JsInject.ERROR_SERVICE = 'Service does not exist.';

    JsInject.prototype.get = function(name, selector) {
        var wrapper = this.container[name];       
        if (wrapper) {
            if (selector) {
                wrapper = wrapper[selector];
            }
            else {
                if (typeof wrapper === 'object')
                {   
                    var result = {}; 
                    Object.keys(wrapper).forEach(function(item) { result[item] = wrapper[item](); });
                    return result;
                }
            }
            
            if (wrapper) {
                return wrapper();                
            }
            else {
                throw JsInject.ERROR_SERVICE;                
            }
        }
        throw JsInject.ERROR_SERVICE;
    };

    JsInject.prototype.invoke = function (fn, deps, instance, name) {
        var i = 0,
            args = [];
        if (stack[name]) {
            throw JsInject.ERROR_RECURSION + name + " : " + JSON.stringify(Object.keys(stack));
        }
        
        stack[name] = instance; 
        for (; i < deps.length; i += 1) {
            args.push(this.get(deps[i]));
        }
        delete stack[name];
        
        return fn.apply(instance, args);
    };

    JsInject.prototype.register = function (name, dependencyArray, constructor, selector) {
        if (!isArray(dependencyArray)) {
            throw JsInject.ERROR_ARRAY;
        }
        
        var registered = this.container[name];
        if (registered) {
            if ((!selector) || (typeof registered !== 'object')) {
                throw JsInject.ERROR_REGISTRATION;                
            }
        }

        if (typeof constructor !== 'function') {
            throw JsInject.ERROR_FUNCTION;
        }

        var _this = this;
        var maker = function () {
            var Template = function () {},
                result = {},
                instance,
                deps = (dependencyArray.length == 0) ? (constructor.$$deps || []) : dependencyArray,
                injected;
            Template.prototype = constructor.prototype;
            instance = new Template();
            injected = _this.invoke(constructor, deps, instance, name);
            result = injected || instance;         
            var cached = function () {
                return result;
            };
                        
            if (selector) {
                _this.container[name][selector] = cached;              
            }
            else {
                _this.container[name] = cached;
            }
                        
            return result;
        };
        
        if (selector) {
            if (!registered) {
                registered = {};
                this.container[name] = registered;                
            }
            
            registered[selector] = maker;            
        }
        else {
            this.container[name] = maker;            
        }
    };

    function Wrapper() {
        var ioc = new JsInject(), _that = this;
        this.get = ioc.get.bind(ioc);
        this.register = ioc.register.bind(ioc);
        ioc.container['$$jsInject'] = function () {
            return _that;
        };
    }

    w.$$jsInject = Wrapper;
})(window);