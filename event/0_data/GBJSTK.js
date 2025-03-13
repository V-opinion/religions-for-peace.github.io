/*
*  GBJSTK.js
*  GoodBarber JavaScript ToolKit for GB App API
*
*  Created for Beautiful Custom codes by GoodBarber.
*/

class GBError {
    constructor(code, message) {
        this.code = code;
        this.message = message;
    }
}

class GBCoordinate {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }
}

class GBUser {
    constructor(
        id,
        api_version,
        login,
        email = null,
        username = null,
        first_name = null,
        last_name = null,
        picture_url = null,
        description = null,
        phone = null,
        birthday = null,
        location = null,
        coordinates = null,
        groups = null,
        social_accounts = null,
        custom_attribs = null,
        access_levels = null,
        addresses = null,
        default_billing_address_id = null,
        default_shipping_address_id = null) {
        this.id = id;
        this.api_version = api_version;
        this.login = login;
    }
}

class GBUserAddress {
    constructor(
        id,
        first_name = null,
        last_name = null,
        middle_name = null,
        city = null,
        company = null,
        country = null,
        extra = null,
        state = null,
        vat_number = null,
        zipcode = null,
        localized_address = null) {
        this.id = id;
    }
}

const GBConsentStatus = {
    Unknown: 0,
    Accepted: 1,
    Refused: 2
}

function gbCallbackToString(f) {
    return btoa(f.toString());
}

function gbCallback(hash, values) {
    var decoded = atob(hash);
    var fn = new Function('return ' + decoded)();

    function caller(otherFunction) {
        otherFunction.apply(null, values);
    }

    caller(fn);
}

