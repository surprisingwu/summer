;
(function(window) {
    function Spring(options) {
        // 初始化的一些属性
        this.isHttps = false
    }

    // 公有方法，存放在原型对象中
    Spring.prototype = {
        'constructor': Spring,
        // 检测一个对象的类型
        checkObj: function(type) {
            return function(obj) {
                return Object.prototype.toString.call(obj) === '[object ' + type + ']'
            }
        },
        isMobile: function() {
            var regexp = /(android|os) (\d{1,}(\.|\_)\d{1,})/
            return regexp.test(this.userAgent())
        },
        isIphone: function() {
            var regexp = /iphone|ipad|ipod/
            return regexp.test(this.userAgent())
        },
        isAndroid: function() {
            var regexp = /android/
            return regexp.test(this.userAgent())
        },
        userAgent: function() {
            return navigator.userAgent.toLowerCase()
        },
        // date: dateObj  fmt:日期格式（yyyy-MM-dd）
        formatDate: function(date, fmt) {
            var o = {
                "M+": date.getMonth() + 1, //月份 
                "d+": date.getDate(), //日 
                "h+": date.getHours(), //小时 
                "m+": date.getMinutes(), //分 
                "s+": date.getSeconds(), //秒 
                "q+": Math.floor((date.getMonth() + 3) / 3), //季度 
                "S": date.getMilliseconds() //毫秒 
            };
            if (/(y+)/.test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
            }
            for (var k in o) {
                if (new RegExp("(" + k + ")").test(fmt)) {
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                }
            }
            return fmt;
        },
        // 补0
        padLeftZero: function(str) {
            return ('00' + str).substr(str.length)
        },
        // 等比缩放图片 （最好压缩的时候，就进行等比缩放）
        compressImg: function(image, maxWidth, maxHeight) {
            var maxWidth = maxWidth;
            var maxHeight = maxHeight;
            var hRatio;
            var wRatio;
            var Ratio = 1;
            var w = image.width;
            var h = image.height;
            wRatio = maxWidth / w;
            hRatio = maxHeight / h;
            if (maxWidth == 0 && maxHeight == 0) {
                Ratio = 1;
            } else if (maxWidth == 0) { //
                if (hRatio < 1) Ratio = hRatio;
            } else if (maxHeight == 0) {
                if (wRatio < 1) Ratio = wRatio;
            } else if (wRatio < 1 || hRatio < 1) {
                Ratio = (wRatio <= hRatio ? wRatio : hRatio);
            }
            if (Ratio < 1) {
                w = w * Ratio;
                h = h * Ratio;
            }
            var imgDom = new Image();
            imgDom.height = h;
            imgDom.width = w;
            return imgDom;
        },
        // 保存数据到本地
        setStorage: function(key, value) {
            var saveObj = window.localStorage._saveObj_;
            if (!saveObj) {
                saveObj = {}
            } else {
                saveObj = JSON.parse(saveObj)
            }
            saveObj[key] = value;
            window.localStorage._saveObj_ = JSON.stringify(saveObj);
        },
        // 从本地加载数据 def:为默认值
        getStorage: function(key, def) {
            var saveObj = window.localStorage._saveObj_
            if (!saveObj) {
                return def
            }
            saveObj = JSON.parse(saveObj)
            var ret = saveObj[key]
            return ret || def
        },
        // 从本地存储中移除某一个属性
        removeStorageItem: function(key) {
            var saveObj = window.localStorage._saveObj_;
            if (saveObj) {
                saveObj = JSON.parse(saveObj);
                delete saveObj[key]
                window.localStorage._saveObj_ = JSON.stringify(saveObj)
            }
        },
        // 清除所有的存储
        clearStorage: function() {
            window.localStorage.clear()
        },
        // 获取url里面的一些参数
        getQueryByName: function(name) {
            var params = decodeURI(location.search);
            var result = params.match(new RegExp("[\?\&]" + name + "=([^\&]+)", "i"));
            if (result == null || result.length < 1) {
                return "";
            }
            return result[1];
        },
        // url后面拼接参数, 
        addUrlParam: function(url, name, value) {
            // 拼接的参数多时,可以传一个url,一个json.单个时可以传url,key,valu
            url += (url.indexOf("?") == -1 ? "?" : "&");
            if (arguments.length === 3) {
                url += name + "=" + value
                return url;
            }
            var options = name; // 第二个参数为json
            for (var key in options) {
                url += key + "=" + options[key]
            }
            return url;
        },
        protocol: function() {
            return this.isHttps ? 'https://' : 'http://'
        },
        // 访问ma,需先设置ip和端口,以及ma的controller
        setConfig: function(options) {
            if (typeOf(options) === 'object' && this.checkObj('Object')(options)) {
                if (options.ip && options.port && options.controller) {
                    this.ip = options.ip
                    this.port = options.port
                    this.controller = options.controller
                }
            }
        },
        openHttps: function() {
            this.isHttps = true
        },
        // 用来请求ma的
        getData: function(options) {
            if (!(this.ip && this.port && this.controller)) {
                throw new Error('请先设置MA的ip、port、和controller！')
            }
            this.appid = this._checkAttribute(options, 'appid', 'test')
            this.action = this._checkAttribute(options, 'action', 'handler')
            if (this.isMobile()) {
                this.callAction(options)
            } else {
                this._requestAjax(options)
            }
        },
        // ip: string ,port:string
        writeConfig: function() {
            summer.writeConfig({
                'host': this.ip,
                'port': this.port
            })
        },
        // options: {action: "",params:{},sucess: fn,error: fn,timeout: num}
        callAction: function(options) {
            this.writeConfig()
            summer.callAction(this._handleParams(options))
        },
        // 获取用户的信息,如token,usercode等    settings:{async: boolean}
        getUserMesg: function(settings) {
            var options = {
                params: {
                    transtype: 'request_token'
                },
                callback: settings.callback,
                error: settings.error
            }
            this.callServiceNative(options, this._checkAttribute(settings, 'async', 'false'))
        },
        // options:{callback:fn,error:fn,innerparams:{},controllerId:str[,async:bol]}
        callService: function(settings) {
            var params = {
                params: {
                    transtype: 'serviceCall',
                    controllerId: settings.controller
                },
                callback: settings.callback,
                error: settings.error
            }
            if (settings.innerParams) {
                params.params.innerParams = settings.innerParams
            }
            this.callServiceNative(params, this._checkAttribute(settings, 'async', 'false'))
        },
        // options:{callback:fn,error:fn[,quality:str,maxWidth:str,maxHeight:str]}
        openalbum: function(settings) {
            var params = {
                params: {
                    transtype: 'openalbum',
                    quality: this._checkAttribute(settings, 'quality', '0.85')
                },
                callback: settings.callback,
                error: settings.error
            }
            if (settings.maxHeight && settings.maxWidth) {
                params.params.maxWidth = settings.maxWidth
                params.params.maxHeight = settings.maxHeight
            }
            this.callServiceNative(params, this._checkAttribute(settings, 'async', 'false'))
        },
        openCamara: function(settings) {
            var params = {
                params: {
                    transtype: 'takephote',
                    quality: this._checkAttribute(settings, 'quality', '0.85')
                },
                callback: settings.callback,
                error: settings.error
            }
            if (settings.maxHeight && settings.maxWidth) {
                params.params.maxWidth = settings.maxWidth
                params.params.maxHeight = settings.maxHeight
            }
            if (settings.isCut) {
                params.params.isCut = settings.isCut
            }
            this.callServiceNative(params, this._checkAttribute(settings, 'async', 'false'))
        },
        _checkAttribute: function(obj, key, def) {
            return obj[key] === undefined ? def : obj[key]
        },
        _handleParams: function(options) {
            // 默认的头部信息
            var header = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'imgfornote'
            }
            var params = {
                'appid': this._checkAttribute(options, 'appid', 'test'),
                'viewid': this._checkAttribute(options, 'controller', this.controller),
                'action': this._checkAttribute(options, 'action', 'handler'),
                'params': options.params,
                'callback': options.success,
                'timeout': this._checkAttribute(options, 'timeout', 10),
                'error': options.error,
                'header': this._checkAttribute(options, 'header', header)
            }
            return params
        },
        // 谷歌浏览器  属性 目标文件   加上 --args  --disable-web-security --user-data-dir解除谷歌安全策略
        _requestAjax: function(options) {
            var header = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'imgfornote'
            }
            var tempData = this.setRequestParams(this.appid, this.action, this._checkAttribute(options, 'params', {}))
            var data = {
                tip: "none",
                data: ''
            };
            data.data = JSON.stringify(tempData)
            $.ajax({
                url: this.protocol() + this.ip + ":" + this.port + "/umserver/core",
                data: $.param(data),
                type: "POST",
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                timeout: this._checkAttribute(options, 'timeout', 10) * 1000,
                dataType: "json",
                header: this._checkAttribute(options, 'header', header),
                success: function(data) {
                    // 数据处理
                    options.success(data)
                },
                error: function(e) {
                    options.error(e)
                }
            })
        },
        // 监听物理返回键,  传一个回调
        onWatchBackBtn: function(callback) {
            document.addEventListener("deviceready", function() {
                document.addEventListener("backbutton", function() {
                    callback() // 执行回调,
                }, false);
            }, false);
        },
        // 退出H5小应用
        functionback: function() {
            var u = navigator.userAgent,
                app = navigator.appVersion;
            var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1;
            var isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
            if (isAndroid) {
                navigator.app.exitApp();
            }
            if (isIOS) {
                var pamn = {
                    "params": {
                        "transtype": "exit_back"
                    }
                };
                summer.callService("SummerService.gotoNative", pamn, false);
            }
        },
        // options:{transtype: str,innerParams:{},callback:fn,error:fn} 
        // transtype: "openalbum" 通过原生打开相册,并返回解压后的base64 (0.85)
        // transtype: "request_token" 通过原生获取用户的信息,ip,port,token,登录的信息和domain
        // transtype: "serviceCall" 通过原生去调ma拿数据
        // transtype: "takephote" 通过原生打开相机,并返回解压后的base64
        callServiceNative: function(params, flag) {
            if (arguments.length === 1) {
                flag = false
            }
            summer.callService("SummerService.gotoNative", params, flag);
        },
        setRequestParams: function(appid, action, params) {
            var params = {
                "serviceid": "umCommonService",
                "appcontext": {
                    "appid": appid,
                    "tabid": "",
                    "funcid": "",
                    "funcode": appid,
                    "userid": "",
                    "forelogin": "",
                    "token": "",
                    "pass": "",
                    "sessionid": "",
                    "devid": "C3474B8E-888D-4937-BDBA-025D8DAE3AE4",
                    "groupid": "",
                    "massotoken": "",
                    "user": ""
                },
                "servicecontext": {
                    "actionid": "",
                    "viewid": this.controller,
                    "contextmapping": {
                        "result": "result"
                    },
                    "params": params,
                    "actionname": action,
                    "callback": ""
                },
                "deviceinfo": {
                    "firmware": "",
                    "style": "ios",
                    "lang": "zh-CN",
                    "imsi": "",
                    "wfaddress": "C3474B8E-888D-4937-BDBA-025D8DAE3AE4",
                    "imei": "",
                    "appversion": "1",
                    "uuid": "C3474B8E-888D-4937-BDBA-025D8DAE3AE4",
                    "bluetooth": "",
                    "rom": "",
                    "resolution": "",
                    "name": "kl",
                    "wifi": "",
                    "mac": "C3474B8E-888D-4937-BDBA-025D8DAE3AE4",
                    "ram": "",
                    "model": "iPhone",
                    "osversion": "iphone",
                    "devid": "C3474B8E-888D-4937-BDBA-025D8DAE3AE4",
                    "mode": "kl",
                    "pushtoken": "",
                    "categroy": "iPhone",
                    "screensize": {
                        "width": window.screen.width,
                        "heigth": window.screen.height
                    }
                }
            };
            return params
        }
    }
    return (function() {
        // 现在js库比较小，可以再页面加载时，全部加载。复杂的时候，还是使用惰性加载比较好。
        window.spring = spring = new Spring()
    })()
})(window);