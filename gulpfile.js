//Dependancies
var gulp = require('gulp'),
    browserSync = require('browser-sync'),
    watch = require('gulp-watch'),
    $ = require('gulp-load-plugins')();

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
        .pipe($.print(function (filepath) {
            return returnTimestamp() + ' Compiled: ' + filepath;
        }))
        .pipe($.autoprefixer({
            browsers: ['last 2 Chrome versions', 'last 2 Firefox versions', 'IE >= 8', 'last 2 versions'],
            cascade: true
        }))
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest('app/styles/'))
        .pipe($.livereload({
            quiet: true
        }));
    });
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