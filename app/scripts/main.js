(function main () {
    'use strict';
	//what is this
    //var global = {
    //    handlebarsTemplateUrl: '../js-template/images-template.hbs'
    //};
    var secCoords = [],
        navFix,
        offset = 400,
        currentLoc,
        section,
        mobileView = 860,
        $window = $(window),
        $htmlBody = ('html, body'),
        nav,
        $categories = $('section'),
        $content = $('#content-wrapper'),
        footer,
        jsonList = ['action', 'music', 'people', 'landscape'];

    function loadScreen() {
        //$('#splash').fadeOut();
        //
        //$('body').fadeIn(400, function() {
        //
        //});
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

    function navLinkInit() {
        nav.find('a').on('click.navChange', function(e) {
            var obj = $(this),
                target = $(obj.attr('href')),
                targetHeight = target.offset().top;

            e.preventDefault();
            nav.find('.active').removeClass('active');
            $($htmlBody).stop(true, true).animate({scrollTop: targetHeight}, 800);
        });
    }

	function navAdjust(section) { //fix the navbar to the top and highlight the correct section in the navbar or fix the section header to top if using mobile viewport.
		if ($(window).width() >= mobileView) {
			if ($(window).scrollTop() >= secCoords[0]) {
                nav.addClass('fixed');
			} else {
                nav.removeClass('fixed');
			}

			if (section >= 0 && section <= 6) {
                nav.find('a.active').removeClass('active');
                nav.find('a:eq(' + section + ')').addClass('active');
				$('img.active').removeClass('active');
				//$($categories[section]).find('.banner img').addClass('active');
			}
			else { //unfix navbar if user is on top of page or at bottom
                nav.find('a.active').removeClass('active');
			}
		}

		else {
			if ($(window).scrollTop() >= secCoords[0]) { //don't want the navbar on top if using mobile viewport
				$content.find('.top-fix').removeClass('top-fix').removeClass('top-fix');
			}
			else {
                nav.removeClass('fixed');
			}
		}
	}

	function coordsUpdate() {
		var navFix;

		secCoords.length = 0;
		$categories.each(function() {
			secCoords.push($(this).offset().top - offset);
		});
		navFix = secCoords[0] + offset;
	}


	function sectionCounter() { // counts which section the user is on based on scrollTop position
		var currentLoc = $(window).scrollTop();

		if (currentLoc > secCoords[0] && currentLoc < footer.offset().top) {
			for (var i = 0; i < secCoords.length; i++) {
				if (currentLoc > secCoords[i] && currentLoc < secCoords[i+1]) {
					section = i;
					break;
				} else {
					section = i;
				}
			}
		} else {
			section = -1;
		}

        console.log(section);

		navAdjust(section);
		fadeIn(section);
	}

	function navAdjust2(section) { //fix the navbar to the top and highlight the correct section in the navbar or fix the section header to top if using mobile viewport.
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
			if ($(window).scrollTop() >= secCoords[0]) { //don't want the navbar on top if using mobile viewport
				$content.find('.top-fix').removeClass('top-fix').removeClass('top-fix');
			}
			else {
				$nav.removeClass('fixed');
			}
		}
	}

    function getJson(jsonUrl) { //function that returns the JSON only
        return $.getJSON(jsonUrl)
            .fail(function () {
				throw new Error('Error retrieving JSON data');
            });
    }
    function getHandlebarsTemplate(templateUrl) {
        return $.get(templateUrl)
            .fail(function (xhr) {
                throw new Error('Error retrieving HB template');
            });
    }
    function renderTemplate(o) {
        var template = o.template,
            json = o.json,
            target = o.target,
            callback = o.callback,
			renderedTemplate;

        renderedTemplate = Handlebars.compile(template)(json);
        target.html(renderedTemplate);

        if (typeof callback === "function") {
            callback();
        }
    }

    $(document).ready(function() {
        nav = $('nav');
        footer = $('footer');

        (function initHandlebars() {
            var categories = $('section.category'),
                numberOfCategories  = categories.length;

            getHandlebarsTemplate('js-template/images-template.hbs').done(function(template) {
                categories.each(function(i) {
                    var obj = $(this),
                        name = obj.attr('id');

                    getJson('scripts/json/' + name + '.json').done(function(json) {

                        renderTemplate({
                            template: template,
                            json: json,
                            target: obj,
                            callback: function() {
                                if (i === numberOfCategories - 1) {
									navLinkInit();
                                    coordsUpdate();

									$('#splash').remove();
                                }
                            }
                        });
                    });
                })
            });
        })();

        $window.on('load', function() {
            loadScreen();
        });

        $window.on('orientationchange resize', function() {
            coordsUpdate();
            sectionCounter();
        });

        $window.on('scroll', function(){
			sectionCounter();
		});
    });
})();
