'use strict';

import gulp from 'gulp';
import eslint from 'gulp-eslint';
import mocha from 'gulp-mocha';
import rename from 'gulp-rename';
import clean from 'gulp-clean';
import babel from 'gulp-babel';

const paths = {
    scripts: ['src/*.js'],
    dist: 'dist'
};

gulp.task('lint', (cb) => {
    gulp.src(paths.scripts)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .on('finish', cb);
});

gulp.task('clean', () => {
    return gulp.src(paths.dist)
        .pipe(clean());
});

gulp.task('compile', ['clean', 'lint'], () => {
    return gulp.src(paths.scripts)
        .pipe(babel())
        .pipe(gulp.dest(paths.dist));
});

gulp.task('test', function () {
    return gulp.src('./test/test.js')
        .pipe(mocha({reporter: 'spec'}));
});

gulp.task('cdnTest', function () {
    return gulp.src('./test/cdn-test.js')
        .pipe(mocha({
            reporter: 'spec',
            timeout: 120000
        }));
});

gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['compile']);
});

gulp.task('default', ['compile', 'watch']);