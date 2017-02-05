var Base = function() {
    if (arguments.length) {
        if (this == window) { // cast an object to this class
            Base.prototype.extend.call(arguments[0], arguments.callee.prototype);
        } else {
            this.extend(arguments[0]);
        }
    }
};

Base.version = "1.0.2";

Base.prototype = {
    extend: function(source, value) {
        var extend = Base.prototype.extend;
        if (arguments.length == 2) {
            var ancestor = this[source];
            // overriding?
            if ((ancestor instanceof Function) && (value instanceof Function) &&
                ancestor.valueOf() != value.valueOf() && /\bbase\b/.test(value)) {
                var method = value;
                value = function() {
                    var previous = this.base;
                    this.base = ancestor;
                    var returnValue = method.apply(this, arguments);
                    this.base = previous;
                    return returnValue;
                };
                // point to the underlying method
                value.valueOf = function() {
                    return method;
                };
                value.toString = function() {
                    return String(method);
                };
            }
            return this[source] = value;
        } else if (source) {
            var _prototype = {toSource: null};
            // do the "toString" and other methods manually
            var _protected = ["toString", "valueOf"];
            // if we are prototyping then include the constructor
            if (Base._prototyping) _protected[2] = "constructor";
            for (var i = 0; (name = _protected[i]); i++) {
                if (source[name] != _prototype[name]) {
                    extend.call(this, name, source[name]);
                }
            }
            // copy each of the source object's properties to this object
            for (var name in source) {
                if (!_prototype[name]) {
                    extend.call(this, name, source[name]);
                }
            }
        }
        return this;
    },

    base: function() {
        // call this method from any other method to invoke that method's ancestor
    }
};

Base.extend = function(_instance, _static) {
    var extend = Base.prototype.extend;
    if (!_instance) _instance = {};
    // build the prototype
    Base._prototyping = true;
    var _prototype = new this;
    extend.call(_prototype, _instance);
    var constructor = _prototype.constructor;
    _prototype.constructor = this;
    delete Base._prototyping;
    // create the wrapper for the constructor function
    var klass = function() {
        if (!Base._prototyping) constructor.apply(this, arguments);
        this.constructor = klass;
    };
    klass.prototype = _prototype;
    // build the class interface
    klass.extend = this.extend;
    klass.implement = this.implement;
    klass.toString = function() {
        return String(constructor);
    };
    extend.call(klass, _static);
    // single instance
    var object = constructor ? klass : _prototype;
    // class initialisation
    if (object.init instanceof Function) object.init();
    return object;
};

Base.implement = function(_interface) {
    if (_interface instanceof Function) _interface = _interface.prototype;
    this.prototype.extend(_interface);
};



/**
*
*  Javascript sprintf
*  http://www.webtoolkit.info/
*
*
**/

