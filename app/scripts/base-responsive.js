//fix for browsers that do not support console for JS debugging
if (!(window.console && console.log)) {
    console = {
        log: function () { }
    };
}

var $$ash = {
    ajaxFail: function (contentEle, message, xhr) {
        var errorMessage = (message) ? message : 'This request could not be completed. Please try again or contact us.',
            messageMarkup = $('<div/>', {
            'class': 'ajax-error',
                'style': 'display: none'
            });

        messageMarkup.text(errorMessage);

        contentEle.siblings('.ajax-error').remove().end().before(messageMarkup);

        messageMarkup.slideDown();

        if (xhr) {
            if (xhr.status === 302) {
                window.location.reload(); //refresh
            }
        }
    },

    //Global variables for media queries
    //Usage example: $$ash.mq('sm', 'min')
    mq: function (num, exp) {
        var size,
            def = false;
        switch (num) {
            case 'xxs':
                num = 320;
                break;
            case 'xs':
                num = 500;
                break;
            case 'sm':
                num = 767;
                break;
            case 'md':
                num = 992;
                break;
            case 'lg':
                num = 1200;
                break;
            default:
                num = num; //allows usage of manually entered pixel width in the call, for 'abnormal' widths
                def = true;
        }
        switch (exp) {
            case 'min':
                exp = 'min-width';
                num = def ? num : num + 1; //adds 1 pixel if the expression is min-width and size is not entered manually
                break;
            default:
                exp = 'max-width';
        }
        size = '(' + exp + ': ' + num + 'px' + ')';
        return size;
    },

    formSuccess: function (obj, response) {
        response = $$ash.unstringJSON(response);
        //use "resetForm" class to trigger this function
        if (response.error === true) {
            $$ash.ajaxFail(obj, response.errorMessage);
        } else {
            var cont = obj.parent(),
                messageMarkup = $('<div/>', { //create a div with class message to put the message into
                    'class': 'status-message success',
                    'style': 'display: none'
                });

            messageMarkup.text(response.message);
            obj.siblings('.status-message.success').remove().end().before(messageMarkup);
            
            obj[0].reset();
            obj.find('select').select2('data', null); //reset select2

            messageMarkup.slideDown();
        }
    },
    userList: {
        removeUser: function (target, contClass) {
            var ele = target.closest('li'),
                cont = ele.closest(contClass),
                userId = target.attr('data-user-id');
            $.ajax({
                type: "POST",
                data: { user: userId },
                url: $(cont).data('ash-url'),
                success: function (response, textStatus, xhr) {
                    $$ash.reloadOnTimeout(xhr);

                    if (response.error) {
                        $$ash.ajaxFail(ele.parent(), response.errorMessage);
                    } else {
                        $$ash.userList.removeItem(ele, response);
                    }
                },
                error: function (xhr) {
                    $$ash.ajaxFail(ele.parent(), undefined, xhr);
                }
            });
        },
        removeItem: function (ele, r) {
            var thisHeight = ele.outerHeight();
            ele.addClass('ajax-success').css('height', thisHeight + 'px');
            ele.find('div').fadeOut({
                duration: 500,
                complete: function () {
                    ele.html('<div class="success-message"><span>' + r + '</span></div>');
                }
            });
        },
        tempErr: function (ele) {
            ele.text('error');
            ele.addClass('ajax-error');
        }
    },
    //init select 2 when not init with document ready
    initSelect2: function () {
        if (!Modernizr.touch && $.fn.select2) { //if not a touch device, run select2
            $('select').select2({
                minimumResultsForSearch: -1
            });
        }
    },
    //TEMPLATE RENDERING
    //To initiate, add the 'template-render-init' class to the <select>, <button>, or button-like element you wish to use as a "trigger"
    //The "trigger" then initites the 'getTemplateData' function that will GET the json and js-template file 
    //Be sure to have all the necessary data-attributes: 'data-json-url', 'data-ash-template-url', and 'data-ash-target-id'
    templateInitHelper: function (callback, triggerOverride) { //binds the template rendering to an event (click, dropdown change, etc) and sets the triggers
        var init = $('.template-render-init').not('.select2-container'); //filtering out select2-created placeholder divs

        if (!init.length) {
            init = triggerOverride; //optional: only if you want to use a different trigger class and callback
        }

        init.each(function () {
            var obj = $(this),
                trigr = obj,
                eventListener,
                dataValue = obj.data('value');

            if (obj.is('select')) {
                eventListener = 'change';
            } else {
                eventListener = 'click';
            }

            function setTrigger() {
                if (eventListener === 'change') {
                    trigr = obj.find('option:selected');
                }
                else if (eventListener === 'click') {
                    trigr.off('click'); //why?
                }

                $$ash.getTemplateData(trigr, trigr.attr('data-json-url'), trigr.attr('data-ash-template-url'), trigr.attr('data-ash-target-id'), callback);
            }

            if (obj.is('div, ul')) { //if div or ul, then instantly trigger template load
                setTrigger();
            }

            else {
                if (obj.is('select')) {
                    eventListener = 'change';
                } else {
                    eventListener = 'click';
                }

                if (dataValue) { //auto-fill fields/dropdowns if dataValue exists
                    obj.val(dataValue);
                    setTrigger();
                }
                obj.off(eventListener + '.renderInit').on(eventListener + '.renderInit', setTrigger);
            }
        });
    },
    handlebarsInit: function (obj, opts) { //cleaner version of templateRenderInit. Doesn't have as many functions, however.
        var target = opts.target || obj.attr('data-ash-target-id'),
            callback = opts.callback;

        $$ash.getHandlebarsTemplateAndJson(obj, {
            templateUrl: opts.templateUrl || obj.attr('data-ash-template-url'),
            jsonUrl: opts.jsonUrl || obj.attr('data-json-url'),
            jsonData: $$ash.unstringJSON(opts.jsonData),
            callback: function(data) {
                $$ash.renderTemplate(obj, data.template, data.json, target, callback);
            }
        });
    },
    getTemplateJson: function (obj, jsonUrl) { //function that returns the JSON only
        jsonUrl = jsonUrl || obj.attr('data-json-url');

        if (typeof jsonUrl === 'undefined') {
            throw ('error: JSON URL is not configured correctly. Please ensure you are either passing in a URL or that the HTML element has an attribute "data-json-url" with a valid path');
        } else {
            return $.getJSON(jsonUrl)
            .success(function (response, textStatus, xhr) {
                $$ash.reloadOnTimeout(xhr);

                if (response.error) {
                    $$ash.ajaxFail(target.parent(), jsonData.errorMessage);
                }
            })
            .fail(function (xhr) {
                $$ash.ajaxFail(obj, undefined, xhr);
            });
        }
    },
    getHandlebarsTemplate: function(trigr, templateUrl) {
        templateUrl = templateUrl || trigr.attr('data-ash-template-url');

        if (typeof templateUrl === 'undefined') {
            throw ('error: Template URL is not configured correctly. Please ensure you are either passing in a URL or that the HTML element has an attribute "data-ash-template-url" with a valid path');
        } else {
            return $.get(templateUrl)
            .success(function (response, textStatus, xhr) {
                $$ash.reloadOnTimeout(xhr);
            })
            .fail(function (xhr) {
                $$ash.ajaxFail(trigr, undefined, xhr);
            });
        }
    },
    getTemplateData: function (trigr, jsonUrl, templateUrl, targetId, callback) { //note, you can pass real json or just the path to the json
        var target = $(document.getElementById(targetId)), //the element to append or replace the content of with the new rendered template
            templateHtml,
            jsonData = {};

        templateUrl = templateUrl || trigr.attr('data-ash-template-url');
        jsonUrl = jsonUrl || trigr.attr('data-json-url');

        $$ash.addLoader(trigr.closest('div'), 'append', 'left');
        //if missing json and template, kill function to prevent issue where page reloads and freezes. this should be a rare case caused by bad markup
        if (!jsonUrl && !templateUrl) {
            return false;
        }

        if (!jsonUrl || typeof jsonUrl === 'object') { //if no jsonUrl or if function was passed actual JSON and not URL of JSON
            jsonData = jsonUrl;

            $.when(
                $.get(templateUrl, function (data, textStatus, xhr) {
                    $$ash.reloadOnTimeout(xhr);

                    templateHtml = data;
                })

            ).then(
            //success
                function () {
                    $$ash.renderTemplate(trigr, templateHtml, jsonData, target, callback);
                    $$ash.removeLoader();
                },
            //fail
                function (xhr) {
                    $$ash.ajaxFail(target.parent(), undefined, xhr);
                }
            );
        } else {
            $.when(
                $.getJSON(jsonUrl, function (data, textStatus, xhr) {
                    $$ash.reloadOnTimeout(xhr);

                    jsonData = data;
                }),
                $.get(templateUrl, function (data, textStatus, xhr) {
                    $$ash.reloadOnTimeout(xhr);

                    templateHtml = data;
                })

            ).then(
            //success
                function () {
                    if (jsonData.error) {
                        $$ash.ajaxFail(target.parent(), jsonData.errorMessage);
                    } else {
                        $$ash.renderTemplate(trigr, templateHtml, jsonData, target, callback);
                        $$ash.removeLoader();
                    }
                },
            //fail
                function (xhr) {
                    $$ash.ajaxFail(target.parent(), undefined, xhr);
                }
            );
        }
    },
    getHandlebarsTemplateAndJson: function (obj, opts) {
        var templateUrl = opts.templateUrl,
            jsonUrl = opts.jsonUrl,
            jsonData = opts.jsonData,
            callback = opts.callback,
            handlebarsData = {};

        $$ash.getHandlebarsTemplate(obj, templateUrl).done(function (response) {
            handlebarsData.template = response;

            if (jsonData) {
                handlebarsData.json = jsonData;

                callback(handlebarsData);
            } else {
                $$ash.getTemplateJson(obj, jsonUrl).done(function (response) {
                    handlebarsData.json = response;

                    callback(handlebarsData);
                });
            }
        });
    },
    renderTemplate: function (trigr, templateHtml, jsonData, target, callback, opts) {
        var template = Handlebars.compile(templateHtml),
            numberToLoad = trigr.data('number-to-load'), //optional data-attribute. how many json items to load?
            insertType = (opts && opts.insertType) || trigr.attr('data-insert-type') || 'html', //optional: prepend or append? if not specified, then it will simply replace everything.
            fn,
            valInput = $('input, textarea, select');

        target = (typeof target === 'object') ? target : $('#' + target); //if a function calls renderTemplate instead of getTemplate Data

        if (!target.length) { //invalid target will replace trigr with the new content
            target = trigr;
        }

        if (valInput.length) {
            valInput.each(function () {
                $$ashVal.clearValidation($(this));
            });
        }
        switch (insertType) { //TODO: AO: This switch can probably be taken out
            case 'prepend':
                insertType = 'prepend';
                break;
            case 'append':
                insertType = 'append';
                break;
            default:
                insertType = 'html';
                break;
        }
        
        if (!numberToLoad) {
            target[insertType](template(jsonData));

            if (!Modernizr.touch && $.fn.select2) { //if not a touch device, run select2
                var select = $('select');
                if (select.hasClass('search')) {
                    select.select2();
                } else if (select.not('.select2-offscreen')) {
                    select.select2({
                        minimumResultsForSearch: -1
                    });
                }
            }
            
            if (typeof callback === "function") {
                callback(trigr, jsonData, target);
            }
        }
        else {
            if (trigr.is('option')) {
                fn = $$ash.insertTemplateViaDropdown;
            } else {
                fn = $$ash.insertTemplateViaButton;
            }

            fn(trigr, template, jsonData, target, numberToLoad, insertType, callback);
        }

        if ($('form.validate').length) {
            $$ashVal.init();
        } //must run ashVal again in case there are new input fields to validate

        if ($('.user-progress').length) {
            $$ash.updateProgress();
        } //must run userProgress again in case progress values have changed

        //AO: Run this AFTER template insertion
    },
    insertTemplateViaDropdown: function (trigr, template, jsonData, target, numberToLoad, insertType, callback) {
        var newJsonData = {};

        for (var k in jsonData) {
            if (jsonData.hasOwnProperty(k)) {
                if (Object.prototype.toString.call(jsonData[k]) === '[object Array]') { //if jsonData[k] is Array
                    newJsonData[k] = jsonData[k].slice(0, numberToLoad);
                } else { //if key value is only a string
                    newJsonData[k] = jsonData[k];
                }
            }
        }

        target[insertType](template(newJsonData));

        $$ash.preventDefaultFormSubmit();

        if (typeof callback === "function") {
            callback(trigr, jsonData, target);
        }
    },
    insertTemplateViaButton: function (trigr, template, jsonData, target, numberToLoad, insertType, callback) {
        var newStartIndex;

        function insertData(startIndex) {
            var newJsonData = {},
                endSlice = startIndex + numberToLoad;

            for (var k in jsonData) {
                if (jsonData.hasOwnProperty(k)) {
                    if (Object.prototype.toString.call(jsonData[k]) === '[object Array]') { //if jsonData[k] is Array
                        newJsonData[k] = jsonData[k].slice(startIndex, endSlice);
                    } else {
                        newJsonData[k] = jsonData[k];
                    }
                }
            }
            target[insertType](template(newJsonData));
            newStartIndex = endSlice;

            $$ash.preventDefaultFormSubmit();

            if (typeof callback === "function") {
                callback(trigr, jsonData, target, endSlice);
            }
        }

        insertData(0);

        trigr.click(function () {
            insertData(newStartIndex);
        });
    },
    validate: function (obj, str) {
        if (!obj.parent('.tooltip-wrapper').length) {
            obj.addClass('invalid').wrap('<span class="tooltip-wrapper"></span>').after('<span class="tooltip-validation pre-holder"><span class="icon-InValid"></span>' + str + '</span>');
        }
    },
    clearValidation: function (obj) {
        obj.unwrap().removeClass('invalid').next().remove();
    },
    openModal: function () {
        $('.createModal').each(function () {
            var obj = $(this),
                modalMatch = $('.ashModalCont[data-ash-ashmodalmatch="' + obj.attr('data-ash-ashmodalmatch') + '"]'),
                modalCallback = obj.attr('data-ash-callback');
            if (modalCallback) {
                modalCallback = $$ash.getCallback(modalCallback); //pass data value through $$ash.getCallback function
            }
            obj.ashModal({
                'theContent': modalMatch,
                'callbackAfterClick': modalCallback,
                'closeContent': '<span class="icon-closeExit" title="close"></span>'
            });
        });
    },
    renderModal: function () {
        $('.createModal').each(function () {
            var obj = $(this);
            if (obj.data('ash-display-modal')) {
                $$ash.runModal(obj, 'click');
            }
        });
    },
    runModal: function (obj, trg) {
        obj.trigger(trg); //trigger function to run a modal
    },
    getCallback: function (obj) {
        var callback = null;
        if (obj) {
            callback = window; //set callback variable to window object
            if (obj.indexOf('.') > -1) {
                var cbObj = obj.split('.');
                for (var i = 0; i < cbObj.length; i++) {
                    callback = callback[cbObj[i]]; //add object nodes to window object
                }
                return callback;
            } else {
                callback = callback[obj];
                return callback;
            }
        } else {
            return callback;
        }
    },
    formatNum: function (obj) {
        obj += '';
        var x = obj.split('.'),
            x1 = x[0],
            x2 = x.length > 1 ? '.' + x[1] : '',
            regEx = /(\d+)(\d{3})/;
        while (regEx.test(x1)) {
            x1 = x1.replace(regEx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    },
    updateProgress: function () {
        $('.user-progress').each(function () {
            var obj = $(this),
                progress = Number(obj.find('.progress-current').text().replace(',', '')), //remove comma if number includes one
                goal = Number(obj.find('.progress-max').text().replace(',', '')), //remove comma if number includes one
                percent;
            if (progress > goal) { //if progress exceeds goal, stop progress bar from growing
                progress = goal;
            }
            percent = Math.floor((progress / goal) * 100) + '%';
            obj.find('.progress-current').width(percent);
            obj.attr('data-ash-percent', percent); //add percent in data tag (used when % is displayed)
        });
    },
    unstringJSON: function (data) { //function that parses 'data' into JSON if 'data' is a string.
        var json;

        if (typeof data === 'string' && data.length > 0) {
            try {
                json = $.parseJSON(data);
            } catch (e) {
                throw ('Unable to parse into JSON. Please double check input is valid.');
            }
        } else {
            json = data;
        }

        return json;
    },
    //async call to typekit to prevent scripts from blocking the page. this may result in FOUT but will prevent a bigger issue of an  
    //entire page of plain white waiting for scripts to load, especially if typekit is blocked on the users machine
    getTypeKit: function (typeKitId) {
        var typekitConfig = {
            kitId: typeKitId //declared in site-specific (ie: sf.js) JS file
        };
        var d = false;
        var tk = document.createElement('script');
        tk.src = '//use.typekit.net/' + typekitConfig.kitId + '.js';
        tk.type = 'text/javascript';
        tk.async = 'true';
        tk.onload = tk.onreadystatechange = function () {
            var rs = this.readyState;
            if (d || rs && rs != 'complete' && rs != 'loaded') return;
            d = true;
            try { Typekit.load(typekitConfig); } catch (e) { }
        };
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(tk, s);
    },
    cardsEqualHeight: function () {
        //ACTIVE EQUALHEIGHTS PLUGIN
        //cards lengh > 1 because EH only needed if more than one card
        if ($('html.no-flexbox ul.cards').length > 1) {
            var carLIs = $('html.no-flexbox .cards li .card-element'),
                winWth = $(window).width();

            carLIs.removeAttr('style');
            if (winWth > 750 && carLIs.length > 1) {
                carLIs.equalHeights({ 'overflow': 'visible' });
            }
        }
    },
    setDefaultOption: function (obj, text) {
        //if placeholder is present, set plcHdr variable
        var plcHdr = obj.attr('data-select2-placeholder') || obj.attr('data-placeholder');
        
        //if placeholder exists, use it instead of text value
        text = (plcHdr) ? plcHdr : text;
        //if no text object, kill the function so "null" doesnt show in the dropdown
        if (!text) {
            return false;
        }
        var firstOption = obj.find('option:first-child').text();
        if (firstOption) {
            obj.prepend('<option selected>' + text + '</option>');
        } else {
            if (Modernizr.touch) {
                //disables showing the option on IE, so only do this for touch
                obj.find('option:first-child').prop('disabled', true);
            }
        }
    },
    flexheightFallback: function () {
        $('html.no-flexbox .flexheight').each(function () {
            var obj = $(this);

            obj.find('.flex-content')
                .css('height', 'auto')
                .equalHeights({
                    'overflow': 'visible'
                });
        });
    },
    removeButtonOnSubmit: function (form) {
        var obj = form,
            btn = obj.find('input[type=submit]'),
            isNextBtn = btn.hasClass('next');
            loader = $('<div class="spinner"><img src="/Global/images/Base/Icon/icon_progress.gif" title="progress" alt="progress" /></div>');

        function resetForm(btn, loader) {
            btn.fadeIn();
            loader.remove();
        }

        if (isNextBtn === true) {
            loader.addClass('next');
        } 

        btn.hide().before(loader);

        obj.on('validationFail ajaxPostComplete', function () {
            resetForm(btn, loader);
        });
    },
    serializeDataToObject: function (form) { //important: all inputs need a unique name attribute!
        var inputs = form.find(':input').not('[type="submit"]'),
            ajaxData = {};

        inputs.each(function () {
            var obj = $(this),
                type = obj.attr('type'),
                key = obj.attr('name'),
                tempVal = "";

            if (typeof key === 'undefined') {
                throw ('Every input field requires a "name" attribute!');
            }

            if (ajaxData.hasOwnProperty(key) === false) {
                if (type === 'checkbox' || type === 'radio') {
                    throw ("Please don't use serializeDataToObject function with forms that contain checkboxes or radios yet");

                    //if (obj.is(':checked')) {
                    //    ajaxData[key] = obj.val();
                    //}
                } else {
                    ajaxData[key] = obj.val();
                }
            } else {
                if (type === 'radio') {
                    
                } else if (type === 'checkbox' && obj.is('checked')) { // must fix this
                    tempVal = ajaxData[key].constructor === Array ? ajaxData[key] : [ajaxData[key]];
                    ajaxData[key] = tempVal.concat([obj.val()]);
                } else {
                    tempVal = ajaxData[key].constructor === Array ? ajaxData[key] : [ajaxData[key]];
                    ajaxData[key] = tempVal.concat([obj.val()]);
                }
            }
        });
        return ajaxData;
    },
    reloadOnTimeout: function (xhr) {
        var responseHeaderJson = xhr ? $$ash.unstringJSON(xhr.getResponseHeader('X-Responded-JSON')) : null;

        if (responseHeaderJson) {

            if (responseHeaderJson.status === 401) {
                location.reload();
            }
        }
    },
    ajaxGet: function (opts) {
        var url = opts.url,
            callback = opts.callback,
            failMessage = opts.failMessage,
            failMessageLocation = opts.failMessageLocation,
            failFunction = opts.failFunction,
            completeFunction = opts.completeFunction;

        $.ajax({
            type: "GET",
            url: url,
            success: function (response, textStatus, xhr) {
                $$ash.reloadOnTimeout(xhr);

                if (response.error) {
                    $$ash.ajaxFail(failMessageLocation, response.errorMessage);
                } else {
                    if (typeof callback === 'function') {
                        callback(response);
                    }
                }
    },
            error: function (xhr) {
                $$ash.ajaxFail(failMessageLocation, failMessage, xhr);

                if (typeof failFunction === 'function') {
                    failFunction();
                }
            },
            complete: function (xhr, textStatus) {
                if (typeof completeFunction === 'function') {
                    completeFunction();
                }
            }
        });
    },
    connectedWidgetInit: function(json) { //LANDING PAGE DASHBOARD CONNECTED WIDGET
        var obj = $('.connectedWidget');

        $$ash.handlebarsInit(obj, {
            jsonData: $$ash.unstringJSON(json),
            callback: function () {

            }
        });
    },
    ashModalPrinter: function (logoImgs, content, cssLinks) { //print modal
        var newWindow = window.open('', '', 'width=800,height=600'); //open ne window
        newWindow.document.write('<!DOCTYPE html><html><head>'); //add opening head and html page
        cssLinks.each(function () { //add stylesheet from parent's html
            newWindow.document.write('<link rel="stylesheet" href="' + $(this).attr('href') + '">');
        });
        newWindow.document.write('</head><body><div class="logo-cont">');  //add closing head and logo container
        if (logoImgs) {
            logoImgs.each(function () {  //add logos from parent's html
                newWindow.document.write('<img src="' + $(this).attr('src') + '" />');
            });
        }

        newWindow.document.write('</div>' + content + '</body></html>');  //add closing html
        newWindow.document.close();
        newWindow.focus();
        newWindow.print();
        newWindow.close();
    },
    addLoader: function (obj, loaderPos, align) {  //add handlebars loader
        if ($('.loader').length === 0) {
            if (!align) {  //add alignment of loader, if avail
                align = '';
            }
            loader = '<div class="loader ' + align + '"><img src="/Global/images/Base/Icon/icon_progress.gif" title="progress" alt="progress" /></div>';  //loader html

            switch (loaderPos) {  //position loader in relation to select obj
                case 'replace':
                    obj.html(loader);
                    break;
                case 'after':
                    obj.after(loader);
                    break;
                case 'append':
                    obj.append(loader);
                    break;
                case 'before':
                    obj.before(loader);
                    break;
                default:
                    obj.before(loader);
            }
        }
    },
    removeLoader: function () {
        $('.loader').remove();  //remove loader
    },
    preventDefaultFormSubmit: function () { //all forms with class ajaxPost will have their default submit prevented
        $('form.ajaxPost').on('submit.prevent', function (e) {
            e.preventDefault();
        });
    }
}; 

//add the ability to preload files with Modernizr
yepnope.addPrefix('preload', function (resource) {
    resource.noexec = true;
    return resource;
});

Modernizr.load({
    test: Modernizr.sessionstorage, //check for sessionStorage support
    complete: function () {
        if (!sessionStorage.loader) { //if loader does not exist
            sessionStorage.loader = '/Global/images/Base/Icon/icon_progress.gif'; //make it exist
            Modernizr.load('preload!' + sessionStorage.loader); //then preload it
        }
    }
});

//OBJECT UTILITY FUNCTIONS 
var ObjFuncs = function () {
    var obj = this;

    obj.copyHtml = function (modObj) {
        obj.htmlStruc = modObj.html();
    };
    obj.pasteHtml = function () {
        return obj.htmlStruc;
    };
};

//SVG INLINE IMAGE REPLACEMENT
/*this takes the data-src attribute and gets the image on non-svg browsers to prevent svg browsers 
 * from making the call to the image even if they are using svg
 */
$.fn.ashImgGet = function () {
    var img = $(this);

    //setting it to a tiny URI first for an apparent IE8 bug. We would just replace src with data-src value, but if img doesn't...
    //... have src initially, then the next line below won't work. We may be able to take this line out after testing.
    img.attr('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAP///////yH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');

    img.attr('src', img.attr('data-src'));
};

//SETUP ASHMODAL
function setupAshModal(el) {
    //if element has data-ash-ashmodalformat attribute
    var obj = (el.attr('data-ash-ashmodalformat')) ? el : $('.modalOpen');
    obj.each(function () {
        var obj = $(this),
            modalMatch = $('.ashModalCont[data-ash-ashmodalmatch="' + obj.attr('data-ash-ashmodalmatch') + '"]'),
            modalClass = obj.attr('data-ash-addmodalclass') ? obj.attr('data-ash-addmodalclass') : null;
        
        obj.ashModal({
            'theContent': modalMatch,
            'closeContent': '<span class="icon-closeExit"><span class="hide-text">remove</span></span>',
            'addModalClass': modalClass
        });
    });
}

//HEALTHY ROADS PROGRESS BAR
$.fn.equalColumnWidth = function () {
    return this.each(function () {
        var obj = $(this),
            objItems = obj.find('li'),
            numbers = objItems.length;

        objItems.css('width', 98 / numbers + '%');
    });
};
var runEqualCols = function () {
    if (!$('.no-flexbox .tabs')) {
    $('.tabs').equalColumnWidth();
    }
};

//DATE CONTROLLER BUILDER
var DateController = function () {
    var dateControl = this,
        jsonCurrUrl;

    dateControl.needCustomSetup = true;
    dateControl.custForm = '#custForm';
    dateControl.ctrlFmt = 'mmmddyyyy';

    dateControl.initialize = function (obj) {
        //setup date controller by getting the current json from the src link from the attr 
        dateControl.ctrlSel = $('.' + obj + '-select');

        jsonCurrUrl = dateControl.ctrlSel.attr('data-current-json-url');

        return jsonCurrUrl;
    };
    dateControl.getData = function (ctlrObj, json) {
        if (!dateControl.ctrlSel) {
            dateControl.ctrlSel = ctlrObj;
        }
        $.getJSON(json, function (data) {
            //pull date data
            var startDate = data.summary.startDate,
                endDate = data.summary.endDate,
                previous = data.summary.previous,
                next = data.summary.next;
            if (json.error) {
                $$ash.ajaxFail(ctlrObj, data.errorMessage);
            } else {
                //setup control
                dateControl.setupDateCtrl(ctlrObj, startDate, endDate, previous, next);
            }

        }).fail(function (xhr) {
            $$ash.ajaxFail(ctlrObj, undefined, xhr);
            return false;
        });
    };
    dateControl.moveToNewDate = function (dateObj, newArrow, oldArrow) {
        oldArrow.attr('data-json-url', dateObj.attr('data-current-json-url'));
        dateObj.attr('data-current-json-url', newArrow.attr('data-json-url'));
    };
    dateControl.setupDateCtrl = function (dateObj, startDate, endDate, previous, next) {
        if (!dateControl.ctrlSel) {
            dateControl.ctrlSel = dateObj;
        }
        //setup date controller adding prev / next arrow btns and start and end dates
        var prevDate = dateObj.find('.prev[data-json-url]'),
            nextDate = dateObj.find('.next[data-json-url]'),
            datePeriod = dateObj.find('.date-period'),
            dateType = dateObj.attr('data-date-type') ? dateObj.attr('data-date-type'): dateControl.ctrlFmt;
        //save start and end date
        datePeriod.attr('data-date-start', startDate);
        datePeriod.attr('data-date-end', endDate);

        dateControl.resetArrows(prevDate, nextDate); //reset arrows
        //hide arrow if at the end of the data for each time period
        if (!previous) {
            previous = 'null';
            prevDate.addClass('arrowOff');
        }
        prevDate.attr('data-json-url', previous);
        if (!next) {
            next = 'null';
            nextDate.addClass('arrowOff'); 
        }
        nextDate.attr('data-json-url', next);
        //when arrows are selected, reset them
        dateObj.find('[data-json-url]').on('click', function (e) {
            e.preventDefault();
            dateControl.resetArrows(prevDate, nextDate);
        });
        //set up text for date period
        dateControl.displayDate(startDate, endDate, dateType);
    };
    dateControl.resetArrows = function (prevDate, nextDate) {
        prevDate.removeClass('arrowOff');
        nextDate.removeClass('arrowOff');
    };
    dateControl.displayDate = function (startDate, endDate, dateType) {
        var sDtConv = $.trim(dateControl.convertDate(startDate, dateType)),
            eDtConv = $.trim(dateControl.convertDate(endDate, dateType)),
            dtPer = dateControl.ctrlSel.find('.date-period');

        if (sDtConv === eDtConv) {
            dtPer.text(sDtConv);
        } else {
            dtPer.text(sDtConv + ' - ' + eDtConv);
        }
    };
    dateControl.convertDate = function (d, type) {  //convert json date to date control readable date
        if (d === undefined || type === undefined) {
            return;
        }
        if (d.indexOf('T') === -1) {
            d += 'T00:00:00';  //if not time in datetime stamp add one
        }

        var dt = d.split('T'), //split datetime from yyyy-mm-ddThh:mm:ss.ms
            dParts = dt[0].split('-'), //split date yyyy-mm-dd
            convDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);  //Date(yyyy, mm - 1, dd) sets the date

        var month = [];
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

        switch (type) {
            case 'mmmddyyyy':
                //example: January 12, 2014
                return month[convDate.getMonth()] + ' ' + convDate.getDate() + ', ' + convDate.getFullYear();
            case 'mmmyyyy':
                //example: January 2014
                return month[convDate.getMonth()] + ' ' + convDate.getFullYear();
            case 'mm/dd/yyyy':
                //example: 01/12/2014
                var mo = (convDate.getMonth() + 1),
                    moStr = mo <= 9 ? '0' + mo.toString() : mo,
                    da = convDate.getDate(),
                    daStr = da <= 9 ? '0' + da.toString() : da;
                return moStr + '/' + daStr + '/' + convDate.getFullYear();
            default:
                //example: January 12, 2014
                return month[convDate.getMonth()] + ' ' + convDate.getDate() + ', ' + convDate.getFullYear();
        }
    };
};
//handle complete event after template content is prepended
(function ($) {
    $.fn.ashPrepend = function (options) {
        $(this).find('.ash-prepend').each(function () {
            $(this).removeClass('ash-prepend');
        });
    };
})(jQuery);

//ashTab
(function ($) {
    $.fn.ashTab = function (options) {
        var defaults = {
            tabs: this.find('.ashTabTab > li'),
            cont: this.find('.ashTabContent > li'),
            activeClass: 'active-tab',
            iconClass: 'icon-ArrowRight'
        };

        var s = $.extend(defaults, options);

        return this.each(function () {
            var tabs = s.tabs,
                cont = s.cont,
                contLn = cont.length,
                contParent = cont.parent(),
                activeCont = s.cont.first(),
                activeClass = s.activeClass, //class added to the tabs
                activeT = $(tabs[activeCont.index()]), //set active tab to null, then check if it exists before removing active class (later)
                activeA = activeT.find('a'),
                activeIcon = $('<span class="' + s.iconClass + '"></span>');

            //hide all but first tabs content
            cont.not(activeCont).hide();
            //set active class to tab
            activeT.addClass(activeClass);
            activeA.prepend(activeIcon);

            //set parent height to tallest tab to avoid page height changing on tab change
            if (document.documentElement.clientWidth > 767) {
                for (var i = 0; i < contLn; i++) {
                    if (contParent.height() < $(cont[i]).outerHeight()) {
                        contParent.height($(cont[i]).outerHeight());
                    }
                    if (i === contLn) {
                        setHeights();
                    }
                }
            }

            function setHeights() {
                cont.each(function () {
                    $(this).height(contParent.height());
                });
            }

            tabs.on('click', showCont);

            function showCont(e) {
                e.preventDefault();
                //get current tab
                var tab = $(e.target);
                var ind = tab.parent().index(),
                    content = $(cont.get(ind)); //content is the content container whose index matches tab indexv

                //if activetab
                if (activeT) {
                    //remove class from that tab
                    activeT.removeClass(activeClass);
                    activeT.find('span[class*=icon-]').remove();
                }
                //set new active tab
                activeT = tab.closest('.tab');
                activeT.addClass(activeClass);
                activeT.find('a').prepend('<span class="' + s.iconClass + '"></span>');

                //remove old content
                activeCont.hide();
                //set new active content
                activeCont = content;
                //show content
                content.show();
            }
                });
    };
})(jQuery);

//Equal Heights Plugin
(function ($) {
    $.fn.equalHeights = function (options) {
        var defaults = {
            'minHeight': null,
            'maxHeight': null,
            'overflow': 'hidden'
        };

        var settings = $.extend({}, defaults, options);

        var minHeight = settings.minHeight,
            maxHeight = settings.maxHeight,
            overflow = settings.overflow;

        var tallest = (minHeight) ? minHeight : 0;

        this.each(function () {
            $(this).css("min-height", "auto");
            if ($(this).height() > tallest) {
                tallest = $(this).height();
            }
        });
        if ((maxHeight) && tallest > maxHeight) {
            tallest = maxHeight;
        }

        return this.each(function () {
            $(this).height(tallest).css("overflow", overflow);
        });
    };
})(jQuery);

//ASH Text Countdown Plugin
//To use, add the 'ash-countdown' class to the text field you want to apply the plug in to.
//Then add a "data-ash-maxlength" attribute to the same text field and insert the character limit.
//Finally, make sure you have a counter to display the amount of characters left. By default,
//the counter is going to be span.ash-countdown-counter.

(function ($) {
    $.fn.ashCountdown = function (options) {
        var defaults = {
            textField: $(this), //the text field
            counter: $(this).closest('label').find('.ash-countdown-counter') //counter text
        };

        var settings = $.extend({}, defaults, options);

        return this.each(function () {
            var s = settings;

            s.textField.on('keyup blur propertychange input', countdownInit);
            function countdownInit() {
                var maxLength = parseInt(s.textField.attr('data-ash-maxlength')),
                    textVal = s.textField.val(),
                    currentLength = textVal.length;
                if (currentLength < maxLength) {
                    s.counter.text(String(maxLength - currentLength) + ' characters left');
                }
                if (currentLength === maxLength) {
                    s.counter.text('Max characters reached');
                }
                if (currentLength > maxLength) {
                    s.counter.html('<span>' + String(maxLength - currentLength) + '</span> characters left');
                }
            }
            countdownInit();
        });
    };
})(jQuery);

//ASH PASSWORD INDICATOR PLUGIN
$.fn.ashPwInd = function (options) {

    var defaults = {
        'minLength': 8, //minimum length of pw
        'hasMinLength': true, //does pw require a min length? if not, set 'minLength' option to 1
        'lowercase': true, //pw requires lowercase
        'uppercase': true, //pw requires uppercase
        'number': true, //pw requires number
        'specialchar': true, //pw requires special character
        'specialcharRange': /[!@#$%~]/, //range of special characters TODO: UPDATE REGEX TO MATCH PW REQUIREMENTS
        'usermatch': true, //pw cannot match username (must set username in input.ash-pw-user - can be hidden)
        'norepeat': true, //pw cannot repeat 4 straight characters
        'showMatch': true, //has a second input to confirm password
        'pageContainer': 'div.layout-main',
        'pwList': 'ul.ash-pw-list ', //if you want a list that lists all the pw requirements
        'feedbackTarget': $(this), //the indicator will immediately follow this element
        'confirmFeedbackTarget': $('.ash-pw-ind-confirm'),
        'feedback': '<span class="ash-pw-feedback"></span>', //the actual indicator
        'tooltip': $('.tooltip-obj .tooltip'),
        'confirmFeedback': '<span class="ash-pw-feedback-confirm"></span>', //the indicator that says if the PW's match or not
        'passClass': 'pass', //class name applied to indicator when PW passes. insert 'icon-name' if icon desired instead of text
        'failClass': 'fail' //class name applied to indicator when PW. insert 'icon-name' if icon desired instead of text
    };

    var settings = $.extend({}, defaults, options);
    return this.each(function () {
        var obj = $(this),
            o = settings,
            minL = o.minLength,
            // THESE VARS ARE NOT USED. COMMENTING OUT FOR FUTURE REFERENCE
            //needLength = o.hasMinLength, 
            //lower = o.lowercase,
            //upper = o.uppercase,
            //num = o.number,
            //special = o.specialchar,
            //noRep = o.norepeat,
            //
            specialRange = o.specialcharRange,
            userM = o.usermatch,
            dispMatch = o.showMatch,
            container = o.pageContainer,
            pwList = o.pwList,
            passClass = o.passClass,
            failClass = o.failClass,
            feedbackTarget = o.feedbackTarget,
            confirmFeedbackTarget = o.confirmFeedbackTarget,
            feedback,
            tooltip = o.tooltip,
            confirmFeedback;

        feedbackTarget.after(o.feedback);
        confirmFeedbackTarget.after(o.confirmFeedback);

        feedback = feedbackTarget.next();
        confirmFeedback = confirmFeedbackTarget.next();

        obj.on('keyup focus', function () {
            checkPw($(this).val());
        });

        function checkPw(pw) {
            var str = 1,
                tooShort = true,
                missingLower = true,
                missingUpper = true,
                missingNumber = true,
                missingSpecial = true,
                repeats = true,
                matchUser = false;

            $(pwList + 'li.ash-pw-list-usermatch').addClass(passClass);
            $(container + ' input.ash-pw-ind-confirm').empty().val(''); //empty confirm input
            $(pwList + 'li').removeClass('pass'); //reset req list


            //check characters
            //length
            if (pw.length >= minL) {
                str += 1;
                tooShort = false;
                $(pwList + 'li.ash-pw-list-length').addClass(passClass);
            }
            //lowercase
            if (pw.match(/[a-z]/)) {
                str += 1;
                missingLower = false;
                $(pwList + 'li.ash-pw-list-lower').addClass(passClass);
            }
            //caps
            if (pw.match(/[A-Y]/)) {
                str += 1;
                missingUpper = false;
                $(pwList + 'li.ash-pw-list-upper').addClass(passClass);
            }
            //numbers
            if (pw.match(/[0-9]/)) {
                str += 1;
                missingNumber = false;
                $(pwList + 'li.ash-pw-list-num').addClass(passClass);
            }
            //special characters
            if (pw.match(specialRange)) {
                str += 1;
                missingSpecial = false;
                $(pwList + 'li.ash-pw-list-char').addClass(passClass);
            }
            //username match
            if (pw === $('input.ash-pw-user').val()) {
                str -= 1;
                matchUser = true;
                $(pwList + 'li.ash-pw-list-usermatch').addClass(failClass);
            }
            //character repeat
            if ((userM === true) && (!pw.match(/(.)\1\1\1/))) {
                str += 1;
                repeats = false;
                $(pwList + 'li.ash-pw-list-repeat').addClass(passClass);
            }
            if (matchUser) {
                tooltip.text('Your password cannot match your username.');
            }

            if (repeats) {
                tooltip.text('Your password cannot have more than 4 repeating characters.');
            }

            if (tooShort) {
                tooltip.text('Your password must be at least ' + minL + ' characters');
            }

            if (missingLower || missingUpper || missingNumber || missingSpecial) {
                tooltip.text('Your password must contain a combination of numbers, lowercase leathers, uppercase letters, and special characters.');
            }

            //change the feedback text
            (function () {
                if (pw.length === 0) {
                    feedback.hide();
                    tooltip.removeClass('active');
                    obj.on('blur', function () {
                        tooltip.removeClass('active');
                    });
                }
                else if (pw.length < minL && pw.length > 0) {
                    feedback.hide();
                    feedback.removeClass(passClass);

                    obj.on('blur', function () {
                        tooltip.addClass('active');
                    });

                    obj.on('focus', function () {
                        tooltip.removeClass('active');
                        feedback.removeClass('active');
                    });
                } else {
                    feedback.show();
                    obj.on('blur', function () {
                        tooltip.addClass('active');
                    });
                    if (str < 2) {
                        feedback.text('');
                    }
                    else if (str >= 2 && str < 4) {
                        feedback.text('Weak');
                        feedback.removeClass(passClass);
                    }
                    else if (str >= 4 && str < 7) {
                        feedback.text('Medium');
                        feedback.removeClass(passClass);
                    }
                    else {
                        feedback.text('Strong');
                        feedback.addClass(passClass);

                        obj.on('blur', function () {
                            tooltip.removeClass('active');
                        });
                    }

                    if (dispMatch) {
                        $(container + ' input.ash-pw-ind-confirm').on('keyup', function () {
                            confirmFeedback.text('New passwords must match').removeClass('pass');
                            if ($(this).val().length === 0) {
                                confirmFeedback.hide();
                            }
                            else if ($(this).val().length > 0) {
                                confirmFeedback.show();
                            }
                            if (($(this).val()) === obj.val() && obj.val().length >= minL) {
                                confirmFeedback.text('Passwords match').addClass('pass');
                            }
                        });
                    }
                }
            })(jQuery); //change indicator text

        } //checkPw
    }); //return
};

if ($('.flexslider').length == 0) { //TODO: Remove this plugin after a suitable grace period (03/04/2015)
    //ASH Flexible Slider Plugin v2
    (function ($) {
        $.fn.ashFlexSlide = function (options) {

            var defaults = {
                'reel': 'div.widget-ashFlexSlide-reel',
                'slide': 'div.widget-ashFlexSlide-slide',
                'leftArrw': 'a.ashFlexSlide-al',
                'rightArrw': 'a.ashFlexSlide-ar',
                'tabs': null,
                'anTime': 1000,
                'arrowsHidden': false,
                'timer': false,
                'tick': 6000,
                'hideBehindArrows': true,
                'noArrows': false,
                'resize': false,
                'resizeArrows': true
            };

            var settings = $.extend({}, defaults, options);

            return this.each(function (index) {
                var obj = $(this),
                    o = settings,
                    theReel = $(this).parent().find($(o.reel)),
                    theSlides = $(this).parent().find($(o.slide)),
                    prevArrow = $(this).parent().find($(o.leftArrw)),
                    nextArrow = $(this).parent().find($(o.rightArrw)),
                    tabNav = $(o.tabs),
                    animTime = o.anTime,
                    hideArrows = o.arrowsHidden,
                    useTimer = o.timer,
                    timerTick = o.tick,
                    noBehindArrows = o.hideBehindArrows,
                    woArrows = o.noArrows,
				    sizerSel = o.sizerSel,
				    resize = o.resize,
				    resizeArrows = o.resizeArrows,
                    slideWidth;

                if (woArrows === true) {
                    nextArrow = prevArrow = null;
                }
                if (noBehindArrows === true) {
                    var mainParContWidth = ($(this).parent().width());
                    //create new div to wrap everything
                    theReel.wrap('<div class="hideArrowCont" />');
                    var parentWidth = parseInt($(this).parent().width()) - (parseInt(prevArrow.css('padding-left')) * 2) - (parseInt(prevArrow.css('padding-right')) * 2);
                    $(this).find($('div.hideArrowCont')).css({ 'overflow': 'hidden', 'width': (parentWidth - (prevArrow.outerWidth() * 2)), 'left': (prevArrow.outerWidth()), 'position': 'relative', 'height': ($('div.hideArrowCont').parent().height()) });
                    //change css of parent container
                    var newParentWidth = mainParContWidth - (parseInt(prevArrow.css('width')) * 2);
                    //width of individual slides - they must all be the same width to work
                    theSlides.outerWidth(theReel.parent().width());
                    slideWidth = theSlides.outerWidth();
                }
                else {
                    //width of individual slides - they must all be the same width to work
                    theSlides.outerWidth(theReel.parent().width());
                    slideWidth = theSlides.outerWidth();
                }
                var currSlide = 0;

                //amount of slides
                var amtSlides = theSlides.length;
                //the timers if using timer animation
                var slideTimeOut;
                var allSlidesWidth;
                //set width of reel so it holds all slides side by side
                if (resizeArrows) {
                    prevArrow.height(theSlides.eq(0).height());
                    nextArrow.height(theSlides.eq(0).height());
                }

                if (resize) {
                    theSlides.has('img').width(theReel.parent().width());
                    theSlides.width(theReel.parent().width()); //match the image size to the reel
                    slideWidth = theSlides.outerWidth();
                    allSlidesWidth = amtSlides * slideWidth;
                    theReel.width(allSlidesWidth);
                    theReel.css({ 'position': 'relative' });
                    $(window).resize(function (e) {
                        theSlides.width(theReel.parent().width()); //match the image size to the reel
                        slideWidth = theSlides.outerWidth();
                        allSlidesWidth = amtSlides * slideWidth; //calculate the reel length = number of slides X the slide width
                        theReel.width(Math.floor(allSlidesWidth)); //add calculated width to the reel
                        if (currSlide !== 0) {
                            theReel.css({ 'left': -((currSlide * slideWidth) - 1) }); //calculate the current slide position
                        } else {
                            theReel.css({ 'left': 0 });
                        }
                        if (resizeArrows) {
                            prevArrow.height(theSlides.eq(0).height());
                            nextArrow.height(theSlides.eq(0).height());
                        }
                    });
                } else {
                    allSlidesWidth = amtSlides * slideWidth;
                    theReel.width(allSlidesWidth);
                    theReel.css({ 'position': 'absolute' });
                }
                if (theSlides.length === 1) {
                    prevArrow.hide();
                    nextArrow.hide();
                }
                //check if prev arrow exists
                if (prevArrow === null) {
                    //
                }
                else {
                    if (hideArrows === true) {
                        prevArrow.hover(
					    function () {
					        $(this).stop(true).fadeTo(1000, 0.8);
					    },
					    function () {
					        $(this).stop(true).fadeTo(1000, 0);
					    }
				    );
                    }
                    //LEFT ARROW ctrl
                    prevArrow.click(function () {
                        if (useTimer === true) {
                            resetTimer();
                        }
                        if (currSlide < 1) {
                            //move to the last slide in the rotation
                            currSlide = (amtSlides - 1);
                            theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing');
                        }
                        else {
                            currSlide--;
                            theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing');
                        }
                        //change tab/btns when arrow is clicked
                        //array through tabs
                        if (tabNav !== null) {
                            updateTabs();
                        }
                    });
                }

                //check if next arrow exists
                if (nextArrow === null) {
                    //
                }
                else {
                    if (hideArrows === true) {
                        nextArrow.hover(
					    function () {
					        $(this).stop(true).fadeTo(1000, 0.8);
					    },
					    function () {
					        $(this).stop(true).fadeTo(1000, 0);
					    }
				    );
                    }
                    //RIGHT ARROW ctrl
                    nextArrow.click(function () {

                        if (useTimer === true) {
                            resetTimer();
                        }
                        if (currSlide > (amtSlides - 2)) {
                            //go back to the first slide
                            currSlide = 0;
                            theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing');
                        }
                        else {
                            currSlide++;
                            theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing');
                        }
                        //change tab/btns when arrow is clicked
                        //array through tabs
                        if (tabNav !== null) {
                            updateTabs();
                        }
                    });
                }

                //check if tabbed nav exists
                if (tabNav === null) {
                    //
                }
                else {
                    //loop through each tab/btn
                    tabNav.each(function (index) {
                        //individual tab clicked
                        $(this).click(function () {
                            if (useTimer === true) {
                                resetTimer();
                            }
                            //set all tab classes back to normal
                            tabNav.removeClass('active');
                            //add active class to this tab only
                            $(this).addClass('active');
                            //move the reel
                            theReel.animate({ 'left': -(index * slideWidth) }, animTime, 'swing');
                            //change currSlide
                            currSlide = index;
                        });
                    });
                }

                //if using timer
                if (useTimer === true) {
                    slideTimeOut = setTimeout(changeSlide, timerTick);
                }

                var _resetSlides = function () {
                    //public accessible function to update slides for radio/slide interactivity
                    //set current slide to first slide
                    currSlide = 0;
                    //set slide position to show first slide
                    theReel.css({ 'left': 0 });
                    //calculate the amount of active slides
                    amtSlides = calcActiveSlides();
                    //calculate the cumulative width of all active slides
                    allSlidesWidth = amtSlides * slideWidth;
                    //set real width to cumulative with
                    theReel.width(allSlidesWidth);
                    //reset arrows to show
                    prevArrow.show();
                    nextArrow.show();
                    //if only one slide set, hide arrows
                    if (amtSlides === 1) {
                        prevArrow.hide();
                        nextArrow.hide();
                    }
                };
                function updateTabs() {
                    tabNav.removeClass('active');  //remove active class from all tabs
                    tabNav.eq(currSlide).addClass('active');  //make current tab active
                }
                function calcActiveSlides() {
                    var cntActiveSlides = 0;
                    theSlides.each(function () {
                        if ($(this).hasClass('active')) {
                            cntActiveSlides++;
                        }
                    });
                    return cntActiveSlides;
                }

                function changeSlide() {
                    if (useTimer === true) {
                        clearTimeout(slideTimeOut);
                    }
                    //                slideTimeOut = setTimeout(changeSlide, timerTick);
                    if (currSlide > (amtSlides - 2)) {
                        //go back to the first slide
                        currSlide = 0;
                        theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing', function () {
                            slideTimeOut = setTimeout(changeSlide, timerTick);
                        });
                    }
                    else {
                        currSlide++;
                        theReel.animate({ 'left': -(currSlide * slideWidth) }, animTime, 'swing', function () {
                            slideTimeOut = setTimeout(changeSlide, timerTick);
                        });
                    }
                    if (tabNav !== null) {
                        updateTabs();
                    }
                }


                function resetTimer() {
                    //cancel the timer so slides stop animating
                    clearTimeout(slideTimeOut);
                    //start a new timer to double the length of the original timer, so the user has time view the slide
                    slideTimeOut = setTimeout(changeSlide, (15000));
                }
                $(this).data('ashFlexSlide', { resetSlides: _resetSlides });
            }); //return
        };
    })(jQuery);
}

