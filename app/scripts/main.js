'use strict';

jQuery(function ($) {
    var secTops = [],
        navFix,
        offset = 400,
        currentLoc,
        section,
        mobileView = 860,
        $nav = $('nav'),
        $categories = $('section'),
        $content = $('#content-wrapper'),
        $footer = $('footer'),
        $htmlBody = ('html, body'),
        jsonList = ['action', 'music', 'people', 'landscape'];

    function loadScreen() {
        $('#splash').fadeOut();
        $('body').fadeIn();
    }

    function coordsUpdate() {
        secTops.length = 0;
        $categories.each(function() {
            secTops.push($(this).offset().top - offset);
        });
        navFix = secTops[0] + offset;
    }

    function sectionCounter() { // counts which section the user is on based on scrollTop position
        currentLoc = $(window).scrollTop();
        if (currentLoc > secTops[0] && currentLoc < $footer.offset().top) {
            for (var i = 0; i < secTops.length; i++) {
                if (currentLoc > secTops[i] && currentLoc < secTops[i+1]) {
                    section = i;
                    break;

                } else {
                    section = i;
                }
            }
        } else {
            section = -1;
        }

        navAdjust(section);
        fadeIn(section);
    }

    function fadeIn(section) {
        if (section >= 0 && section <= 6) {
            $($categories[section]).addClass('live');

            for (var i = 0; i < 5; i++) {
                if (i != section) {
                    $($categories[i]).removeClass('live');
                }
            }
        }

        else {
            $categories.removeClass('live');
        }
    }

    function navAdjust(section) { //fix the navbar to the top and highlight the correct section in the navbar or fix the section header to top if using mobile viewport.
        if ($(window).width() >= mobileView) {
            if ($(window).scrollTop() >= navFix) {
                $nav.addClass('fixed');
            } else {
                $nav.removeClass('fixed');
            }

            if (section >= 0 && section <= 6) {
                $nav.find('a.active').removeClass('active');
                $nav.find('a:eq(' + section + ')').addClass('active');
                $('img.active').removeClass('active');
                //$($categories[section]).find('.banner img').addClass('active');
            }
            else { //unfix navbar if user is on top of page or at bottom
                $nav.find('a.active').removeClass('active');
            }
        }

        else {
            if ($(window).scrollTop() >= secTops[0]) { //don't want the navbar on top if using mobile viewport
                $content.find('.top-fix').removeClass('top-fix').removeClass('top-fix');
            }
            else {
                $nav.removeClass('fixed');
            }
        }
    }

    $nav.on('click', 'a', function() { // bring user to specific section if clicked on in the main navbar
        $nav.find('a.active').removeClass('active');
        var targetHeight = $($(this).attr('href')).offset().top;
        $($htmlBody).stop(true, true).animate({scrollTop: targetHeight},800);
        //return false;
    });

    $('.swipebox').swipebox();

    //HANDLEBARS INIT
    /*$('script.js-template-manager').each(function () {
        var obj = $(this),
            objSrc = obj.attr('src'), //src for json data
            dataSrc = objSrc;

        GlAshCo.startTemplate(dataSrc, obj.attr('data-ash-template'), obj.attr('data-ash-id'));
    });
    */

    //handlebar
    var GlAshCo = {
        startTemplate: function (source, template, id, callback) {
            var obj = {};

            $.when(
                $.getJSON(source, function (data) {
                    obj.data = data;

                }),
                $.get(template, function (tmp) {
                    obj.template = tmp;

                })
            ).then(
                //success
                function () {
                    GlAshCo.renderTemplate(obj.template, obj.data, id, true, callback);
                },
                //fail
                function () {
                    GlAshCo.renderTemplate(obj.template, obj.data, id, false);
                }
            );
        },

        renderTemplate: function (templateHtml, data, id, isSuccess, callback) {
            var ele = document.getElementById(id);
            //if get json and get template are successful
            if (isSuccess) {
                var tmp = Handlebars.compile(templateHtml),
                    result = tmp(data);
                $(ele).html(result);

                coordsUpdate();
                loadScreen();
                sectionCounter();
            } else {
                $(ele).html('Sorry, an error occured. Please try again or contact us.');
            }
        }
    };

    for (var i in jsonList) {
        console.log(i)
        GlAshCo.startTemplate('scripts/json/' + jsonList[i] +'.json', 'js-template/images-template.hbs', jsonList[i]);
    }


    $(window).on('orientationchange resize', function() {
        coordsUpdate();
        loadScreen();
        sectionCounter();
    });
    $(window).on('scroll', sectionCounter);
});

