//Dependancies
var gulp = require('gulp'),
    browserSync = require('browser-sync'),
    watch = require('gulp-watch'),
    fs = require('fs'),
    path = require('path'),
    dive = require('dive'),
    jf = require('jsonfile'),
    sizeOf = require('image-size'),
    Exif = require('exif').ExifImage,
    Thumbnail = require('thumbnail'),
    $ = require('gulp-load-plugins')();

require('natural-compare-lite');

//Helpers
var returnTimestamp = function () {
        var time = new Date(),
            hour = time.getHours(),
            minute = time.getMinutes(),
            second = time.getSeconds();

        function returnTwoDigit(obj) {
            if (obj < 10) {
                obj = '0' + obj;
            }

            return obj;
        }

        return '[' + returnTwoDigit(hour) + ':' + returnTwoDigit(minute) + ':' + returnTwoDigit(second) + ']';
    };
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

gulp.task('watchSASS', function () {
    $.livereload.listen();

    gulp.watch('app/styles/**/*.scss', function (event) {
        var psia = (event.path).toLowerCase().split('\\'), //psia = pathSplitIntoArray
            folder = psia[psia.indexOf('app_themes') + 1],
            src;

        gulp.src('app/styles/**/*.scss')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            errLogToConsole: true
        }))
        //.pipe($.autoprefixer({
        //    browsers: ['last 2 versions'],
        //    cascade: true
        //}))
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('app/styles/'))
        .pipe($.print(function (filepath) {
            return returnTimestamp() + ' Compiled: ' + filepath;
        }))
        .pipe($.livereload({
            quiet: true
        }));
    });
});

gulp.task('generateJson', function () {
    var cwd = process.cwd(),
        imageFolders = ['action', 'music', 'landscape', 'people'],
        imageFoldersLength = imageFolders.length,
        i;

    function writeJson(currentFolder, images) {
        var file = 'app/scripts/json/' + currentFolder + '.json',
            obj;

        images.sort(function(a, b){
            return String.naturalCompare(a.src, b.src);
        });

        obj = {
            category: currentFolder,
            images: images
        };

        jf.writeFile(file, obj);
    }

    function getExif(o) {
        var file = o.file,
            fullPath = o.fullPath,
            listOfData = o.listOfData,
            currentFolder = o.currentFolder,
            dimensions = o.dimensions,
            final = o.final;

        try {
            new Exif({ image : fullPath }, function (error, exifData) {
                if (error)
                    console.log('Error: '+error.message);
                else {
                    listOfData.push({
                        title: 'Title',
                        src: file,
                        caption: exifData.image.ImageDescription,
                        width: dimensions.width,
                        height: dimensions.height
                    });
                    if (final === true) {
                        writeJson(currentFolder, listOfData);
                    }
                }
            });
        } catch (error) {
            console.log('Error: ' + error.message);
        }
    }

    for (i = 0; i < imageFoldersLength; i++) {
        var currentFolder = imageFolders[i],
            files = [],
            listOfData = [],
            lengthOfList,
            index = 0;

        fs.readdirSync(cwd + '/app/images/' + currentFolder).forEach(function(element) {
            if(path.extname(element) === ".jpg") {
                files.push(element);
            }
        });

        lengthOfList = files.length;

        files.forEach(function(element) {
            var fullPath = cwd + '\\app\\images\\' + currentFolder + '\\' + element,
                dimensions = sizeOf(fullPath),
                final;

            index = index + 1;
            final = index === lengthOfList ? true : false;

            getExif({
                file: element,
                fullPath: fullPath,
                listOfData: listOfData,
                currentFolder: currentFolder,
                dimensions: dimensions,
                final: final
            });
        });


        //(function(i) {
        //    var currentFolder = imageFolders[i];
        //
        //    imageLists[currentFolder] = [];


        //    dive(process.cwd() + '/app/images/' + currentFolder, {recursive: false}, function(err, file) {
        //        if (file.endsWith('.jpg')) {
        //            var dimensions = sizeOf(file);
        //
        //            getExif({
        //                file: file,
        //                allArrays: imageLists,
        //                currentFolder: currentFolder,
        //                dimensions: dimensions,
        //                callback: getExifCb
        //            });
        //        }
        //    }, function() {
        //        writeJson(currentFolder, imageLists[currentFolder]);
        //    });
        //})(i);
        //})
    }
});

gulp.task('browser-sync', function () {
    browserSync({
        server: {
            baseDir: "./",
            directory: true
        }
    });
});

//gulp.task('default', ['sassWatcher']);
//gulp.task('buildHYR', ['buildHyrJs', 'buildHyrCss']);
//gulp.task('watch', ['watchBase', 'watchSASS']);