//ashAccordion (from base.js)
(function ($) {
    $.fn.ashAccord = function (options) {

        var defaults = {
            trigger: '.ashAccordTrigger', //ele that triggers the accordion
            triggerNewText: null,
            content: '.ashAccordContent', //content that hides/shows
            callback: null
        };

        var s = $.extend(defaults, options);

        return this.each(function () {
            var tr = $(this).find($(s.trigger)),
                newTxt = s.triggerNewText,
				callback = s.callback,
                content = $(this).find($(s.content));

            //if changing trigger html, save the original html in a var so content can toggle
            if (newTxt) {
                var origTxt = tr.html();
            }

            function changeText() {
                if (newTxt) {
                    if (content.is(':visible')) {
                        //if content is open, show alt text
                        tr.html(newTxt);
                    } else {
                        //show default text
                        tr.html(origTxt);
                    }
                }
            }

            tr.on('click', function (e) {
                e.preventDefault();
                content.slideToggle({
                    complete: function () {
                        changeText();
                        if (callback) {
                            s.callback.call(this);
                        }
                    }
                });
            });
        });
    };
})(jQuery);

//collapsible panel function
$.fn.ashCollapsible = function (options) {
    var defaults = {
        obj: this, //clickable header element,
        panel: null, //collapsible panel element (defaults to the next() element
        initHeight: 0, //initial height of collapsible panel (in pixels)
        startOpen: false, //should the panel be open on page load?
        maxPx: 1000, //maximum pixel height of collapsible panel
        maxPercent: 100, //maximum percentage height of collapsible panel
        iconContainer: 'span', //element that holds the icon class
        closedIconClass: null, //icon displayed when collapsible panel is open
        openedIconClass: null, //icon displayed when collapsible panel is closed
        keepOpen: true, //enable the ability to keep the collapsible panel open
        keepOpenMinMax: 'max', //min-width or max-width of browser window
        keepOpenWidth: 600, //width of browser window
        callbackExpand: null, //callback on panel expand
        callbackCollapse: null //callback on panel collapse
    };

    var s = $.extend({}, defaults, options);

    var panelHeight = s.initHeight,
        isModern = (Modernizr.csstransitions),
        panel = s.panel || s.obj.next(),
        altText = s.headerAltText,
        hideHdr = s.obj.data('hide') || false;
    
    return this.each(function () {
        var obj = $(this);
        
        //set initial height
        if (s.startOpen) {
            obj.addClass('active');
            panel.addClass('active');
            panelHeight = s.maxPx;
        }

        //set classes for csstransitions
        var modernCollapse = function (trigger, panel) {
            if (!panel.hasClass('active') || obj.hasClass('keep-open')) {
                obj.addClass('active');
                panel.addClass('active');
                if (s.callbackExpand) {
                    panel.one('transitionend', s.callbackExpand);
                }
                if (hideHdr) { s.obj.hide(); }
            } else {
                obj.removeClass('active');
                panel.removeClass('active');
                if (s.callbackCollapse) {
                    panel.one('transitionend', s.callbackCollapse);
                }
            }
        };

        //use jQuery to animate panel height
        var jQueryCollapse = function (trigger, panel) {
            console.log(panelHeight)
            if (panelHeight === 0 || s.obj.hasClass('keep-open')) {
                console.log('open')
                obj.find(s.iconContainer).removeClass(s.closedIconClass).addClass(s.openedIconClass);
                panel.animate({ 'max-height': s.maxPx + 'px' }, 500, function () {
                    panel.height('auto').css({ 'max-height': s.maxPercent + '%' });
                });
                panelHeight = s.maxPx;
                s.keepOpen = false;
                if (hideHdr) { s.obj.hide(); }
            } else {
                console.log('close')
                obj.find(s.iconContainer).removeClass(s.openedIconClass).addClass(s.closedIconClass);
                panel.animate({ 'max-height': s.initHeight }, 500, function () {
                    panel.height('');
                });
                panelHeight = s.initHeight;
            }
        };

        obj.on('click', function (evt) {
            evt.preventDefault();
            var thisTrigger = $(this),
                panel = (s.panel) ? s.panel : thisTrigger.next();
            if (isModern) {
                modernCollapse(thisTrigger, panel);
            } else {
                jQueryCollapse(thisTrigger, panel);
            }
        });

        if (s.keepOpen === true) {
            $(window).on('load orientationchange resize', function () {
                //keep tab open when browser width is under 600px
                if (Modernizr.mq('(' + s.keepOpenMinMax + '-width: ' + s.keepOpenWidth + 'px)')) {
                    obj.addClass('keep-open');
                } else {
                    obj.removeClass('keep-open');
                }
            }); //end win load
        }
    });
};