var sprintfWrapper = {
    init : function () {

        if (typeof arguments == "undefined") { return null; }
        if (arguments.length < 1) { return null; }
        if (typeof arguments[0] != "string") { return null; }
        if (typeof RegExp == "undefined") { return null; }

        var string = arguments[0];
        var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
        var matches = new Array();
        var strings = new Array();
        var convCount = 0;
        var stringPosStart = 0;
        var stringPosEnd = 0;
        var matchPosEnd = 0;
        var newString = '';
        var match = null;

        while (match = exp.exec(string)) {
            if (match[9]) { convCount += 1; }

            stringPosStart = matchPosEnd;
            stringPosEnd = exp.lastIndex - match[0].length;
            strings[strings.length] = string.substring(stringPosStart, stringPosEnd);

            matchPosEnd = exp.lastIndex;
            matches[matches.length] = {
                match: match[0],
                left: match[3] ? true : false,
                sign: match[4] || '',
                pad: match[5] || ' ',
                min: match[6] || 0,
                precision: match[8],
                code: match[9] || '%',
                negative: parseFloat(arguments[convCount]) < 0 ? true : false,
                argument: String(arguments[convCount])
            };
        }
        strings[strings.length] = string.substring(matchPosEnd);

        if (matches.length == 0) { return string; }
        if ((arguments.length - 1) < convCount) { return null; }

        var code = null;
        var match = null;
        var i = null;

        for (i=0; i<matches.length; i++) {

            if (matches[i].code == '%') { substitution = '%' }
            else if (matches[i].code == 'b') {
                matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(2));
                substitution = sprintfWrapper.convert(matches[i], true);
            }
            else if (matches[i].code == 'c') {
                matches[i].argument = String(String.fromCharCode(parseInt(Math.abs(parseInt(matches[i].argument)))));
                substitution = sprintfWrapper.convert(matches[i], true);
            }
            else if (matches[i].code == 'd') {
                matches[i].argument = String(Math.abs(parseInt(matches[i].argument)));
                substitution = sprintfWrapper.convert(matches[i]);
            }
            else if (matches[i].code == 'f') {
                matches[i].argument = String(Math.abs(parseFloat(matches[i].argument)).toFixed(matches[i].precision ? matches[i].precision : 6));
                substitution = sprintfWrapper.convert(matches[i]);
            }
            else if (matches[i].code == 'o') {
                matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(8));
                substitution = sprintfWrapper.convert(matches[i]);
            }
            else if (matches[i].code == 's') {
                matches[i].argument = matches[i].argument.substring(0, matches[i].precision ? matches[i].precision : matches[i].argument.length)
                substitution = sprintfWrapper.convert(matches[i], true);
            }
            else if (matches[i].code == 'x') {
                matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
                substitution = sprintfWrapper.convert(matches[i]);
            }
            else if (matches[i].code == 'X') {
                matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
                substitution = sprintfWrapper.convert(matches[i]).toUpperCase();
            }
            else {
                substitution = matches[i].match;
            }

            newString += strings[i];
            newString += substitution;

        }
        newString += strings[i];

        return newString;

    },

    convert : function(match, nosign){
        if (nosign) {
            match.sign = '';
        } else {
            match.sign = match.negative ? '-' : match.sign;
        }
        var l = match.min - match.argument.length + 1 - match.sign.length;
        var pad = new Array(l < 0 ? 0 : l).join(match.pad);
        if (!match.left) {
            if (match.pad == "0" || nosign) {
                return match.sign + pad + match.argument;
            } else {
                return pad + match.sign + match.argument;
            }
        } else {
            if (match.pad == "0" || nosign) {
                return match.sign + match.argument + pad.replace(/0/g, ' ');
            } else {
                return match.sign + match.argument + pad;
            }
        }
    }
}
sprintf = sprintfWrapper.init;

/**
    jQuery JSON plugin.
*/