var gb = (function (gbjs) {

    var version = "2.3.1";
    /************* Debugging Zone *************/

    /* Var : int gbDebuggingMode
    *  Sets the debugging mode using a system of code values.
    *  0 : Production mode
    *  1 : Alerts before any request
    *  2 : Alerts before any request + stop requests
    */
    var gbDebuggingMode = 0;

    /* Var : string gbToken
    *  Initialize the authentification token used in gbRequest();
    */
    gbToken = gbParam('gbToken');

    /************* Parent platform detection *************/

    if (typeof gbUserInfo == "undefined") {
        gbUserInfo = {};
    }

    /* Var : BOOL gbAngularMode
    *  Switches the URL updates and the form posts to messages to parent iframe - necessary for the custom code to work in the website version.
    */
    if (typeof gbAngularMode == "undefined") {
        gbAngularMode = false;
    }

    /* Var : BOOL gbDevMode
    *  JUST TO DEVELOP DIRECTLY ON A DESKTOP BROWSER. If you want to dev and test your custom code in a standard web page, this boolean will do the trick.
    *  Once integrated in a custom code section of an app, this will always be false.
    *  DO NOT USE IN PRODUCTION
    *  true : Development mode
    *  false : Production mode
    */
    var gbDevMode = !gbAngularMode && !navigator.userAgent.match(/iPhone OS/i) && !navigator.userAgent.match(/iPad/i) && !navigator.userAgent.match(/Android/i);

    /************* Helper Functions *************/

    /** Function: gbPlatformIsIos()
     * This function allow you to check if the current platform is iOS
     * @return true if the current plateform is iOS
     */
    function gbPlatformIsIos() {
        return gbUserInfo && gbUserInfo.platform == 'ios';
    }

    /** Function: gbPlatformIsAndroid()
     * This function allow you to check if the current platform is Android
     * @return true if the current plateform is Android
     */
    function gbPlatformIsAndroid() {
        return gbUserInfo && gbUserInfo.platform == 'android';
    }

    /** Function : init
     *  This function initializes communication with the parent PWA (if not already done)
     */
    function init() {
        if (!gbAngularMode && window.parent) {
            parent.postMessage({url: "goodbarber://init"}, '*');
        }
    }

    /** Function : platform
     * This function returns the current platform
     * @return 'ios' for the iOS native platform
     * @return 'android' for the Android native platform
     * @return 'web' for the PWA
     */
    function platform() {
        if (gbPlatformIsIos()) {
            return 'ios';
        } else if (gbPlatformIsAndroid()) {
            return 'android';
        }
        return 'web';
    }

    /* Function : gbParam
    *  This function returns the value of an argument in location.href.
    *  @param name The name of the argument
    *  @return value
    */
    function gbParam(name) {
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results) return results[1];
        return '';
    }

    /* Function : gbIsEmpty
    *  This function tests if an object is empty.
    *  @param obj The action of the form
    *  @return true if the object is empty, false otherwise
    */
    function gbIsEmpty(obj) {
        var name;
        for (name in obj) {
            if (obj.hasOwnProperty(name)) {
                return false;
            }
        }
        return true;
    }

    /* Function : gbConstructQueryString
    *  This function construct a query string using the "params" dictionary.
    *  @param params The params to construct the query string
    *  @return The constructed query string
    */
    function gbConstructQueryString(params) {
        var queryString = "";
        var first = true;
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                if (!first)
                    queryString += "&";
                first = false;
                queryString += key + "=" + params[key];
            }
        }
        return queryString;
    }

    /* Function : gbPostRequest
    *  In native engines and devmode, this function creates a form in document.body and send a POST request to "path" using "getParams" and "postParams".
    *  In Webapp engine, this function delegates its action to the parent window.
    *  @param path The action of the form
    *  @param params The params to send in the request body
    */
    function gbPostRequest(path, getParams, postParams) {
        var formAction = path;
        if (!gbIsEmpty(getParams))
            formAction += "?" + gbConstructQueryString(getParams);

        if (gbAngularMode) {
            window.parent.postMessage({url: formAction, params: postParams}, '*');
        } else if (gbPlatformIsIos()) {
            const message = JSON.stringify({url: formAction, params: postParams})
            window.webkit.messageHandlers.gbObserver.postMessage(message);
        } else if (gbPlatformIsAndroid()) {
            Android.post(formAction, JSON.stringify(postParams));
        }
    }

    /* Function : gbGetRequest
    *  In native engines, this function launches a navigation to "destination".
    *  In Webapp engine, this function sends the "destination" to parent window with the PostMessage Api
    *  @param path The destination path
    *  @param params (optional) The params to send in the request body
    */
    function gbGetRequest(path, getParams) {
        getParams = getParams || {};
        var destination = path;
        if (!gbIsEmpty(getParams))
            destination += "?" + gbConstructQueryString(getParams);

        if (gbDebuggingMode >= 1)
            alert(destination);

        if (gbDebuggingMode < 2) {
            if (gbAngularMode) {
                window.parent.postMessage({url: destination}, '*');
            } else if (gbPlatformIsIos()) {
                const message = JSON.stringify({url: destination})
                window.webkit.messageHandlers.gbObserver.postMessage(message);
            } else {
                // Timeout 0 in case of consecutive calls to this method
                window.setTimeout(function () {
                    document.location.replace(destination);
                }, 0);
            }
        }
    }

    function gbXHRequest(requestMethod, tag, path, postParams) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 0)) {
                gbRequestDidSuccess(tag, xhr.responseText, '');
            }
        };
        xhr.open(requestMethod, path, true);
        xhr.send(null);
    }

    function gbHTTPRequest_Deprecated(resourceUrl, tag, cache, requestMethod, postParams) {
        if (gbDevMode && gbToken == '') {
            setTimeout(function () {
                gbHTTPRequest_Deprecated(resourceUrl, tag, cache, requestMethod, postParams)
            }, 200);
            return;
        }

        postParams = postParams || {};
        requestMethod = requestMethod || "GET";

        if (gbDevMode) {
            resourceUrl += (resourceUrl.match(/\?/g) ? '&' : '?') + 'gbToken=' + gbToken;
            gbXHRequest(requestMethod, tag, resourceUrl, postParams);
            return;
        } else {
            if (requestMethod == "GET") {
                gbGetRequest("goodbarber://request", {
                    "url": encodeURIComponent(resourceUrl),
                    "tag": tag,
                    "cache": cache,
                    "method": requestMethod
                });
                return;
            } else {
                gbPostRequest("goodbarber://request", {
                    "url": encodeURIComponent(resourceUrl),
                    "tag": tag,
                    "cache": cache,
                    "method": requestMethod
                }, postParams);
                return;
            }
        }
    }


    /************* Website *************/

    /*
     * The postMessage API is used to communicate between the Website and the custom code page.
     * Messages contain data sent by the website containing a method and sometimes parameters.
     */
    window.addEventListener("message", function (event) {

        /* Function : gbWebsiteInitPlugin
         * Initialize the plugin for GB Website
         */
        function gbWebsiteInitPlugin() {
            gbAngularMode = true;
            gbDevMode = false;

            // Test if context is iFrame
            if (window.self !== window.top) {
                // Intercept clicks on links in order to call the corresponding method
                window.addEventListener("click", function (evt) {
                    const target = evt.target.closest("a");
                    if (target) {
                        const href = target.getAttribute("href") || "";
                        const isAnchor = href.startsWith("#");
                        const isJS = target.protocol.startsWith("javascript");
                        if (!isAnchor && !isJS) {
                            evt.preventDefault();
                            parent.postMessage({url: href}, "*");
                            return false;
                        }
                    }
                });
            }
        }

        /* Function : gbWebsiteSetData
         * Set a variable with data
         * @param name The name of the variable
         * @param value The value of the variable
         */
        function gbWebsiteSetData(name, value) {
            window[name] = value;
        }

        /* Function : gbWebsiteCallback
         * Call the callback function asked by the Website if it exists
         */
        function gbWebsiteCallback(method, args) {
            var callbackFn = window[method];
            if (callbackFn) {
                callbackFn.apply(this, args);
            }
        }

        /*  Function : gbWebsiteOnLoad
         * Callback function for functions to be triggered on load
         */
        function gbWebsiteOnLoad() {
            if (typeof gbjs.onload == 'function') {
                gbjs.onload();
            }
        }

        /* Function : gbWebsiteOnLogin
         * Callback function for functions to be triggered on login
         */
        function gbWebsiteOnLogin() {
            if (typeof gbjs.user.onlogin == 'function') {
                gbjs.user.onlogin();
            }
        }

        /* Function : gbWebsiteOnLogout
         * Callback function for functions to be triggered on logout
         */
        function gbWebsiteOnLogout() {
            if (typeof gbjs.user.onlogout == 'function') {
                gbjs.user.onlogout();
            }
        }

        /*  Function : gbWebsiteOnAppear
         * Callback function for functions to be triggered on appear
         */
        function gbWebsiteOnAppear() {
            if (typeof gbjs.onappear == 'function') {
                gbjs.onappear();
            }
        }

        /*  Function : gbWebsiteStoreGBGlobalData
        * Set a variable with data
        * @param where The name of the variable
        * @param what The value of the variable
        */
        function gbWebsiteStoreGBGlobalData(where, what) {
            window['_GB'] = ({
                ...(window['_GB'] || {}),
                [where]: what
            })
        }

        // if (event.origin != window.document.origin) {
        // 	return;
        // }

        var method;
        var params;
        if (event.data) {
            method = event.data.method;
            params = event.data.params;
        }

        if (method == 'gbWebsiteInitPlugin') {
            gbWebsiteInitPlugin();
        } else if (gbAngularMode == true && method == 'gbWebsiteSetData') {
            gbWebsiteSetData(params[0], params[1]);
        } else if (method == 'gbWebsiteStoreGBGlobalData') {
            gbWebsiteStoreGBGlobalData(params[0], params[1]);
        } else if (method == 'gbWebsiteOnLoad') {
            gbWebsiteOnLoad();
        } else if (method == 'gbWebsiteOnAppear') {
            gbWebsiteOnAppear();
        } else if (method == 'gbWebsiteOnLogin') {
            gbWebsiteOnLogin();
        } else if (method == 'gbWebsiteOnLogout') {
            gbWebsiteOnLogout();
        } else if (gbAngularMode == true) {
            // The method is a callback
            gbWebsiteCallback(method, params);
        }

    });

    /************* GoodBarber App API Functions *************/

    /************* [GB App API] Events *************/

    function onLoad() {
        gbjs.log('The custom code has been loaded. To handle this event you can use the gb.onload property.');
    }

    function onAppear() {
        gbjs.log('The custom code appared on the screen. To handle this event you can use the gb.onappear property.');
    }

    /************* [GB App API] Other Methods *************/

    /* Function : share
    *  Ask the user to share a content on a social network.
    *  @param text The text to share
    *  @param link The link to share
    */
    function share(text, link) {
        text = text || "";
        link = link || "";
        gbGetRequest("goodbarber://share", {"text": encodeURIComponent(text), "link": encodeURIComponent(link)});
    }

    /* Function : getPhoto
    *  Ask the user to take or choose a photo
    *  @param mediaSource The source (camera or library) | values : [all(default)|camera|library]
    */
    function getPhoto(mediaSource = "all") {
        mediaSource = mediaSource || "all";
        gbGetRequest("goodbarber://getmedia", {"type": "photo", "source": mediaSource});
    }

    /* Function : getVideo
    *  Ask the user to take or choose a video
    *  @param mediaSource The source (camera or library) | values : [all(default)|camera|library]
    */
    function getVideo(mediaSource = "all") {
        mediaSource = mediaSource || "all";
        gbGetRequest("goodbarber://getmedia", {"type": "video", "source": mediaSource});
    }

    /* Function : getLocation
    *  Asks for the user geolocation.
    */
    function getLocation() {
        function success(position) {
            gbDidSuccessGetLocation(position.coords.latitude, position.coords.longitude);
        }

        function fail(error) {
            switch (error.code) {
                case error.TIMEOUT:
                    gbDidFailGetLocation('Timeout');
                    break;
                case error.POSITION_UNAVAILABLE:
                    gbDidFailGetLocation('Position unavailable');
                    break;
                case error.PERMISSION_DENIED:
                    gbDidFailGetLocation('Permission denied');
                    break;
                case error.UNKNOWN_ERROR:
                    gbDidFailGetLocation('Unknown error');
                    break;
            }
        }

        var options = {
            timeout: 15000
        };

        if (gbDevMode) {
            navigator.geolocation.getCurrentPosition(success, fail, options);
        } else {
            gbGetRequest("goodbarber://getlocation");
        }
    }

    /* Function : gbGetTimezoneOffset
    * Asks for the time difference between UTC time and local time, in minutes.
    */
    function getTimezoneOffset() {
        gbGetRequest("goodbarber://gettimezoneoffset");
    }

    /* Function : log
    *  Console log a string. Useful to log in native iOS with NSLogs
    */
    function log(log) {
        if (gbPlatformIsIos()) {
            gbPostRequest("goodbarber://log", {}, {"log": log})
        } else {
            console.log(log);
        }
    }

    /* Function : alert
    *  Display an alert
    */
    function _alert(title, message) {
        if (gbPlatformIsIos()) {
            gbGetRequest("goodbarber://alert?title=" + encodeURIComponent(title) + '&message=' + encodeURIComponent(message));
        } else {
            alert(title + '\n' + message);
        }
    }

    /* Function : print
    *  Print the content of the page
    */
    function print() {
        if (!gbAngularMode) {
            gbGetRequest("goodbarber://print");
        } else {
            window.print();
        }
    }

    /************* [GB App API] Device Methods *************/

    /* Function: contextUUID
    * Returns the UUID of the current custom code page or widget
    */
    function contextUUID() {
        if (typeof _GB == "undefined") {
            return "";
        }
        return _GB["contextUUID"];
    }

    var device = {
        contextUUID: contextUUID
    };


    /************* [GB App API] Navigation Methods *************/

    /* Function: href
    * Returns the url of the current custom code page
    */
    function href() {
        if (typeof _GB == "undefined") {
            return "";
        }
        return _GB["href"];
    }

    /* Function: arguments
    * Returns the parameters passed throught the url of the page
    */
    function params() {
        if (typeof _GB == "undefined") {
            return {};
        }
        return _GB["params"];
    }

    /* Function : back
    *  Go path to the previous custom code page
    */
    function back() {
        gbGetRequest("goodbarber://navigate.back");
    }

    /* Function : open
    *  Opens the url in a new window of the browser
    *  @param url The url to open
    */
    function open(url) {
        var params = {"url": encodeURIComponent(url)};
        gbGetRequest("goodbarber://openExternal", params);
    }

    /* Function : mail
    *  Launches the mail Composer.
    *  @param to The destination address
    *  @param subject (optional) The mail subject
    *  @param body The (optional) mail content
    */
    function mail(to, subject, body) {
        to = to || "";
        subject = subject || "";
        body = body || "";
        gbGetRequest("mailto:" + to, {"subject": encodeURIComponent(subject), "body": encodeURIComponent(body)});
    }

    /* Function : maps
    *  Launches the Maps native application.
    *  @param params The parameters to pass in the query string
    */
    function maps(params) {
        params = params || {};
        if (gbDevMode || gbAngularMode) {
            var baseUrl = 'https://maps.google.com/maps?'
            var queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
            open(baseUrl + queryString);
            return;
        }

        if (gbIsEmpty(params))
            gbGetRequest("goodbarber://maps?q=");
        else
            gbGetRequest("goodbarber://maps", params);
    }

    var location = {
        href: href,
        params: params,
        back: back,
        open: open,
        mail: mail,
        maps: maps
    };

    Object.defineProperty(location, 'href', { //<- This object is called a "property descriptor".
        //Alternatively, use: `get() {}`
        get: function () {
            return href();
        },
        //Alternatively, use: `set(newValue) {}`
        set: function (newValue) {
            gbGetRequest(newValue);
        }
    });

    /************* [GB App API] Storage Methods *************/

    function setItem(key, item) {
        var obj = {}
        obj['value'] = item;
        var json = JSON.stringify(obj);
        gbPostRequest("goodbarber://gbsetstorageitem", {}, {"item": json, "key": key});
    }

    function getItem(key, callback) {
        var cb = "function(value) {\
        var _f = " + callback + ";\
        if (!value) {\
           _f();\
           return;\
        }\
        var obj = JSON.parse(value);\
        if (!obj) {\
           _f();\
           return;\
        }\
        _f(obj['value']);\
       }";
        var s = gbCallbackToString(cb);
        gbPostRequest("goodbarber://gbgetstorageitem", {}, {"callback": s, "key": key});
    }

    function removeItem(key) {
        gbPostRequest("goodbarber://gbremovestorageitem", {}, {"key": key});
    }

    function clear() {
        gbPostRequest("goodbarber://gbclearstorage", {});
    }

    function keys(callback) {
        var s = gbCallbackToString(callback);
        gbPostRequest("goodbarber://gbgetstoragekeys", {}, {"callback": s});
    }

    var storage = {
        setItem: setItem,
        getItem: getItem,
        removeItem: removeItem,
        clear: clear,
        keys: keys
    };


    /************* [GB App API] Files access Methods *************/

    function fileFetch(filename, successCallback = () => {}, errorCallback = () => {}) {
        if (platform() == "android") {
            try {
                let xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            successCallback(xhr.responseText);
                            return;
                        } else {
                            var error = new GBError();
                            error.code = 0;
                            error.message = 'Error unknown';
                            errorCallback(error);
                            return;
                        }
                    }
                };
                xhr.open("GET", filename);
                xhr.send();
            } catch (e) {
                var error = new GBError();
                error.code = 1;
                error.message = "Error loading file: " + e;
                errorCallback(error);
                return;
            }
        } else {
            fetch(filename)
                .then(response => {
                    if (response.ok) {
                        response.text();
                    }
                    throw new Error(response.statusText);
                })
                .then(value => {
                    console.log(value);
                    successCallback(value);
                    return;
                })
                .catch(e => {
                    var error = new GBError();
                    error.code = 1;
                    error.message = "Error loading file: " + e.message;
                    errorCallback(error);
                    return;
                });
        }
    }

    var files = {
        fetch: fileFetch
    };


    /************* [GB App API] HTTP Request Methods *************/

    function gbHTTPRequest(url, method = "GET", params = {}, headers = {}, successCallback = "", errorCallback = "") {
        if (gbDevMode && gbToken == '') {
            setTimeout(function () {
                gbHTTPRequest(url, method, params, headers)
            });
            return;
        }

        if (gbDevMode) {
            resourceUrl += (resourceUrl.match(/\?/g) ? '&' : '?') + 'gbToken=' + gbToken;
            // TODO:
            return;
        }

        p = {
            "url": url,
            "method": method,
            "headers": JSON.stringify(headers),
            "params": JSON.stringify(params),
            "successCallback": gbCallbackToString(successCallback),
            "errorCallback": gbCallbackToString(errorCallback)
        };
        gbPostRequest("goodbarber://gbrequest", {}, p);
        return;
    }

    /* Function : get
    *  Starts a GET request to the url resource.
    *  @param url The url of the resource to load
    *  @param settings A set of key/value pairs that configure the request. All settings are optional.
    *  		params : A set of key/value paris that be sent to the server.
    *		headers : An object of additional header key/value pairs to send along with requests.
    *		success : A function to be called if the request succeeds.
    *		error : A function to be called if the request fails.
    */
    function get(url, settings = {}) {
        var httpHeaders = settings['headers'];
        var success = settings['success'];
        var error = settings['error'];
        return gbHTTPRequest(url, 'GET', null, httpHeaders, success, error);
    }

    /* Function : post
    *  Starts a POST request to the url resource.
    *  @param url The url of the resource to load
    *  @param settings A set of key/value pairs that configure the request. All settings are optional.
    *  		params : A set of key/value paris that be sent to the server.
    *		headers : An object of additional header key/value pairs to send along with requests.
    *		success : A function to be called if the request succeeds.
    *		error : A function to be called if the request fails.
    */
    function post(url, settings = {}) {
        var params = settings['params'];
        var httpHeaders = settings['headers'];
        var success = settings['success'];
        var error = settings['error'];
        return gbHTTPRequest(url, 'POST', params, httpHeaders, success, error);
    }

    /* Function : patch
    *  Starts a PATCH request to the url resource.
    *  @param url The url of the resource to load
    *  @param settings A set of key/value pairs that configure the request. All settings are optional.
    *  		params : A set of key/value paris that be sent to the server.
    *		headers : An object of additional header key/value pairs to send along with requests.
    *		success : A function to be called if the request succeeds.
    *		error : A function to be called if the request fails.
    */
    function patch(url, settings = {}) {
        var params = settings['params'];
        var httpHeaders = settings['headers'];
        var success = settings['success'];
        var error = settings['error'];
        return gbHTTPRequest(url, 'PATCH', params, httpHeaders, success, error);
    }

    /* Function : put
    *  Starts a PUT request to the url resource.
    *  @param url The url of the resource to load
    *  @param settings A set of key/value pairs that configure the request. All settings are optional.
    *  		params : A set of key/value paris that be sent to the server.
    *		headers : An object of additional header key/value pairs to send along with requests.
    *		success : A function to be called if the request succeeds.
    *		error : A function to be called if the request fails.
    */
    function put(url, settings = {}) {
        var params = settings['params'];
        var httpHeaders = settings['headers'];
        var success = settings['success'];
        var error = settings['error'];
        return gbHTTPRequest(url, 'PUT', params, httpHeaders, success, error);
    }

    /* Function : delete
    *  Starts a DELETE request to the url resource.
    *  @param url The url of the resource to load
    *  @param settings A set of key/value pairs that configure the request. All settings are optional.
    *  		params : A set of key/value paris that be sent to the server.
    *		headers : An object of additional header key/value pairs to send along with requests.
    *		success : A function to be called if the request succeeds.
    *		error : A function to be called if the request fails.
    */
    function _delete(url, settings = {}) {
        var params = settings['params'];
        var httpHeaders = settings['headers'];
        var success = settings['success'];
        var error = settings['error'];
        return gbHTTPRequest(url, 'DELETE', params, httpHeaders, success, error);
    }

    var request = {
        get: get,
        post: post,
        patch: patch,
        put: put,
        delete: _delete
    };


    /************* [GB App API] Users Methods *************/

    function getCurrentUser(successCallback, errorCallback) {
        var success = gbCallbackToString(successCallback);
        var error = gbCallbackToString(errorCallback);
        gbPostRequest("goodbarber://gbgetcurrentuser", {}, {"successCallback": success, "errorCallback": error});
    }

    function openLogin() {
        gbGetRequest("/login");
    }

    function logoutUser() {
        gbGetRequest("/logout");
    }

    function onLoginUser() {
        gbjs.log('An user has been logged in. To handle this event you can use the gb.user.onlogin property.');
    }

    function onLogoutUser() {
        gbjs.log('An user has been logged out. To handle this event you can use the gb.user.onlogout property.');
    }

    function onUpdateUser() {
        gbjs.log('The logged in user has been updated. To handle this event you can use the gb.user.onupdate property.');
    }

    var user = {
        getCurrent: getCurrentUser,
        openLogin: openLogin,
        logout: logoutUser,
        onlogin: gbjs && gbjs.user && gbjs.user.onlogin || onLoginUser,
        onlogout: gbjs && gbjs.user && gbjs.user.onlogout || onLogoutUser,
        onupdate: gbjs && gbjs.user && gbjs.user.onupdate || onUpdateUser
    };

    /************* [GB App API] Memberships extension Methods *************/

    function getAccessLevels(successCallback, errorCallback) {
        var success = gbCallbackToString(successCallback);
        var error = gbCallbackToString(errorCallback);
        gbPostRequest("goodbarber://gbgetaccesslevels", {}, {"successCallback": success, "errorCallback": error});
    }

    var membership = {
        getAccessLevels: getAccessLevels,
    }

    /************* [GB App API] Deprecated Methods *************/

    var deprecated = {
        pluginRequest: gbGetRequest,
    }

    // public members, exposed with return statement
    var result = {
        init: init,
        platform: platform,
        deprecated: deprecated,
        onload: gbjs && gbjs.onload || onLoad,
        onappear: gbjs && gbjs.onappear || onAppear,
        version: version,
        device: device,
        location: location,
        storage: storage,
        files: files,
        request: request,
        user: user,
        membership: membership,
        share: share,
        getPhoto: getPhoto,
        getVideo: getVideo,
        getLocation: getLocation,
        getTimezoneOffset: getTimezoneOffset,
        log: log,
        alert: _alert,
        print: print
    };

    Object.defineProperty(result, 'location', { //<- This object is called a "property descriptor".
        //Alternatively, use: `get() {}`
        get: function () {
            return location;
        },
        //Alternatively, use: `set(newValue) {}`
        set: function (newValue) {
            gbGetRequest(newValue);
        }
    });

    gbjs = result;
    return result;

})(gb);