//CHATTER
function chatterPost(ele, response) {
    var jsonData = $$ash.unstringJSON(response),
        templateHtml;
    $.when(
        $.get(ele.attr('data-ash-template'), function (data) {
            templateHtml = data;
        })

        ).then(
        //success
            function () {
                if (jsonData.error) {
                    $$ash.ajaxFail($('.comment-cont'), jsonData.errorMessage);
                } else {
                    $$ash.renderTemplate(ele, templateHtml, jsonData, ele.attr('data-ashcontentfill'));
                    ele.find('input, textarea').not('input[type=submit]').val('');
                }
            },
        //fail
            function (xhr) {
                $$ash.ajaxFail($('.comment-cont'), undefined, xhr);
            }
        );
}
//FORM SUBMISSION
function formSubmit(ele, callback, callback2) {
    var inputFields = ele.find(':input').not('[type="submit"]'),
        hasError = false,
        ajaxData = {};

    if (inputFields.length) {
        inputFields.each(function () {
            var obj = $(this),
                objAttr = obj.attr('type'),
                key = obj.attr('name');

            if (obj.hasClass('required')) { //required to enter text 
                if (!obj.val()) {
                    hasError = true;
                    $$ash.validate(obj, 'Field cannot be empty');
                }
                obj.on('change', function () { //remove validation styles if valid
                    if (obj.val() && obj.hasClass('invalid')) {
                        $$ash.clearValidation($(this));
                    }
                });
            }
            if (key in ajaxData === false) {

                if (objAttr === 'checkbox' || objAttr === 'radio') {
                    if (obj.is(':checked')) {
                        ajaxData[key] = obj.val();
                    }
                } else {
                    ajaxData[key] = obj.val();
                }
            }
        });
    }

    if (!(hasError)) {
        $.ajax({
            type: "POST",
            url: ele.attr('action'),
            data: ajaxData,
            success: function (response, textStatus, xhr) {
                $$ash.reloadOnTimeout(xhr);

                if (response.error) {
                    $$ash.ajaxFail(ele, response.errorMessage);
                } else {
                    if (typeof callback === 'function') {
                        callback(ele, response);
                    } if (typeof callback2 === 'function') {
                        callback2(ele, response);
                    }
                    
                }
            },
            error: function (xhr) {
                $$ash.ajaxFail(ele, undefined, xhr);
            }
        });
    }
}
//AO: Writing formSubmit2 to eventually replace original form submit. 
//Improved modularity and flexibilty, stripping out validation stuff
function ajaxFormSubmit(obj, opts) {
    var url = opts.url || obj.attr('action'),
        data = opts.data,
        callback = opts.callback,
        callback2 = opts.callback2,
        failMessage = opts.failMessage,
        always = opts.always;

    $.ajax({
        type: "POST",
        url: url,
        data: data,
        success: function (response, textStatus, xhr) {
            $$ash.reloadOnTimeout(xhr);
            response = $$ash.unstringJSON(response);

            if (response.error) {
                $$ash.ajaxFail(obj, response.errorMessage);
            } else {
                if (typeof callback === 'function') {
                    callback(obj, response);
                } if (typeof callback2 === 'function') {
                    callback2(obj, response);
                }
            }
        },
        error: function (xhr) {
            $$ash.ajaxFail(obj, failMessage, xhr);
        },
        complete: function () {
            if (obj) {
                obj.trigger('ajaxPostComplete');
            }

            if (typeof always === 'function') {
                always();
            }
        }
    });
}
//Expandable Data Gallery
$.fn.ashExpDataGallery = function (opts) {
    var defaults = {
        finder: '.exp-data-gallery-img',
        activeClass: 'active',
        obj: $(this),
        delayedFunction: null,
        contentTriggers: $(this).find($('.exp-data-gallery-item')),
        contentItems: $(this).find($('.exp-data-item')),
        mobileFirst: false,
        callbackExpand: null,
        callbackCollapse: null
    };
    
    var options = $.extend(defaults, opts),
        obj = options.obj,
        delayedFunction = options.delayedFunction;

    return this.each(function () {
        $(document).on('click', 'a.close', function (e) {
            e.preventDefault();
            var openPanel = $(this).closest('[data-ash-edg-info]');
            openPanel.slideUp(350).attr('aria-expaneded','false');
            options.contentTriggers.removeClass(options.activeClass);
            if (typeof options.callbackCollapse === 'function') {
                options.callbackCollapse();
            }
        });

        $(this).on('click', '.exp-data-gallery-item', function (e) {
            e.preventDefault();
            var active = $(this),
                allExpandableItems = $('.exp-data-gallery').find('.exp-data-item'),
                allExpandableTriggers = $('.exp-data-gallery').find('.exp-data-gallery-item');
            allExpandableItems.slideUp(350).attr('aria-expanded', 'false');
            allExpandableTriggers.removeClass(options.activeClass).attr('aria-selected', 'false');
            //div inside list item that user is clicking
            var dataFinder = $(this).find(options.finder).attr('data-ash-edg');
            
            //add active class
            if (active) {
                active.addClass(options.activeClass).attr('aria-selected', 'true');
            }

            //expanding element that holds info
            var expandable = $(this).parents('.exp-data-gallery').find('[data-ash-edg-info="' + dataFinder + '"]');
            if (expandable.is(':visible')) {
                expandable.slideUp(350).attr('aria-expanded', 'false');
                active.removeClass(options.activeClass).attr('aria-selected', 'false');
            }
            else {
                expandable.delay(400).slideDown(350, function () {
                    //if expanded info is below window
                    if (($(window).height()) < ((expandable.offset().top) + (expandable.height()))) {
                        var top = expandable.offset().top;
                        var scrollPoint = ((expandable.offset().top) - ($('.exp-data-gallery-item').height()) - 50);
                        $('html, body').animate({ scrollTop: scrollPoint }, 500);
                    }
                    if (delayedFunction) {
                        delayedFunction();
                    }
                    if (typeof options.callbackExpand === 'function') {
                        options.callbackExpand();
                    }
                }).attr('aria-expanded', 'true');
            }
        });

        $(window).on('load', function () { 
        if (typeof $$ashSc === 'undefined') {
            if (Modernizr.mq($$ash.mq('sm'))) {
                options.contentItems.each(function (i) {
                    i = (i + 1) * 2;
                    var ind = String(i);
                    $(this).css({ 'order': ind });
                });

                options.contentTriggers.each(function (i) {
                    i = (i * 2) + 1;
                    var ind = String(i);
                    $(this).css({ 'order': ind });
                });
            }
        }
    });
        
    });
};