var mmm = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    ssss = {
        'array': function (x) {
            var a = ['['], b, f, i, l = x.length, v;
            for (i = 0; i < l; i += 1) {
                v = x[i];
                f = ssss[typeof v];
                if (f) {
                    v = f(v);
                    if (typeof v == 'string') {
                        if (b) {
                            a[a.length] = ',';
                        }
                        a[a.length] = v;
                        b = true;
                    }
                }
            }
            a[a.length] = ']';
            return a.join('');
        },
        'boolean': function (x) {
            return String(x);
        },
        'null': function (x) {
            return "null";
        },
        'number': function (x) {
            return isFinite(x) ? String(x) : 'null';
        },
        'object': function (x) {
            if (x) {
                if (x instanceof Array) {
                    return ssss.array(x);
                }
                var a = ['{'], b, f, i, v;
                for (i in x) {
                    v = x[i];
                    f = ssss[typeof v];
                    if (f) {
                        v = f(v);
                        if (typeof v == 'string') {
                            if (b) {
                                a[a.length] = ',';
                            }
                            a.push(ssss.string(i), ':', v);
                            b = true;
                        }
                    }
                }
                a[a.length] = '}';
                return a.join('');
            }
            return 'null';
        },
        'string': function (x) {
            if (/["\\\x00-\x1f]/.test(x)) {
                x = x.replace(/([\x00-\x1f\\"])/g, function(a, b) {
                    var c = mmm[b];
                    if (c) {
                        return c;
                    }
                    c = b.charCodeAt();
                    return '\\u00' +
                        Math.floor(c / 16).toString(16) +
                        (c % 16).toString(16);
                });
            }
            return '"' + x + '"';
        }
    };

jQuery.toJSON = function(v) {
    var f = isNaN(v) ? ssss[typeof v] : ssss['number'];
    if (f) return f(v);
};

jQuery.parseJSON = function(v, safe) {
    if (safe === undefined) safe = jQuery.parseJSON.safe;
    if (safe && !/^("(\\.|[^"\\\n\r])*?"|[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t])+?$/.test(v))
        return undefined;
    if (!v || v == "")
        return {};
    return eval('('+v+')');
};

jQuery.parseJSON.safe = false;



//####################################################################################################################
//####################################################################################################################

var WebCMS = Base.extend({
    constructor: null,
    modules: {},
    initcalls: [],
    translation: {
        seconds: "seconds",
        minutes: "minutes",
        hours: "hours",
        days: "days"
    },
    account_data: null,
    top_service: false,
    lang: "",
    mode: "",
    modes: {},
    server_dst: 1,
    delayed_calls: 0,
    res_types: {},
    hw_types: {},
    display_inits: [],
    check_billing_params: [],
    check_billing_calls_count: 0,
    init_finished: false,
    init_batch_finished: false,
//==================================================================================        
    get_error_text: function (code, operation, sclass) {
        if (sclass == "user" && operation == "delete") return this.translation.user_delete_error;
        return this.translation[code] ? this.translation[code] : "";
    },
//==================================================================================        
    apply_translations: function (lang) {
        this.lang = lang;


        //var tmp_adf_i18n = svsdk.util.Json.parse(adf_i18n);

        if (typeof adf_i18n != "object") return;
        for (var mod_type in adf_i18n) {
            var mod;
            if (mod_type == "web_cms") mod = this;
            else mod = this.get_module(mod_type);
            if (!mod) continue;
            var tr = adf_i18n[mod_type];
            for (var text in tr)
            mod.translation[text] = tr[text];
        }
    },
//==================================================================================        
    register_module: function (mod) {
        if (typeof mod != 'object' || !mod) return;
        var t = this.modules[mod.getType()];
        if (typeof t != 'undefined') return;
        this.modules[mod.getType()] = mod;
    },
//==================================================================================        
    unregister_module: function (mod) {
        if (typeof mod != 'object' || !mod) return;
        delete this.modules[mod.getType()];
    },
//==================================================================================        
    after_init_call: function (func) {
        this.initcalls.push(func);
    },
//==================================================================================        
    get_module: function (mod_type) {
        var t = this.modules[mod_type];
        if (typeof t != 'undefined') return t;
        return null;
    },
//==================================================================================        
    get_lang: function () {
        return this.lang;
    },
//==================================================================================        
    get_time_interval_text: function (ival) {
        var days = parseInt(ival / 86400);
        ival -= days * 86400;
        var hours = parseInt(ival / 3600);
        ival -= hours * 3600;
        var minutes = parseInt(ival / 60);
        var seconds = ival - minutes * 60;
        var sres = "";
        if (days > 0) sres = this.sprintf("%d %s", days, this.translation.days);
        if (hours > 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", hours, this.translation.hours);
        if (minutes > 0 && days == 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", minutes, this.translation.minutes);


        //if (seconds > 0)
        if (hours == 0 && days == 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", seconds, this.translation.seconds);


        return sres;
    },
//==================================================================================        
    get_time_interval_text2: function (ival) {
        var days = parseInt(ival / 86400);
        ival -= days * 86400;
        var hours = parseInt(ival / 3600);
        ival -= hours * 3600;
        var minutes = parseInt(ival / 60);
        var seconds = ival - minutes * 60;
        var sres = "";
        if (days > 0) sres = this.sprintf("%d %s", days, this.translation.days);
        if (hours > 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", hours, this.translation.hours);
        if (minutes > 0 && days == 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", minutes, this.translation.minutes);


        if (seconds > 0)
        if (hours == 0 && days == 0) sres += this.sprintf("%s%d %s", sres != "" ? " " : "", seconds, this.translation.seconds);


        return sres;
    },
//==================================================================================    
    log_msg: function (text, type, _show_alert, lat, lon) {
        if (typeof type == 'undefined' || (type != 1 && type != 2)) type = 0;
        if (typeof lat == "undefined") lat = 0;
        if (typeof lon == "undefined") lon = 0;
        var show_alert = false;
        if (typeof _show_alert == "undefined") {
            if (type == 2) show_alert = true;
            else show_alert = false;
        } else show_alert = _show_alert;
        var mod = this.get_module("log");
        if (mod) {
            mod.log_msg(text, type, show_alert, lat, lon);
            return;
        }
        log_text(text.replace(/\s+/, " "));
        switch (type) {
            case 0:
            case 1:
                break;
            case 2:
                if (show_alert) alert(text);
            default:
                break;
        }
    },
//==================================================================================    
    get_img_url: function (src_url) {
        return src_url;
    },
//==================================================================================    
    on_init: function (opts) {
                this.on_init_impl(opts);
                return;
    },    
//==================================================================================    
    on_init_impl: function (opts) {
if(typeof svsdk != 'undefined') {
    svsdk.core.Session.getInstance().addListener("invalidSession", function () {
        setInterval(function () {
            var req;
            if (window.XMLHttpRequest) req = new XMLHttpRequest();
            else if (window.ActiveXObject) try {
                req = new ActiveXObject('Msxml2.XMLHTTP');
            } catch (e) {
                try {
                    req = new ActiveXObject('Microsoft.XMLHTTP');
                } catch (e) {
                }
            }
            if (!req) return;
            var host = document.location.protocol + "//" + document.location.host + "/checker.html";
            req.open("POST", host, true);
            req.onreadystatechange = function () {
                if (this.status != 200) {
                    return;
                } else if (this.readyState == 4) {
                    document.cookie = "restore_sid=;expires=" + (new Date()).toGMTString() + ";;";
                    document.cookie = "operate_as=;expires=" + (new Date()).toGMTString() + ";;";
                    location.reload();
                }
            };
            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            try {
                req.send();
            } catch (e) {
                return;
            }
        }, 2000);
    }, this);
}
        if (typeof opts == 'undefined') opts = [];
        for (var i = 0; i < opts.length; i++) {
            var opt = opts[i];
            var mod;
            if (opt.m == "web_cms") mod = this;
            else mod = this.get_module(opt.m);
            if (mod && typeof mod != 'undefined') mod[opt.n] = opt.v;
        }
        var arr = this.mode.split(",");
        for (var m in arr)
        this.modes[arr[m]] = 1;
        for (var mod_type in this.modules) {
            var mod = this.modules[mod_type];
            if (mod && typeof mod.on_pre_init == 'function') {
                var delayed = mod.on_pre_init();
                if (delayed) this.delayed_calls++;
            }
        }
        if (!this.delayed_calls) this.pre_init_done();
        if(typeof svsdk != 'undefined') {
            document.cookie = "restore_sid=" + svsdk.core.Session.getInstance().getId();
            //document.cookie = "operate_as=" + escape(svsdk.core.Session.getInstance().getCurrUser().getName());
        }
    },
//==================================================================================    
    pre_init_delayed_call_done: function () {
        if (!this.delayed_calls) return;
        if (--this.delayed_calls) return;
        this.pre_init_done();
    },
//==================================================================================    
    pre_init_done: function () {
        for (var mod_type in this.modules) {
            var mod = this.modules[mod_type];
            if (mod && typeof mod.on_init == 'function') {
                var delayed = mod.on_init();
                if (delayed) this.delayed_calls++;
            }
        }
        if (!WebCMS.delayed_calls) WebCMS.init_done();
    },
//==================================================================================    
    delayed_call_done: function () {
        if (!this.delayed_calls) return;
        if (--this.delayed_calls) return;
        this.init_done();
    },
//==================================================================================
    call_display_inits: function (callback) {
        if (!this.display_inits.length) {
            if (typeof callback == "function") callback();
            return;
        } else {
            var mod = this.modules[this.display_inits[0]];
            mod.on_display_init();
            this.display_inits.splice(0, 1);
            setTimeout(qx.lang.Function.bind(function () {
                this.call_display_inits(callback);
            }, this), 1);
        }
    },
//==================================================================================
    init_done: function () {
        for (var mod_type in this.modules) {
            var mod = this.modules[mod_type];
            if (mod && typeof mod.on_display_init == 'function') {
                this.display_inits.push(mod.getType());
            }
        }

        if(typeof qx != 'undefined') {
            this.call_display_inits(qx.lang.Function.bind(function () {
                for (var i = 0; i < this.initcalls.length; i++) {
                    this.initcalls[i]();
                }
                //if (typeof resize_log_panel == "function") resize_log_panel();
                /*
                 if (parseFloat(navigator.appVersion.split("MSIE")[1]) >= 9) {
                 }
                 */
                WebCMS.init_finished = true;
            }, this));
        }

    },
//==================================================================================
unixToStr: function (unix_timestamp){
        // multiplied by 1000 so that the argument is in milliseconds, not seconds      
        var date = new Date(unix_timestamp*1000);
        // hours part from the timestamp
        var hours = date.getHours();
        // minutes part from the timestamp
        var minutes = date.getMinutes();
        // seconds part from the timestamp
        var seconds = date.getSeconds();
        
        var year = date.getFullYear();
        var Month = date.getMonth() + 1;
        var day = date.getDate();
/*       
var month = new Array();
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";
var n = month[date.getMonth()];
*/
        // will display time in 10:30:23 format
        //var formattedTime = hours + ':' + minutes + ':' + seconds + '  ' + day + '.' + Month + ' ['+n+'].' + year;        
        var dateStr = this.sprintf('%02d:%02d:%02d  %02d.%02d.%04d',hours, minutes, seconds, day, Month, year);
        return dateStr;
},
//==================================================================================
sprintf : function(){
var x = "util.String",w = "null",v = 'x',u = 'c',t = 'b',s = 'X',r = 'o',q = '-',p = 'f',o = "x",e = 's',n = 'd',h = "static",c = ":",b = "0",g = '',f = '%',k = "undefined",a = "string",m = "",d = ' ';
        if(typeof arguments == k){

          return null;
        };
        if(arguments.length < 1){

          return null;
        };
        if(typeof arguments[0] != a){

          return null;
        };
        if(typeof RegExp == k){

          return null;
        };
        var V = arguments[0];
        var ba = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
        var W = new Array();
        var be = new Array();
        var X = 0;
        var Y = 0;
        var bc = 0;
        var bg = 0;
        var bd = g;
        var bf = null;
        while(bf = ba.exec(V)){

          if(bf[9]){

            X += 1;
          };
          Y = bg;
          bc = ba.lastIndex - bf[0].length;
          be[be.length] = V.substring(Y, bc);
          bg = ba.lastIndex;
          W[W.length] = {
            match : bf[0],
            left : bf[3] ? true : false,
            sign : bf[4] || g,
            pad : bf[5] || d,
            min : bf[6] || 0,
            precision : bf[8],
            code : bf[9] || f,
            negative : parseFloat(arguments[X]) < 0 ? true : false,
            argument : String(arguments[X])
          };
        };
        be[be.length] = V.substring(bg);
        if(W.length == 0){

          return V;
        };
        if((arguments.length - 1) < X){

          return null;
        };
        var U = null;
        var bf = null;
        var i = null;
        var bb = null;
        for(i = 0;i < W.length;i++){

          if(W[i].code == f){

            bb = f;
          } else if(W[i].code == t){

            W[i].argument = String(Math.abs(parseInt(W[i].argument)).toString(2));
            bb = this.__fd(W[i], true);
          } else if(W[i].code == u){

            W[i].argument = String(String.fromCharCode(parseInt(Math.abs(parseInt(W[i].argument)))));
            bb = this.__fd(W[i], true);
          } else if(W[i].code == n){

            W[i].argument = String(Math.abs(parseInt(W[i].argument)));
            bb = this.__fd(W[i]);
          } else if(W[i].code == p){

            W[i].argument = String(Math.abs(parseFloat(W[i].argument)).toFixed(W[i].precision ? W[i].precision : 6));
            bb = this.__fd(W[i]);
          } else if(W[i].code == r){

            W[i].argument = String(Math.abs(parseInt(W[i].argument)).toString(8));
            bb = this.__fd(W[i]);
          } else if(W[i].code == e){

            W[i].argument = W[i].argument.substring(0, W[i].precision ? W[i].precision : W[i].argument.length);
            bb = this.__fd(W[i], true);
          } else if(W[i].code == v){

            W[i].argument = String(Math.abs(parseInt(W[i].argument)).toString(16));
            bb = this.__fd(W[i]);
          } else if(W[i].code == s){

            W[i].argument = String(Math.abs(parseInt(W[i].argument)).toString(16));
            bb = this.__fd(W[i]).toUpperCase();
          } else {

            bb = W[i].match;
          };;;;;;;;
          bd += be[i];
          bd += bb;
        };
        bd += be[i];
        return bd;
      },
//==================================================================================      
      __fd : function(bh, bi){
var x = "util.String",w = "null",v = 'x',u = 'c',t = 'b',s = 'X',r = 'o',q = '-',p = 'f',o = "x",e = 's',n = 'd',h = "static",c = ":",b = "0",g = '',f = '%',k = "undefined",a = "string",m = "",d = ' ';
        if(bi){

          bh.sign = g;
        } else {

          bh.sign = bh.negative ? q : bh.sign;
        };
        var l = bh.min - bh.argument.length + 1 - bh.sign.length;
        var bj = new Array(l < 0 ? 0 : l).join(bh.pad);
        if(!bh.left){

          if(bh.pad == b || bi){

            return bh.sign + bj + bh.argument;
          } else {

            return bj + bh.sign + bh.argument;
          };
        } else {

          if(bh.pad == b || bi){

            return bh.sign + bh.argument + bj.replace(/0/g, d);
          } else {

            return bh.sign + bh.argument + bj;
          };
        };
      }
//==================================================================================

});



//####################################################################################################################
//####################################################################################################################



/// Check digit and prepend zero if required
function check_time(i) {
    if (i < 10)
        i = "0" + i;
    return i;
}

/// Format time absolute value
function format_time(abs_val, allow_short) {
    if (!abs_val)
        return "";
    if (typeof allow_short == "undefined")
        allow_short = true;
    var d = new Date(abs_val * 1000);
    var cd = new Date();
    var res = check_time(d.getUTCHours()) + ":" + check_time(d.getUTCMinutes()) + ":" + check_time(d.getUTCSeconds());
    if (allow_short && cd.getUTCDate() == d.getUTCDate() && cd.getUTCMonth() == d.getUTCMonth() && cd.getUTCFullYear() == d.getUTCFullYear())
        return res;
    // append date
    //return d.getUTCFullYear() + "-" + check_time(d.getUTCMonth() + 1) + "-" + check_time(d.getUTCDate()) + " " + res;
    
    return res + " " + check_time(d.getUTCDate()) + "." + check_time(d.getUTCMonth() + 1) + "." + d.getUTCFullYear();
}

/// Format date absolute value
function format_date(abs_val) {
    if (!abs_val)
        return "";
    var d = new Date(abs_val * 1000);
    return d.getFullYear() + "-" + check_time(d.getMonth() + 1) + "-" + check_time(d.getDate());
}

/// Get absolute value for date
function get_abs_time(year, month, day, hour, minute, second) {
    var d = new Date(year, month - 1, day, hour, minute, second, 0);
    return parseInt(d.getTime() / 1000);
}

/// Get current absolute time
function get_curr_abs_time() {
    var cd = new Date();
    return parseInt(cd.getTime() / 1000);
}

/// Get local timezone offset in seconds, excluding possible DST state
function get_local_timezone() {
    var rightNow = new Date();
    var jan1 = new Date(rightNow.getFullYear(), 0, 1, 0, 0, 0, 0);  // jan 1st
    var june1 = new Date(rightNow.getFullYear(), 6, 1, 0, 0, 0, 0); // june 1st
    var temp = jan1.toGMTString();
    var jan2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
    temp = june1.toGMTString();
    var june2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
    var std_time_offset = ((jan1 - jan2) / (1000 * 60 * 60));
    var daylight_time_offset = ((june1 - june2) / (1000 * 60 * 60));
    var dst;
    if (std_time_offset == daylight_time_offset) {
            dst = "0"; // daylight savings time is NOT observed
    } else {
            // positive is southern, negative is northern hemisphere
            var hemisphere = std_time_offset - daylight_time_offset;
            if (hemisphere >= 0)
                std_time_offset = daylight_time_offset;
            dst = "1"; // daylight savings time is observed
    }

    return parseInt(std_time_offset*3600);
}

/// get absolute time from formatted text -> hh:mm:ss -> h:m:s -> hh:mm -> h:m
/// on error returns -1
function parse_time(value)
{
    var time = 0;
    if (value == "")
        return -1;
    var pos = value.search(/:/);
    if (pos < 1)
        return -1;
    var hour = Number(value.substr(0, pos));
    if (isNaN(hour) || hour < 0 || hour > 23)
        return -1;
    time = hour * 3600;
    value = value.substr(pos+1, value.length);
    pos = value.search(/:/);
    var minute = 0;
    if (pos == -1)
        minute = Number(value);
    else
        minute = Number(value.substr(0, pos));

    if (isNaN(minute) || minute < 0 || minute > 59)
        return -1;
    time = time + minute * 60;
    value = value.substr(pos+1, value.length);
    pos = value.search(/:/);
    if (pos >= 1) {
        var second = Number(value.substr(0, pos));
        if (isNaN(second) || second < 0 || second > 59)
            return -1;
        time = time + second;
    }
    return time;
}

/// Set cookie
function set_cookie(c_name, value, expiredays)
{
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + expiredays);
    document.cookie = c_name + "=" + escape(value) + ((expiredays == null) ? "" : ";expires=" + exdate.toGMTString());
}

/// get cookie
function get_cookie(c_name)
{
    if (document.cookie.length > 0) {
        c_start = document.cookie.indexOf(c_name + "=");
        if (c_start != -1) {
            c_start = c_start + c_name.length + 1;
            c_end = document.cookie.indexOf(";", c_start);
            if (c_end == -1)
                c_end = document.cookie.length;
            return unescape(document.cookie.substring(c_start, c_end));
        }
    }
    return ""
}

/// Check email is correct
function is_valid_email(email)
{
    return  (/^([a-z0-9а-я_\-]+\.)*[a-z0-9а-я_\-]+@([a-z0-9а-я]*[a-z0-9а-я_\-]+\.)+[a-zа-я]{2,4}$/i).test(email);
}

/// Test debug function
function log_text(txt) {
    if (typeof console == 'object' && typeof console.log != 'undefined') {
        var dt = new Date();
        var abs_time = get_abs_time(dt.getFullYear(), dt.getMonth()+1, dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
        console.log("%d:%d:%d.%d: %s", dt.getHours(), dt.getMinutes(), dt.getSeconds(), dt.getMilliseconds(), txt);
    }
}
test = log_text;

/// Convert string representation of a decimal integer to integer value
function atoi(s) {
    var n = parseInt(s, 10);
    //if (isNaN(n) || !isFinite(n) || Math.abs(n) > 0x7FFFFFFF)  // RemoteUserID ir lielāks par 32 bitiem
    if (isNaN(n) || !isFinite(n) || Math.abs(n) > 0x7FFFFFFFFFFFFFFF)
        return 0;
    return n;
}
//####################################################################################################################
//####################################################################################################################

var event_handlers = [];

function bind_event_handler(event_name, event_id, callback, cparam) {
    if (event_name == null || event_id == null || callback == null) return false;
    var col1 = event_handlers[event_name];
    if (typeof col1 == 'undefined') {
        col1 = new Object;
        event_handlers[event_name] = col1;
    }
    var col2 = col1[event_id];
    if (typeof col2 == 'undefined') {
        col2 = new Array;
        col1[event_id] = col2;
    }
    var handler = new Object;
    handler.callback = callback;
    if (typeof cparam == "undefined") cparam = "";
    handler.cparam = cparam;
    col2.push(handler);
    return true;
}

function unbind_event_handler(event_name, event_id, callback, cparam) {
    if (event_name == null || callback == null) return false;
    if (typeof cparam == "undefined") cparam = "";
    var col1 = event_handlers[event_name];
    if (typeof col1 == 'undefined') return false;
    var col2 = col1[event_id];
    if (typeof col2 == 'undefined') return false;
    for (var i = 0; i < col2.length; i++) {
        var handler = col2[i];
        if (handler.callback == callback && handler.cparam == cparam) {
            col2.splice(i, 1);
            return true;
        }
    }
    return false;
}

function fire_event(event_name, event_id, data) {
    var col1 = event_handlers[event_name];
    if (typeof col1 != 'undefined') {
        var col2 = col1[event_id];
        if (typeof col2 != 'undefined') {
            for (var i = 0; i < col2.length; i++) {
                var handler = col2[i];
                handler.callback(event_name, event_id, data, handler.cparam);
            }
        }
        col2 = col1[0];
        if (typeof col2 != 'undefined' && event_id != 0) {
            for (var i = 0; i < col2.length; i++) {
                var handler = col2[i];
                handler.callback(event_name, event_id, data, handler.cparam);
            }
        }
    }
    var col1 = event_handlers[""];
    if (typeof col1 != 'undefined') {
        var col2 = col1[event_id];
        if (typeof col2 != 'undefined') {
            for (var i = 0; i < col2.length; i++) {
                var handler = col2[i];
                handler.callback(event_name, event_id, data, handler.cparam);
            }
        }
        col2 = col1[0];
        if (typeof col2 != 'undefined' && event_id != 0) {
            for (var i = 0; i < col2.length; i++) {
                var handler = col2[i];
                handler.callback(event_name, event_id, data, handler.cparam);
            }
        }
    }
}
//####################################################################################################################
//####################################################################################################################


function conv_to_loc(abs_time) {
    var t = abs_time + get_local_timezone();
    return t;
}

function conv_to_abs(loc_time) {
    var t = loc_time - get_local_timezone(); 
    return t;
}
//####################################################################################################################
//####################################################################################################################







