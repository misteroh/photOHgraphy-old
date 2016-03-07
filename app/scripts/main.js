(function main () {
    'use strict';

    let secCoords = [];
    let navFix;
    let offset = 200;
    let currentLoc;
    let section;
    let mobileView = 860;
    let $window = $(window);
    let $htmlBody = ('html, body');
    let nav;
    let categories;
    let $content = $('#content-wrapper');
    let footer;
    let jsonList = ['action', 'music', 'people', 'landscape'];

    function loadScreen() {
        //$('#splash').fadeOut();
        //
        //$('body').fadeIn(400, function() {
        //
        //});
    }

    function fadeIn(section) {
        if (section >= 0 && section <= 6) {
            categories.eq(section).addClass('live');
            categories.not(':eq(' + section + ')').removeClass('live');
        } else {
            categories.removeClass('live');
        }
    }

    function navLinkInit() {
        nav.find('a').on('click.navChange', function(e) {
            var obj = $(this),
                target = $(obj.attr('href')),
                targetHeight = target.offset().top;

            e.preventDefault();
            $($htmlBody).stop(true, true).animate({scrollTop: targetHeight}, 800);
        });
    }

	function navAdjust(section, currentLoc) { //fix the navbar to the top and highlight the correct section in the navbar or fix the section header to top if using mobile viewport.
		var navLinks = $('nav').find('a');

        if ($(window).width() >= mobileView) {
			if (currentLoc >= secCoords[0] + offset) {
                nav.addClass('fixed');
			} else {
                nav.removeClass('fixed');
			}

			if (section >= 0 && section <= 6) {
                navLinks.eq(section).addClass('active');
                navLinks.not(':eq(' + section + ')').removeClass('active');
				//$($categories[section]).find('.banner img').addClass('active');
			}
			else { //unfix navbar if user is on top of page or at bottom
                navLinks.removeClass('active');
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
		secCoords.length = 0;

		categories.each(function() {
            var obj = $(this),
                sectionPosition = obj.offset().top - offset;

			secCoords.push(sectionPosition);
		});

        sectionCounter();
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

		navAdjust(section, currentLoc);
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
				$content.find('.top-fix').removeClass('top-fix');
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
        categories = $('section');

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
                                endCallback(i);
                            }
                        });
                    });
                });
            });

            function endCallback(i) {
                 if (i === numberOfCategories - 1) {
                     navLinkInit();

                     $('img.thumb').on('load.thumb', function() {
                         coordsUpdate();
                     });

                     $('.slides').each( function() {
                         var $pic = $(this),
                             getItems = function() {
                                 var items = [];
                                 $pic.find('a').each(function() {
                                     var obj = $(this);

                                     var href = obj.attr('href'),
                                         size = obj.data('size').split('x'),
                                         width = size[0],
                                         height = size[1];

                                     var item = {
                                         src: href,
                                         w: width,
                                         h: height
                                     };

                                     items.push(item);
                                 });
                                 return items;
                             };

                         var items = getItems();
                         var $pswp = $('.pswp')[0];

                         $pic.on('click', 'a', function(e) {
                             e.preventDefault();

                             var $index = $(this).parent().index();
                             var options = {
                                 index: $index,
                                 bgOpacity: 0.7,
                                 showHideOpacity: true
                             };

                             // Initialize PhotoSwipe
                             var lightBox = new PhotoSwipe($pswp, PhotoSwipeUI_Default, items, options);
                             lightBox.init();
                         });
                     });

                     //$('#splash').remove();
                     //$('.main').on('load', function() {
                     //   var obj = template;
                     //
                     //    obj.addClass()
                     //});
                 }
            }
        })();

        $window.on('load', function() {
            loadScreen();
        });

        $window.on('orientationchange resize', function() {
            coordsUpdate();
        });

        $window.on('scroll', function(){
			sectionCounter();
		});
    });
})();