(function ($) {
    $.fn.ashFileUpload = function (options) {
        var targetImg = options.targetImage,
            action = options.action;

        $(this).ajaxfileupload({
            'action': action,
            'onComplete': function (response) {
                var jsonData = $$ash.unstringJSON(response);

                targetImg.attr("src", jsonData.imgUrl);
            }
        });
    };
})(jQuery);

(function ($) {
    $.fn.ashConfigSelect = function () {
        $(this).select2({
            minimumResultsForSearch: -1
        });

        if ($('form.validate').length) {
            $$ashVal.init();
        } //got to run after select2 runs
    };
})(jQuery);

//DONUT CHART
(function ($) {
    $.fn.progressGraphInit = function (donutWidth, callback) {
        var jsonData,
            obj = $(this),
            src = obj.attr('data-json-url');
        $.when(
            $.getJSON(src, function (data) {
                jsonData = data;
            })
        ).then(
            //success
            function (response, responseText, xhr) {
                $$ash.reloadOnTimeout(xhr);

                if (jsonData.error === true) {
                    $$ash.ajaxFail(obj, jsonData.errorMessage);
                } else {
                    var r = Raphael(obj.attr('id')),
                        values = [];
                    //ASH added to change donut totals to array
                    if (jsonData.percent) {
                        jsonData.total = 100;
                    }
                    for (var i = 0; i < jsonData.total; i++) {
                        values.push(1);
                    }

                    donutWidth = (donutWidth <= $(obj).height()) ? donutWidth : $(obj).height();
                    var pie = r.piechart((donutWidth * 0.5), (donutWidth * 0.5), donutWidth, values, {
                        donut: true,
                        donutMet: jsonData.met,
                        donutMetPercent: jsonData.percent,
                        goalMet: jsonData.goalMet,
                        showMax: jsonData.showMax,
                        donutUnit: jsonData.unit,
                        donutAction: jsonData.action,
                        metSvg: '<svg style="display:none;" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"> <use overflow="visible" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="/Global/images/Base/Icon/Icons_Sprite_Challenges.svg#trophy" /> </svg>',
                        metHtml: '<div class="no-svg icon-goalMet"></div> <div class="donut-met-cont"><svg preserveAspectRatio="xMinYMin meet"> <use xlink:href="/Global/images/Base/Icon/Icons_Sprite_Challenges.svg#trophy"></use> </svg></div>',
                        reverseColors: obj.hasClass('donut-reverse-colors') === true ? true : false
                    });

                    if (typeof callback === 'function') {
                        callback();
                    }
                }
            },
            //fail
            function (xhr) {
                $$ash.ajaxFail(obj, undefined, xhr);
            }
        );
    };

    $.fn.initViewMoreButton = function (options) { //context in which to look for buttons
        var defaults = {
            callback: null,
            numberToSlice: parseInt(this.attr('data-number-to-slice')) || 10,
            startSliceIndex: 0,
            jsonData: null //option to pass in JSON data. If not passed in, then script will grab JSON from url specified in data-ash-json-url
        };

        var opts = $.extend({}, defaults, options);

        return this.each(function () {
            var obj = $(this),
                jsonData = $$ash.unstringJSON(opts.jsonData),
                numberToSlice = opts.numberToSlice,
                callback = opts.callback,
                startSliceIndex = opts.startSliceIndex,
                target = opts.targetId || obj.attr('data-ash-target-id'),
                keyToSlice = opts.keyToSlice || obj.attr('data-key-to-slice'),
                insertType = 'html';

            if (!target) {
                throw ('You MUST supply a targetId!');
            }

            obj.off('click.viewMoreInit').one('click.viewMoreInit', function () {
                var unslicedArray,
                    arrayLength;
                    
                obj.addClass('clicked');

                $$ash.getHandlebarsTemplate(obj).done(function (response) {
                    var templateData = response,
                        newStartIndex,
                        callback2 = function (startIndex, totalLength) {
                            if (startIndex >= totalLength) {
                                obj.remove();
                            }

                            if (typeof callback === 'function') {
                                callback();
                            }
                        };

                    function jsonSlicer(startIndex) {
                        var endSlice = parseInt(startIndex) + parseInt(numberToSlice);
                        insertType = 'append';

                        jsonData[keyToSlice] = unslicedArray.slice(startIndex, endSlice);

                        newStartIndex = endSlice;
                    }

                    function initRender(jsonData) {
                        unslicedArray = jsonData[keyToSlice];
                        arrayLength = unslicedArray.length;

                        if (numberToSlice) {
                            if (!keyToSlice) {
                                throw ('You MUST supply a key to slice!');
                            } else {
                                jsonSlicer(startSliceIndex);
                            }
                        } else {
                            newStartIndex = arrayLength; //remove view more button if inserting everything
                        }
                        
                        $$ash.renderTemplate(obj, templateData, jsonData, target, function () {
                            callback2(newStartIndex, arrayLength);
                        }, { insertType: insertType });

                        obj.on('click.viewMoreSliced', function () {
                            jsonSlicer(newStartIndex);

                            $$ash.renderTemplate(obj, templateData, jsonData, target, function () {
                                callback2(newStartIndex, arrayLength);
                            }, { insertType: insertType });
                        });
                    }

                    if (jsonData) {
                        initRender(jsonData);
                    } else {
                        $$ash.getTemplateJson(obj).done(function (response) {
                            jsonData = $$ash.unstringJSON(response);

                            initRender(jsonData);
                        });
                    }
                });
            });
        });
    };

    $.fn.ajaxSearchInit = function (options) {
        var defaults = {
            numberOfResults: parseInt(this.attr('data-number-of-results')) || 10, //number of results to show initially
            keyToSlice: this.attr('data-key-to-slice') || 'results'
        };

        var opts = $.extend({}, defaults, options);

        return this.each(function () {
            var obj = $(this);

            obj.on('submit.ajaxSearch', function (e) {
                var search = obj.find('input[type="search"]'),
                    //submit = obj.find('input[type="submit"]'),
                    target = opts.targetId || obj.attr('data-ash-target-id'), //ID of DOM element to insert search results into
                    keyToSlice = opts.keyToSlice, //which key in the json to slice
                    numberOfResults = opts.numberOfResults,
                    finalCallback = opts.callback;

                if (!target) {
                    throw ('You MUST supply a targetId and keyToSlice!');
                }

                e.preventDefault();

                $$ash.removeButtonOnSubmit(obj);

                ajaxFormSubmit(obj, {
                    data: search.val(),
                    url: obj.attr('action'),
                    callback: function (obj, response) {
                        var jsonData = $$ash.unstringJSON(response),
                            cacheFullArray;

                        if (numberOfResults) {
                            if (!keyToSlice) {
                                throw ('You MUST supply a key to slice!');
                            } else {
                                cacheFullArray = jsonData[keyToSlice];
                                jsonData[keyToSlice] = jsonData[keyToSlice].slice(0, numberOfResults);
                            }
                        }

                        $$ash.handlebarsInit(obj, {
                            target: target,
                            jsonData: jsonData,
                            callback: function () {
                                if (numberOfResults) {
                                    jsonData[keyToSlice] = cacheFullArray;
                                }

                                $('#' + obj.attr('data-ash-target-id')).find('.viewMore').initViewMoreButton({
                                    jsonData: jsonData,
                                    startSliceIndex: numberOfResults,
                                    callback: finalCallback
                                });
                            }
                        });
                    },
                    always: function (form) {

                    }
                });
            });
        });
    };
})(jQuery);