/************* GoodBarber App API Functions *************/

/************* [GB App API] HTTP Request Methods *************/

/* Function : gbRequest
*  Starts a request to the url resource, using the "method" method, and passing the "postParams" params if method==POST.
*  @param resourceUrl The url of the resource to load
*  @param tag A tag to identify the request
*  @param cache YES if you want to use the app's cache mechanism, NO otherwise
*  @param requestMethod The HTTP method you want to use for the request
*  @param postParams If method==POST, you can pass HTTP Post Params in your request
*/

/*
*  	This function is deprecated
*	You should now use both gb.get() & gb.post() functions
*/
function gbRequest(resourceUrl, tag, cache, requestMethod, postParams) {
    if (requestMethod == "POST") {
        return gb.post(resourceUrl, {
            params: postParams,
        });
    } else {
        return gb.get(resourceUrl);
    }
}

/************* [GB App API] Other Methods *************/

/* Function : gbShare
*  Ask the user to share a content on a social network.
*  @param shareText The text to share
*  @param shareLink The link to share
*/

/*
*  	This function is deprecated
*	You should now use the gb.share() function
*/
function gbShare(shareText, shareLink) {
    return gb.share(shareText, shareLink);
}

/* Function : gbGetMedia
*  Ask the user to take or choose a picture/movie.
*  @param mediaType The type of media that you want the user to take or choose | values : [photo(default)|video]
*  @param mediaSource The source (camera or library) | values : [all(default)|camera|library]
*/