//MESSAGE CENTER
function $$messageCenterInit() {
    var main = $('.main-content'),
        messageNav = $('nav.message'),
        unreadCount = $('.unread-count'),
        sentCount = $('.sent-count'),
        templateCont = $('#message-template'),
        target = templateCont.attr('data-ash-target-id'),
        overviewTemplateUrl = templateCont.attr('data-overview-template'),
        detailTemplateUrl = templateCont.attr('data-detail-template'),
        formAction = templateCont.attr('data-form-action');

    (function messageNavBind() { //bind handlebar rendering to message nav items
        messageNav.find('a').off('click').click(function (e) {
            var obj = $(this);

            openFolder(obj);
            e.preventDefault();
        });
    })();

    function openFolder(obj) {
        $$ash.getTemplateJson(obj).done(function (response) {
            var fullJson = response,
                slicedJson = {},
                templateUrl = obj.attr('data-ash-template-url') || overviewTemplateUrl;

            for (var k in fullJson) {
                if (fullJson.hasOwnProperty(k)) {
                    if (Object.prototype.toString.call(fullJson[k]) === '[object Array]') {
                        slicedJson[k] = fullJson[k].slice(0, 8);
                    } else {
                        slicedJson[k] = fullJson[k];
                    }
                }
            }

            $$ash.getHandlebarsTemplate(obj, templateUrl).done(function (response) {
                $$ash.renderTemplate(obj, response, slicedJson, target);
                updateMessageCount({
                    userAction: "folderOpen"
                });
                messageNav.find('.active').removeClass('active');
                obj.addClass('active');

                $$ash.flexheightFallback();
                
                viewAllBind(fullJson);
                sendMessageBind();
                openMessageBind();
                expandReplyAreaBind();
            });
        });
    }

    function updateMessageCount(o) {
        var userAction = o.userAction, //what did the user just do? "messageOpen", "send", or "folderOpen"?
            msg = o.msg,
            postData = {};

        if (userAction === 'messageOpen') {
            postData = {
                "action": "messageOpen",
                "messageId": msg.attr('data-message-id')
            };
            //TODO: TAKE THIS OUT IN NEXT VERSION
            if (msg.hasClass('unread') && msg.hasClass('inbox-message')) {
                unreadCount.text(parseInt(unreadCount.text()) - 1);
            }
            //END TODO
        } else if (userAction === 'send') {
            postData = {
                "action": "messageSend"
            };

            sentCount.text(parseInt(sentCount.text()) + 1); //TODO: TAKE THIS OUT IN NEXT VERSION
        } else { //folderOpen or undefined
            postData = {
                "action": "folderOpen"
            };
        }

        ajaxFormSubmit(undefined, {
            url: formAction,
            data: postData,
            callback: function (obj, response) {
                //TODO: PUT THIS BACK WHEN PROGRAMMERS IMPLEMENT FIX
                //TODO: FIX TIMING. SOMETIMES MESSAGE COUNTER UPDATES MUCH AFTER NEW FOLDER IS RENDERED
                //unreadCount.text(response.unreadTotal);
                //sentCount.text(response.sentTotal);
                //END TODO
            },
            failMessage: 'Error updating message counter'
        });
    }

    function updateUnreadCount(obj) {
        var newUnreadCountVal,
            messageId;

        if (obj.hasClass('unread') && obj.hasClass('inbox-message')) {
            newUnreadCountVal = parseInt(unreadCount.text()) - 1;
            messageId = obj.attr('data-message-id');
            ajaxFormSubmit(undefined, {
                "url": formAction,
                "data": {
                    "action": "messageOpen",
                    "messageId": messageId,
                },
                "callback": function () {
                    unreadCount.text(newUnreadCountVal);
                },
                "failMessage": 'Error updating message counter'
            });
        }
    }

    function sendMessageBind(json, composingReply) {
        var form = templateCont.find('form');

        form.attr('action', formAction).on('submit.sendMessage', function (e) {
            var obj = $(this),
                message = obj.find($('textarea[name=message]')).val(),
                postData;

            if (composingReply === true) { //if message send as a reply
                postData = {
                    "action": 'messageReply',
                    "recipient": json.person,
                    "subject": json.subject,
                    "message": message,
                    "messageId": json.messageId
                };
            } else { //message sent from new message folder
                postData = {
                    "action": 'messageSend',
                    "recipient": obj.find($('select[name=recipient]')).val(),
                    "subject": obj.find($('input[name=subject]')).val(),
                    "message": message,
                };
            }

            $$ashVal.validateAllAndSubmit(obj, undefined, {
                url: formAction,
                data: postData,
                callback: function (obj, response) {
                    $$ash.formSuccess(obj, response);
                    updateMessageCount({
                        userAction: 'send'
                    });
                }
            });
        });
    }

    function openMessageBind() { //bind handlebar rendering to clicking on an individual message
        var messages = templateCont.find('a.message-cont');

        function createJsonForMessageDetail(obj) {
            var isInbox = obj.hasClass('inbox-message'),
                messageJson;

            messageJson = {
                "isInbox": isInbox,
                "person": obj.find('.person-text').text(),
                "subject": obj.find('.subject-text').text(),
                "date": obj.find('.date-text').text(),
                "time": obj.find('.time').text(),
                "fullMessage": obj.find('.full-message').html(),
                "messageHistory": obj.find('.message-history').html(),
                "messageId": obj.attr('data-message-id'),
                "attachmentLink": obj.find('.attachment-link').html(),
                "attachmentTitle": obj.find('.attachment-title').html()
            };
            return messageJson;
        }

        messages.find('.reply').on('click.reply', function (e) {
            var obj = $(this),
                parentMsg = obj.parents('.message-cont');
            
            parentMsg.addClass('jumpToReply');
        })

        messages.on('click.openMessage', function (e) {
            var obj = $(this),
                currentUnreadCount = unreadCount.text(),
                json = createJsonForMessageDetail(obj),
                callback = function (trigr, jsonData, target) {
                    var composingReply = true,
                        replyField = templateCont.find('textarea'),
                        scrollToTarget = templateCont;

                    messageReplyBackBind();
                    sendMessageBind(jsonData, composingReply);
                    //viewMessageHistoryBind();
                    expandReplyAreaBind();

                    if (obj.hasClass('jumpToReply')) {
                        setTimeout(function () { replyField.focus(); }, 1);
                        scrollToTarget = replyField;
                    }

                    $('html, body').animate({
                        scrollTop: scrollToTarget.offset().top - 50
                    }, 500);
                };

            $$ash.getTemplateData(obj, json, detailTemplateUrl, target, callback);

            updateMessageCount({
                userAction: 'messageOpen',
                msg: obj
            });

            e.preventDefault();
        });
    }

    function expandReplyAreaBind() {
        var replyAreaCont = $('.internal-btn-cont');

        templateCont.find($('textarea')).focus(function () {
            replyAreaCont.addClass('active');
        });

        templateCont.find($('.secondary')).click(function (e) {
            replyAreaCont.removeClass('active');
            e.preventDefault();
        });
    }

    function messageReplyBackBind() { //binds events to either reply or go back to messages
        var back = $('.back-to-overview'),
            currentFolderNavItem = messageNav.find('a.active');

        $('.reply-arrow').click(function (e) {
            templateCont.find($('textarea')).focus();
            e.preventDefault();
        });

        back.attr('data-json-url', currentFolderNavItem.attr('data-json-url'));

        back.click(function (e) {
            openFolder(currentFolderNavItem);
            e.preventDefault();

            $('html, body').animate({
                scrollTop: 0
            }, 500);
        });
    }

    function viewAllBind(json) { //bind handlebar rendering to view all button
        $('button.view-all').click(function (e) {
            var obj = $(this),
                callback = function () {
                    openMessageBind();
                    $('button.view-all').html('<span>All Messages Loaded</span>');
                    $$ash.flexheightFallback();
                };

            $$ash.getTemplateData(obj, json, overviewTemplateUrl, target, callback);
            e.preventDefault();
        });
    }

    viewAllBind();
    openMessageBind();
}

$(document).ready(function () {
    //REPLACE IMAGES FOR NON-SVG BROWSERS
    if ($('html').hasClass('no-inlinesvg')) {
        $('html .no-svg img').each(function () {
            $(this).ashImgGet();
        });
    }
    //html.no-inlinesvg
    $(' .radio-img-cont').each(function () {
        var inp = $(this).find('input'),
            inpName = inp.attr('name'),
            otherInp = $('input[name="' + inpName + '"]').closest('.radio-img-cont').find('.radio-img-cont-img'), //need to turn off checked state on other radio options for this question
            img = $(this).find('.radio-img-cont-img'),
            isChecked;

        inp.on('change', function () {
            isChecked = inp.prop('checked');
            if (isChecked) {
                otherInp.removeClass('checked');
                img.addClass('checked');
            } else {
                img.removeClass('checked');
            }
        });
    });

    $('form.resetForm').on('submit', function (e) {
        e.preventDefault();
        formSubmit($(this), $$ash.formSuccess);
    });

    $('.radio-trigger').each(function () {
        var cont = $(this),
            contInputs = cont.find('input'),
            recCont = $('#' + cont.attr('data-radio-trigger-match')), //matching element that will recieve selections base on conts radios
            recInputs = recCont.find('input');

        contInputs.each(function () {
            $(this).on('change', function () {
                //on input change, see if this input triggers a match input
                if ($(this).attr('data-radio-trigger')) {
                    //check the matched input
                    var match = recCont.find('#' + $(this).attr('data-radio-trigger')).prop('checked', true);
                    //disable the non-matched inputs
                    recInputs.not(match).attr('disabled', true);
                } else {
                    //if the input doesnt have a match, turn off disabled inputs
                    recInputs.attr('disabled', false);
                }
            });
        });
    });

    //COMPONENT NAV
    var compNavHolder = $('.component-nav-holder'), //holder for the mobile toggle nav
        compNav = $('ul.component-nav'); //main componenet-nav

    //open and close nav on mobile
    compNavHolder.on('click', function () {
        compNav.slideToggle();
    });
    //toggle selected (open) class on navHolder
    $('div.component-nav-holder').on('click', function () {
        $(this).toggleClass('selected');
    });
    //accordion holder
    var accordionHolder = $('.accordion-nav-holder'), //holder for the mobile toggle accordion
        accordion = $('ul.accordion'); //main accordion

    //open and close accordion on mobile
    accordionHolder.on('click', function () {
        accordion.slideToggle();
    });
    //main list items in component nav
    $('ul.component-nav > li, ul.accordion > li').each(function () {
        var cont = $(this), //category item
            obj = $(this).children(':first-child').nextUntil('ul').andSelf(), //set of selectors user can click
            list = cont.find('ul'), //sub nav
            subnavSelected = cont.find('.selected'), //current selected subnav item
            indicator = cont.find('.indicator'); //arrowindicator used to display when the menu is open

        obj.on('click', function () {
            //toggle subnav visibility
            if (list.length > 1) {
                list.slideToggle();
            }
            //toggle selected state
            function toggleSel() {
                cont.toggleClass('selected');
                //css transforms will handle the arrow rotation in modern browsers, otherwise toggle class for old browsers
                if (!Modernizr.csstransforms) {
                    indicator.toggleClass('icon-rotateDown');
                    indicator.toggleClass('icon-rotateUp');
                }
            }
            toggleSel();
        });
        //change ui for subnav items when clicked
        (list.children()).on('click', function () {
            subnavSelected.removeClass('selected');
            $(this).addClass('selected');
            subnavSelected = $(this);
        });
    });

    //set print functionality to any a tag with "print" in the class
    $('.trigger-print').on('click', function (event) {
        event.preventDefault();
        window.print();
    });

    //control show/hide options in facility search
    $('.facilityOptions').ashAccord({
        triggerNewText: 'Hide Filters'
    });

    //remove labels if placeholder is supported
    if (Modernizr.input.placeholder) {
        $('input[type="text"], input[type="email"], input[type="password"], input[type="date"], input[type="search"], input[type="file"], input[type="tel"], select, textarea').each(function () {
            $('html').addClass('html5placeholder');
        });
        //new placeholder-watch syntax <label><span class="placeholder-watch"></span><input /></label>
        $('label span:first-child.placeholder-watch').each(function () {
            var obj = $(this),
                text = obj.text(),
                label = obj.closest('label'),
                inp = label.find('input, select, textarea'),
                plcHdr = inp.attr('placeholder') || inp.attr('data-placeholder'),
                firstOption = null;

            if (obj.hasClass('required')) {
                text += " *";
            }
            
            if (inp.is('select')) {
                if (Modernizr.touch) {
                    $$ash.setDefaultOption(inp, text);
                } else if (plcHdr) {
                    inp.attr('placeholder', plcHdr);
                } else {
                    inp.attr('placeholder', text);
                }
            } else if (inp.is($('input[type=date]')) && Modernizr.touch) {
                //dont hide the labels on dates
                inp.siblings('.placeholder-watch').addClass('noHide')
            }
            else if (!plcHdr) {
                inp.attr('placeholder', text);
            }
        });
        //old placeholder-watch syntax <label class="placeholder-watch"></label><input />
        $('label.placeholder-watch').each(function () {
            var label = $(this),
                text = label.text(),
                inp = label.next('input, select, textarea'),
                plcHdr = inp.attr('placeholder') || inp.attr('data-placeholder'),
                firstOption = null;

            if (inp.is('select')) {
                $$ash.setDefaultOption(inp, text);
            } else if (!plcHdr) {
                inp.attr('placeholder', text);
            }
        });
    } else {
        $('html').addClass('no-html5placeholder');

        $('select').each(function () {
            //setDefaultOptions doesn't need called if the placeholder is there
            if ($(this).prev('.placeholder-watch').length === 0) {
                $$ash.setDefaultOption($(this), null);
            }
        });
    }

    $('ul.exp-data-gallery').each(function () {
        $(this).ashExpDataGallery();
    });

    //USER LISTS
    $('.user-list').on('click', '.remove', function (e) {
        e.preventDefault();
        $$ash.userList.removeUser($(this), '.user-list');
    });

    //IF TOUCH NOT SUPPORTED
    if (!Modernizr.touch) {
        //JQUERY UI DATE PICKER
        if ($('input[type=date]').length) {
            $.getScript("/App_Themes/Base/lib/jquery-ui-datepicker-1.11.1.min.js")
            .done(function () {
                var dateInput = null;
                $('input[type=date]').each(function () {
                    //$(this).parent().addClass('date-cont').end().removeAttr('type').attr('type', 'text').addClass('date-picker').after('<span class="svg-date-picker"></span>');
                    var target = $("[type='date']"),
                        newInput = "<input type='text' ",
                        classAttr = false;
                    if (target[0].attributes.length > 1) {
                        $(target[0].attributes).each(function () {
                            if (this.nodeName !== 'type') {
                                if (this.nodeName === 'class') {
                                    classAttr = true;
                                    newInput += this.nodeName + "='" + this.value + " date-picker' ";
                                } else {
                                    newInput += this.nodeName + "='" + this.value + "' ";
                                }
                            }
                        });
                    } else {
                        newInput += "class='date-picker' ";
                    }
                    if (!classAttr) {
                        newInput += "class='date-picker' ";
                    }
                    newInput += "/>";
                    $(this).parent().addClass('date-cont').end().after('<span class="svg-date-picker"></span>').replaceWith(newInput);
                });
                dateInput = $('.date-picker');
                if ($.datepicker) { //check to see if datepicker is available TODO: find a way for datepicker to work in HMS
                    dateInput.datepicker({
                        onClose: function (date) {
                            var obj = $(this);
                            prepopulateDate(obj, date, false);
                        }
                    });
                }
                $$ashVal.init();
            });
            $('.svg-date-picker').click(function () {
                $(this).prev().datepicker("show");
            });
            if ($('form.validate').length) {
                $$ashVal.init();
            }
        }

        //IF TOUCH IS SUPPORTED
    } else {
        if ($('input.startDate')) {
            $('input.endDate').each(function () {
                var obj = $(this);
                prepopulateDate(obj, null, true);
            });
        }
    }

    function prepopulateDate(obj, date, touch) {
        var thisInput = obj,
            match = thisInput.data('ash-match'),
            targetInput = $('.endDate[data-ash-match=' + match + ']'),
            startDate = null,
            endDate = null;
        if (touch) {
            thisInput.on('focus', function () {
                startDate = ($('.startDate[data-ash-match=' + match + ']').val()).split('-');
                endDate = startDate[0] + '-' + startDate[1] + '-' + ('0' + (parseInt(startDate[2]) + 1)).slice('-2');
                if (!targetInput.val()) {
                    targetInput.val(endDate).change(); //must trigger change event for ashVal
                }
            });
        } else {
            startDate = date;
            endDate = new Date(Date.parse(startDate));
            endDate.setDate(endDate.getDate() + 1);
            if (!targetInput.val()) {
                targetInput.datepicker('setDate', endDate).change(); //must trigger change event for ashVal
            }
        }
    }

    //EClasses
    $('#tab-template').on('click', 'a.trigger-quiz', initQuiz); 
    function initQuiz(e) {
        var obj = $(e.target).closest('#tab-template');
        $$ash.getTemplateData(obj, obj.attr('data-json-url'), obj.attr('data-ash-template-url'), obj.attr('data-ash-target-id'), quizSubmit);
    }
    var quizSubmit = function () {
        $('#tab-template').one('submit', 'form.quiz', function (e) {
            e.preventDefault();
            formSubmit($(this), quizFeedback); //be sure to pass the form element along with a callback function
        });
    };
    
    function quizFeedback(ele, response) { //ele = form.quiz  //response = json data
        var obj = ele.closest('#tab-template'), //getting tab template
            templateCont = $('#tab-template');
        response = $$ash.unstringJSON(response);

        if (response.quizPass === true) { //if quiz passes
            ele.parent().html(response.eClassContent);  //load the congratulations page
            templateCont.removeClass('content-container');
        } else {  //if quiz fails or there is error
            $.ajax({
                url: obj.attr('data-ash-template-url'),
                type: 'GET',
                success: function (data) {
                    var template = Handlebars.compile(data),
                        html = template(response);
                    templateCont.html(html);
                    $$ashVal.scrollForm($('#tab-template form.quiz'));
                    quizSubmit();
                },
                error: function(xhr) {
                    $$ash.ajaxFail(obj, undefined, xhr);
                }
            });
        }
    }

    //STYLED FILE UPLOAD 
    if ($('.file-upload').length) {
        $('.file-upload').each(function () {
            var fileUploadObj = $(this),
                test = fileUploadObj.find('input[type="file"]');

            (function fileUpload() {
                var obj = test,
                    ajaxUrl = obj.attr('data-ajax-url'),
                    ajaxImg = obj.attr('data-ajax-image'),
                    targetImage = $('#' + ajaxImg),
                    fileNameText = fileUploadObj.find('.upload-status-filename');

                obj.ashFileUpload({
                    "action": ajaxUrl,
                    "targetImage": targetImage
                });

                obj.on('change', function () {
                    var fileName = obj.val().split('/').pop().split('\\').pop();

                    fileNameText.text(fileName);

                    $(this).ashFileUpload({
                        "action": ajaxUrl,
                        "targetImage": targetImage
                    });
                });
            })();
        });
    }

    if ($('.tabs').length) {
        var trigr = $('.tabs .tab.selected a'),
            jsonUrl = trigr.attr('data-json-url'),
            templateUrl = trigr.attr('data-ash-template-url'),
            targetId = trigr.attr('data-ash-target-id'),
            notTabsFilter = !$('.tabs').is('.tabsFilter'),
            tempID = $('#tab-template'),
            hasCont,
            callback;

        if (notTabsFilter) {  //if not using tabs via filter, generate template
            $$ash.getTemplateData(trigr, jsonUrl, templateUrl, targetId, callback);
        }

        $('.tabs .tab a').on('click', function (e) {
            e.preventDefault();
            trigr = $(this);
            jsonUrl = trigr.attr('data-json-url');
            templateUrl = trigr.attr('data-ash-template-url');
            targetId = trigr.attr('data-ash-target-id');
            hasCont = trigr.attr('data-ash-hascont');
            $('.ajax-error').remove();
            var trigrLi = trigr.parent(),
                allTabs = trigrLi.siblings(),
                tabCont = $('#' + targetId);
            tabCont.html('');
            allTabs.removeClass('selected'); //remove selected class
            if (hasCont === 'true') { //if tab has its own container
                tabCont.removeClass('content-container');
            } else {
                tabCont.addClass('content-container');
            }
            trigrLi.addClass('selected'); //add selected class on newly selected button


            if (notTabsFilter) {  //if not using tabs via filter, generate template
                $$ash.getTemplateData(trigr, jsonUrl, templateUrl, targetId, callback);
            }
        });
        tempID.on('submit', '.quiz', function (e) {
            e.preventDefault();
        });
        tempID.on('click', '.trigger-quiz', function (e) {
            e.preventDefault();
            tempID.addClass('content-container');
        });
        tempID.on('click', 'a.trigger-quiz', function (e) {
            e.preventDefault();
            trigr = tempID;
            jsonUrl = trigr.attr('data-json-url');
            templateUrl = trigr.attr('data-ash-template-url');
            targetId = trigr.attr('data-ash-target-id');

            $$ash.getTemplateData(trigr, jsonUrl, templateUrl, targetId, callback);
        });
        //equal width tabs for no flexbox browsers
        var noFlexTab = $('.no-flexbox .tab');
        if (noFlexTab.length) {
            $(window).on('orientationchange resize', function () {
                if ($(window).width() < 768) {
                    noFlexTab.css({ 'width': '50%' });
                } else {
                    runEqualCols();
                }
            });
        }
    }
    //get parameter for url
    $.urlParam = function (name) {
        var results = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.href);
        //var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href); //original version. fixing regex to fix hint error
        if (results === null) {
            return null;
        } else {
            return results[1] || 0;
        }
    };
    //jump to content based on the css id added to an html element
    $.jumpToContent = function () {
        var toId = $.urlParam('jump'), //id where the url should take you
            target = $('#' + toId), //object in html to position browser
            stickyNav = $('.ash-sticky-nav'), //sticky nav object
            stickyNavHt = 0, //height of sticky navs
            offSet = 50;
        
        stickyNav.each(function () {  //add up sticky nav heights
            if (($(this).is('nav') && $(this).css('display') !== 'none') || ($(this).is('header') && $(this).css('opacity') !== 0)) {
                stickyNavHt += $(this).outerHeight();
                offSet = 10;
            }
        });
        
        //animate / scroll to place in the browser
        $('html, body').animate({
            scrollTop: target.offset().top - stickyNavHt - offSet
        }, 1000);
    };
    
    //DONUT INIT
    var donutChartHolder = $('.donut-chart');
    if (donutChartHolder.length) {
        if (!$$donutCallback) {
            var $$donutCallback = null;
        }
        donutChartHolder.each(function () {
            var obj = $(this),
                donutWidth = $(this).width();

            obj.height(donutWidth).progressGraphInit(donutWidth, $$donutCallback);
        });
    }

    //CENTER ELEMENT
    $.fn.center = function () {
        this.css("position", "fixed");
        this.css("top", ($(window).height() / 2) - (this.outerHeight() / 2));
        this.css("left", ($(window).width() / 2) - (this.outerWidth() / 2));
        return this;
    };

    //SEND PROGRESS INDICATOR MESSAGE
    $.fn.progressIndicator = function (options) {
        var defaults = {
            'msg': 'message', //message to show
            'attachMsg': 'body', //location to attach message
            'triggerType': 'checkbox', //type of trigger sending message
            'buttonTrigger': false,  //is trigger a button
            'buttonClass1': null, //triggers class name before click
            'buttonText1': null, //triggers button name before click
            'buttonClass2': null,  //triggers class name after click
            'buttonText2': null,  //triggers button name after click
            'limitSelection': false, //remove other select options
            'chgTxt': null, //element of text
            'authorize': false,
            'fadeInTime': 300,
            'fadeOutTime': 300,
            'DelayTime': 300
        };

        var settings = $.extend({}, defaults, options);

        return this.each(function () {
            var obj = $(this),
                o = settings,
                msg = o.msg,
                attachMsg = o.attachMsg,
                triggerType = o.triggerType,
                buttonTrigger = o.buttonTrigger,
                buttonClass1 = o.buttonClass1 !== null ? ' ' + o.buttonClass1 : '',
                buttonText1 = o.buttonText1 !== null ? ' ' + o.buttonText1 : '',
                buttonClass2 = o.buttonClass2 !== null ? ' ' + o.buttonClass2 : '',
                buttonText2 = o.buttonText2 !== null ? ' ' + o.buttonText2 : '',
                limitSelection = o.limitSelection,
                chgTxt = o.chgTxt,
                authorize = o.authorize,
                fadeInTime = o.fadeInTime,
                fadeOutTime = o.fadeOutTime,
                DelayTime = o.DelayTime;

            var msgFrame = '<span class="progressMsg">' + msg + '</span>'; //status message frame

            function showMessage() {
                $(msgFrame).hide().appendTo(attachMsg).center().fadeIn(fadeInTime).delay(DelayTime).fadeOut(fadeOutTime, function () {
                    $(this).remove();
                });
            }

            function invokeChange(trigger) {
                var triggerChecked = trigger.find('input[type=checkbox]').prop('checked') || trigger.hasClass('authorized'),
                    buttonClass;
                
                //if trigger is checked attache message in the center of the screen, fade in, delay, fadeout and remove msg
                if (triggerChecked) {
                    showMessage();
                    if (limitSelection) {
                        buttonClass = $.trim(buttonClass1);
                        if (authorize) {
                            $('.button.' + buttonClass).not(trigger.siblings('a')).hide();
                        } else {
                            $('.button.' + buttonClass).not(trigger).hide();
                        }
                    }
                    //if trigger is a button change the button class and text triggered settings
                    if (buttonTrigger) {
                        trigger.removeClass('primary' + buttonClass1).addClass('secondary' + buttonClass2);
                        if (authorize) {
                            trigger.siblings('a').removeClass('primary' + buttonClass1).addClass('secondary' + buttonClass2);
                        }
                        if (chgTxt !== null) {
                            trigger.find(chgTxt).text(buttonText2);
                            if (authorize) {
                                trigger.siblings('a').find(chgTxt).text(buttonText2);
                            }
                        }
                    }
                } else {
                    if (limitSelection) {
                        buttonClass = $.trim(buttonClass1);
                        $('.button.' + buttonClass).show();
                    }
                    //if trigger is a button change the button class and text back to the original settings
                    if (buttonTrigger) {
                        trigger.removeClass('secondary' + buttonClass2).addClass('primary' + buttonClass1);
                        if (authorize) {
                            trigger.siblings('a').removeClass('secondary' + buttonClass2).addClass('primary' + buttonClass1);
                        }
                        if (chgTxt !== null) {
                            trigger.find(chgTxt).text(buttonText1);
                            if (authorize) {
                                trigger.siblings('a').find(chgTxt).text(buttonText1);
                            }
                        }
                    }
                }
            }

            if (triggerType === 'checkbox') {
                obj.find('input').on('click', function (e) {
                    invokeChange(obj);
                });
            } else {
                showMessage();
            }
        });
    };

    //ASHMODAL
    $$ash.openModal();

    //OPEN MODAL ON PAGE RENDER
    $$ash.renderModal();

    $('.radioFilter').each(function () {
        var ashTrig = $(this),
            //use radioFilterCont for normal cases, survey-question for true surveys (ie: PHA) 
            filterItem = ashTrig.closest('.radioFilterCont').length ? ashTrig.closest('.radioFilterCont').find('.ashFilter') : ashTrig.closest('.survey-question').find('.ashFilter');
        ashTrig.ashFilter({
            event: 'change',
            trigger: ashTrig.find('.radioFilterTrigger'),
            filterItem: filterItem,
            addSelected: 'selected',
            fadeInDur: 1,
            fadeOutDur: 0
        });
    });
    //checkboxes with show/hide radio questions
    $('.checkbox-radio-group').each(function () {
        var ashTrig = $(this);
        ashTrig.ashFilter({
            event: 'change',
            trigger: ashTrig.find('.checkbox-radio-trigger'),
            filterItem: ashTrig.find('.checkbox-radio-filter'),
            fadeInDur: 1,
            fadeOutDur: 0,
            offOption: true
        });

        ashTrig.on('change.filterTriggerValidation', function () {
            var obj = $(this);

            obj.find('.radio-container').not('.validate').addClass('validate');

            if ($('form.validate').length) {
                $$ashVal.init();
            }
        });
    });
    //radios with show/hide radio questions
    $('.checkbox-radio-group').each(function () {
        var ashTrig = $(this);
        ashTrig.on('change.filterTriggerValidation', function () {
            var obj = $(this);

            obj.find('.radio-container').not('.validate').addClass('validate');

            if ($('form.validate').length) {
                $$ashVal.init();
            }
        });
    });
    //hide radio buttons inside checkboxes when checkbox is unchecked
    $('.checkbox-radio-group').each(function () {
        var radioGroup = $(this),
            checkboxParent = radioGroup.find('input[type=checkbox]');
        $(checkboxParent).on('change', function () {
            var thisCheckbox = $(this);
            if (thisCheckbox.prop('checked')) {
                thisCheckbox.parent().parent().find('.subquestion-cont').find('input[type=radio]').prop('checked', false);
            }
        });
    });
    //populating modal content
    $('.marketplace #template-target').on('click', '.contentMessage', function () {
        var btn = $(this),
            frImg = btn.parent().find('img').clone(),
            fromTitle = btn.parent().find('.thumb-title').clone(),
            linkTo = btn.attr('data-ash-applink'),
            ashModalImgTo = $('.logoImgFr').html();

        $('.ashModalImgFr, .ashModalImgTo').html('');
        $('.ashModalImgFr').append(frImg).append(fromTitle);
        $('.ashModalImgTo').html(ashModalImgTo);
        $('.closeDeviceMsg').prop('href', linkTo);
    });

    //TODAYS CHALLENGE LOG
    if ($('.challenge-log-select').length) {
        var chlgDC = new DateController(),
            chlgDCSel = $('.challenge-log-select'),
            currUrl = chlgDCSel.attr('data-current-json-url'),
            chlgDP = chlgDCSel.find('.date-period');

        var buildControl = function () {
            chlgDC.initialize('challenge-log');
            chlgDC.getData(chlgDCSel, currUrl);
            var start = chlgDP.attr('data-date-start'),
                end = chlgDP.attr('data-date-end'),
                type = chlgDCSel.attr('data-date-type');

            $('button.template-render-init').attr('data-json-url', currUrl);
            chlgDCSel.attr('data-current-json-url', currUrl);
        };
        var VMBtn = function (entries) {
            if ($.isArray(entries)) {  //if entries are an array, send in length
                showHideVMBtn(entries.length);
            } else if (!isNaN(entries)) {
                showHideVMBtn(entries);
            } else {  //if neither array or number hide button
                $('button.template-render-init').hide();
            }
        };
        var showHideVMBtn = function (numRecs) { //show hide 'view more' button
            var btn = $('button.template-render-init'),
                sel = $('.template-render-init').not('button'),
                recs = parseInt(numRecs),
                load = parseInt(chlgDCSel.attr('data-number-to-load'));

            if (isNaN(recs) || isNaN(load)) {  //if no number to load or number of records, show button
                btn.hide();
            } else {
                if (recs > load) {
                    //if more recs than num to load show button
                    btn.show();
                } else {
                    //if not, hide button
                    btn.hide();
                }
            }
        };

        var viewAll = function () {
            var callback = function (trigr, jsonData, target, endSlice) {
                target = $('button.template-render-init') || target;

                if (trigr.is('option')) {
                    target.click(function () {
                        $$ash.getTemplateData(target, target.attr('data-json-url'), target.attr('data-ash-template-url'), target.attr('data-ash-target-id'), callback);
                    });
                } else {
                    target.hide(); //remove show all button
                }
            };
            $$ash.templateInitHelper(callback);
            $('button.template-render-init').attr('data-json-url', currUrl);
        };

        buildControl();
        viewAll();

        $('#template-target').on('click', chlgDCSel.find('a[data-json-url]'), function (e) {
            var eTarget = $(e.target);

            if (eTarget.attr('href')) {
                //let links pass through
            } else {

                e.preventDefault();

                var obj = $(this),
                    trigrBtn = eTarget.parent();

                if (trigrBtn.attr('data-json-url') !== undefined) {
                    //click date control to add custom date
                    currUrl = trigrBtn.attr('data-json-url');

                    $$ash.getTemplateData(chlgDCSel, currUrl, chlgDCSel.attr('data-ash-template-url'), 'template-target', updateCurrent);
                }
            }
            function updateCurrent(trigr, jsonData, target, endSlice) {
                buildControl();
                viewAll();
                VMBtn(jsonData.items);
            }
        });
        $('#template-target + .btn-cont button').on('click', function () {
            $(this).hide();
        });
    }
    //SET UP SHARE FUNCTIONALITY
    $('a.share-social').on('click.social', function () {
        var twt = $('.social.twitter'),
            fbShare = $('.social.facebook');

        if (twt.length) {
            twt.attr('href', twt.attr('href') + '?text=' + twt.data('twitter-msg') + '&url=' + $$siteSettings.url);
        }
        if (fbShare.length) {
            $.ajaxSetup({ cache: true });

            if (typeof FB === 'undefined') {
                $.getScript('//connect.facebook.net/en_US/all.js', function () {
                    FB.init({
                        appId: $$siteSettings.fbAppId,
                    });

                    fbShare.click(function (e) {
                        var obj = $(this);

                        e.preventDefault();

                        FB.ui({
                            method: 'share_open_graph',
                            action_type: $$siteSettings.fbNamespace + ':complete',
                            action_properties: JSON.stringify({
                                "challenge": obj.attr('href'),
                            })
                        }, function () {

                        });
                    });
                });
            }
        }
    });
    
    if (typeof Handlebars !== 'undefined') {
        //HELPER FUNCTION TO HANDLE RANK ICON CLASSES
        Handlebars.registerHelper('rankIcon', function (object) {
            var rank = object;

            rank = rank.replace(" Place","");
        
            if (!(rank === "1st" || rank === "2nd" || rank === "3rd")) {
                rank = "rank";
            }

            return new Handlebars.SafeString(rank);
        });
        
        //HELPER FUNCTION TO HANDLE RANK COLOR CLASSES
        Handlebars.registerHelper('rankColor', function (object) {
            var rank = object;

            rank = rank.replace(" Place", "");

            if (rank === "1st" || rank === "2nd" || rank === "3rd") {
                rank = " rank-" + rank;
            } else {
                rank = "";
            }

            return new Handlebars.SafeString(rank);
        });
        
        //HELPER FUNCTION TO HANDLE RANK COLOR CLASSES
        Handlebars.registerHelper('rankNum', function (object) {
            var rank = object;

            rank = rank.charAt(0);

            return new Handlebars.SafeString(rank);
        });
        
        //HELPER FUNCTION TO HANDLE COMPARISONS
        Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
            switch (operator) {
                case '==':
                    return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '!=':
                    return (v1 != v2) ? options.fn(this) : options.inverse(this);
                case '===':
                    return (v1 === v2) ? options.fn(this) : options.inverse(this);
                case '!==':
                    return (v1 !== v2) ? options.fn(this) : options.inverse(this);
                case '<':
                    return (v1 < v2) ? options.fn(this) : options.inverse(this);
                case '<=':
                    return (v1 <= v2) ? options.fn(this) : options.inverse(this);
                case '>':
                    return (v1 > v2) ? options.fn(this) : options.inverse(this);
                case '>=':
                    return (v1 >= v2) ? options.fn(this) : options.inverse(this);
                case '&&':
                    return (v1 && v2) ? options.fn(this) : options.inverse(this);
                case '||':
                    return (v1 || v2) ? options.fn(this) : options.inverse(this);
                default:
                    return options.inverse(this);
            }
        });

        //HELPER FUNCTION TO REPLACE RETURNS AND LINEBREAKS WITH <BR />
        Handlebars.registerHelper('linebreaks', function (inpStr) {
            inpStr = Handlebars.Utils.escapeExpression(inpStr);
            inpStr = inpStr.replace(/(\r\n|\n|\r)/gm, '<br />');
            return new Handlebars.SafeString(inpStr);
        });

        Handlebars.registerHelper('connectedWidget', function (activityType) {
            //return icon name based off activityType
            switch (activityType) {
                case 'Steps':
                    return new Handlebars.SafeString('walking');
                case 'Minutes':
                    return new Handlebars.SafeString('Minutes');
                case 'Check-ins':
                    return new Handlebars.SafeString('valid');
                default:
                    return new Handlebars.SafeString('default');
            }
        });
    }

    $$ash.updateProgress();

    if ($('#message-template').length) {
        $$messageCenterInit();
    }

    if ($('.removeOnSubmit').length) {
        (function replaceButtonOnSubmit() {
            var btn = $('.removeOnSubmit'),
                form = btn.closest('form'),
                loader = btn.siblings('.progress-indicator');

            form.on('submit.removeOnSubmit', function (e) {
                var obj = $(this),
                    btnDetached;

                if (!form.hasClass('ajaxPost') && !form.find('.validation-fail').length) {
                    btnDetached = btn.detach();

                    if (loader.length) {
                        loader.css('display', 'inline-block');
                    }

                    obj.on('submit.preventAnotherSubmit', function (e) {
                        e.preventDefault();
                    });
                }
            });
        })();
    }

    $('.viewMore').initViewMoreButton();

    $('.ajaxSearch').ajaxSearchInit();
});//END DOCUMENT READY