/*
*  	This function is deprecated
*	You should now use both gb.get() & gb.post() functions
*/
function gbGetMedia(mediaType, mediaSource) {
    mediaType = mediaType || "photo";
    if (mediaType == "photo") {
        return gb.getPhoto(mediaSource);
    } else {
        return gb.getVideo(mediaSource);
    }
}

/* Function : gbGetLocation
*  Asks for the user geolocation.
*/

/*
*  	This function is deprecated
*	You should now use the gb.getLocation() function
*/
function gbGetLocation() {
    return gb.getLocation();
}

/* Function : gbGetTimezoneOffset
* Asks for the time difference between UTC time and local time, in minutes.
*/

/*
*  	This function is deprecated
*	You should now use the gb.getTimezoneOffset() function
*/
function gbGetTimezoneOffset() {
    return gb.getTimezoneOffset();
}

/* Function : gbGetUser
*  Get the currently connected user. Will call the fail handler gbDidFailGetUser if no user is connected.
*/

/*
*  	This function is deprecated
*/
function gbGetUser() {
    return gb.deprecated.pluginRequest("goodbarber://getuser");
}

/* Function : gbLogs
*  Console log a string. Useful to log in native iOS with NSLogs
*/

/*
*  	This function is deprecated
*	You should now use the gb.log() function
*/
function gbLogs(log) {
    return gb.log(log);
}

/* Function : gbAlert
*  Display an alert
*/

/*
*  	This function is deprecated
*	You should now use the gb.alert() function
*/
function gbAlert(title, message) {
    return gb.alert(title, message);
}

/* Function : gbPrint
*  Print the content of the page
*/

/*
*  	This function is deprecated
*	You should now use the gb.print() function
*/
function gbPrint() {
    return gb.print();
}

gb.init();