$(window).load(function () {
    $('.ashModalPrint').on('click', function (e) {
        e.preventDefault();
        $$ash.ashModalPrinter($('.logo-cont img'), $(this).closest('.ashModalPanel').html(), $('link'));
    });
    function triggerPrint(theTrigger, printContent, link) {
        theTrigger.on('click', function (e) {
            e.preventDefault();
            $$ash.ashModalPrinter(null, $(this).closest(printContent).html(), link);
        });
    }
    //Call TriggerPrint and pass the print trigger, the container with the content to be printed, and link
    triggerPrint($('.tab-template .print-selection'), $('.tab-template'), $('link'));

    if ($('form.validate').length) {
        $$ashVal.init();
    }
    //if there is no sticky nav and jump is a param in the url, run jumpToContent
    if (!$('.ash-sticky-nav').length && $.urlParam('jump') !== null && $(window).scrollTop() === 0) {
        $.jumpToContent();
    }

    //CONTACT US MESSAGE LENGTH COUNTDOWN
    $('.ash-countdown').each(function () {
        $(this).ashCountdown();
    });

    function setupShareEmail(emailForm) {
        var obj = $(emailForm),
            btn = obj.find('input[type=submit]'),
            ind = obj.find('.progress-indicator');

        function shareEmail(ele, response) {
            var jsonData = $$ash.unstringJSON(response);

            obj.find('label input').val('');

            if (jsonData.error === true) {
                $$ash.ajaxFail(obj, jsonData.errorMessage);
            } else {
                //add success message to the form
                $$ash.formSuccess(obj, jsonData);
            }
        }

        obj.on('submit.email', function (e) {
            var ajaxData = $$ash.serializeDataToObject(obj);

            $$ashVal.validateAllAndSubmit(obj, undefined, {
                data: ajaxData,
                callback: shareEmail
            });
        });
    }
    
    setupShareEmail('#share-email');

    function labelInputChkr(lbl, inpt, sc) { // (label, input, signal 'on' class)
        if (lbl.closest('.label_group').length > 0) { //if select switch, use 's_on' class
            lbl.closest('.label_group').find('.' + sc).removeClass(sc);
            if (lbl.parent().hasClass('label_radio_btn')) {
                lbl.addClass(sc);
            } else {
                lbl.addClass(sc);
            }
            inpt.focus();
        }
    }

    $('.radio-card').each(function () {
        var obj = $(this),
            objLabel = $(this).closest('label'),
            objLabelSib = objLabel.siblings(),
            objInput = obj.find($('input'));

        if (obj.hasClass('image')) {
            //IE8 issue where clicking an image does not trigger a change
            objLabel.on('click', function () {
                if (objInput.prop('checked') === false) {
                    objInput.prop('checked', true);
                    changeState();
                }
            });
        }
        
        objInput.on('change', changeState);

        function changeState() {
            labelInputChkr(objLabel, objInput, 'radio_on');
                objLabelSib.addClass('radio_off');
            }

        if (objInput.prop('checked')) {
            objLabel.addClass('radio_on');
        }
    });

    $$ash.preventDefaultFormSubmit();
}); // END DOCUMENT READY

$(window).on('load resize', function () {
    $$ash.flexheightFallback();
    $$ash.cardsEqualHeight();
});