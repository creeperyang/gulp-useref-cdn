'use strict';
var should = require('should');
var fs = require('fs');
var path = require('path');
var gutil = require('gulp-util');
var useref = require('../dist/cdn.js');
var gulp = require('gulp');
var rename = require('gulp-rename');

function getFile(filePath) {
    return new gutil.File({
        path:     filePath,
        cwd:      __dirname,
        base:     path.dirname(filePath),
        contents: fs.readFileSync(filePath)
    });
}

function getFixture(filePath) {
    return getFile(path.join('test', 'fixtures', filePath));
}

function getExpected(filePath) {
    return getFile(path.join('test', 'expected', filePath));
}

function compare(name, expectedName, done) {
    var stream = useref();

    stream.on('data', function(newFile) {
        if (path.basename(newFile.path) === name) {
            should(String(getExpected(expectedName).contents)).eql(String(newFile.contents));
        }
    });

    stream.on('end', function() {
        done();
    });

    stream.write(getFixture(name));

    stream.end();
}

describe('useref()', function() {
    it('file should pass through', function(done) {
        var a = 0;

        var fakeFile = new gutil.File({
            path: './test/fixture/file.js',
            cwd: './test/',
            base: './test/fixture/',
            contents: new Buffer('wadup();')
        });

        var stream = useref();
        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal('./test/fixture/file.js');
            newFile.relative.should.equal('file.js');
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(fakeFile);
        stream.end();
    });

    it('should replace reference in css block and return replaced files', function(done) {
        compare('01.html', '01.html', done);
    });


    it('should replace reference in js block and return replaced files', function(done) {
        compare('02.html', '02.html', done);
    });

    it('should handle comments and whitespace in blocks', function(done) {
        compare('03.html', '03.html', done);
    });

    it('should handle multiple blocks', function(done) {
        compare('04.html', '04.html', done);
    });

    it('should handle custom blocks', function (done) {
        var stream = useref({
            custom: function (content, target) {
                return content === 'someContent' ? target : content;
            }
        });

        stream.on('data', function (newFile) {
            getExpected('custom-blocks.html').contents.toString().should.equal(newFile.contents.toString());
        });

        stream.on('end', done);

        stream.write(getFixture('custom-blocks.html'));
        stream.end();
    });
});

describe('useref.assets()', function() {
    it('should concat CSS assets and pass them through', function(done) {
        var a = 0;

        var testFile = getFixture('01.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should skip concatenation and pass CSS assets through with noconcat option', function(done) {
        var a = 0;

        var testFile = getFixture('01.html');

        var stream = useref.assets({ noconcat: true });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            if (a === 1) {
                newFile.path.should.equal(path.join(__dirname, './fixtures/css/two.css'));
            } else if (a === 2) {
                newFile.path.should.equal(path.join(__dirname, './fixtures/css/one.css'));
            }
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(2);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should concat JS assets and pass them through', function(done) {
        var a = 0;

        var testFile = getFixture('02.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/scripts/combined.js'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should skip concatenation and pass JS assets through with noconcat option', function(done) {
        var a = 0;

        var testFile = getFixture('02.html');

        var stream = useref.assets({ noconcat: true });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            if (a === 1) {
                newFile.path.should.equal(path.join(__dirname, './fixtures/scripts/that.js'));
            } else if (a === 2) {
                newFile.path.should.equal(path.join(__dirname, './fixtures/scripts/this.js'));
            }
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(2);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should handle an alternate css search path', function(done) {
        var a = 0;

        var testFile = getFixture('05.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should handle an alternate js search path', function(done) {
        var a = 0;

        var testFile = getFixture('06.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/scripts/combined.js'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should get the alternate search path from options', function(done) {
        var a = 0;

        var testFile = getFixture('07.html');

        var stream = useref.assets({
            searchPath: '.tmp'
        });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            switch (newFile.path) {
                case path.normalize('./test/fixtures/scripts/main.js'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/scripts/main.js'));
                    break;
                case path.normalize('./test/fixtures/css/combined.css'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
                    break;
            }
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(2);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should get the alternate search paths from options with brace expansion', function(done) {
        var a = 0;

        var testFile = getFixture('alternate-search-paths.html');

        var stream = useref.assets({
            searchPath: '{.tmp,fixtures}'
        });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            switch (newFile.path) {
                case path.normalize('./test/fixtures/scripts/main.js'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/scripts/main.js'));
                    break;
                case path.normalize('./test/fixtures/css/combined.css'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
                    break;
            }
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(2);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should get assets with parent directory reference using brace expansion', function(done) {
        var a = 0;

        var testFile = getFixture('07.html');

        var stream = useref.assets({
            searchPath: '.{,t{,m}}p,../another/search/path'
        });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            switch (newFile.path) {
                case path.normalize('./test/fixtures/scripts/main.js'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/scripts/main.js'));
                    break;
                case path.normalize('./test/fixtures/css/combined.css'):
                    newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
                    break;
            }
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(2);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should handle an alternate search path in multiple build blocks', function(done) {
        var a = 0;

        var testFile = getFixture('08.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            var assetpath = [
                './test/fixtures/css/combined.css',
                './test/fixtures/scripts/combined.min.js',
                './test/fixtures/scripts/combined2.min.js'
            ];

            assetpath.forEach(function (filepath) {
                if (newFile.path === path.normalize(filepath)) {
                    should.exist(newFile.contents);
                    newFile.path.should.equal(path.normalize(filepath));
                    ++a;
                }
            });
        });

        stream.once('end', function () {
            a.should.equal(3);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should ignore build blocks with no assets', function(done) {
        var a = 0;

        var testFile = getFixture('09.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.not.equal(path.normalize('./test/fixtures/css/vendor.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(0);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should understand absolute search paths', function(done) {
        var a = 0;

        var testFile = getFixture('absolute-search-path.html');

        var searchPath = path.join(__dirname, 'fixtures', 'css');
        var stream = useref.assets({
            searchPath: searchPath
        });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should not explode on custom blocks', function (done) {
        var stream = useref.assets();

        stream.on('end', function () {
            done();
        });

        stream.write(getFixture('custom-blocks.html'));
        stream.end();
    });

    it('should work with relative paths', function(done) {
        var a = 0;

        var testFile = getFixture('10.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/scripts/combined.js'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should ignore absolute urls', function(done) {
        var a = 0;

        var testFile = getFixture('remote-path.html');

        var stream = useref.assets();

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    it('should transform paths when transformPath function is set', function(done) {
        var a = 0;

        var testFile = getFixture('bad-path.html');

        var stream = useref.assets({
            transformPath : function(filePath) {
                return filePath.replace('/rootpath','')
            }
        });

        stream.on('data', function(newFile){
            should.exist(newFile.contents);
            newFile.path.should.equal(path.normalize('./test/fixtures/css/combined.css'));
            ++a;
        });

        stream.once('end', function () {
            a.should.equal(1);
            done();
        });

        stream.write(testFile);

        stream.end();
    });

    // it('should support external streams', function(done) {
    //     var extStream1 = gulp.src('test/fixtures/scripts/that.js')
    //         .pipe(rename('renamedthat.js'));

    //     var extStream2 = gulp.src('test/fixtures/scripts/yetonemore.js')
    //         .pipe(rename('renamedyet.js'));

    //     var extStream3 = gulp.src('test/fixtures/scripts/yetonemore.js')
    //         .pipe(rename('renamedunused.js')); // Only necessary files should be passed down the stream*/

    //     var fileCount = 0;

    //     var through = require('through2');
    //     var assets = useref.assets({
    //         noconcat: true,
    //         additionalStreams: [extStream1, extStream2, extStream3]
    //     });

    //     gulp.src('test/fixtures/11.html')
    //         .pipe(assets)
    //         .pipe(through.obj(function (newFile, enc, callback) {
    //             should.exist(newFile.contents);

    //             switch (fileCount++) { // Order should be maintained
    //                 case 0:
    //                     newFile.path.should.equal(path.join(__dirname, 'fixtures/scripts/this.js'));
    //                     break;
    //                 case 1:
    //                     newFile.path.should.equal(path.join(__dirname, 'fixtures/scripts/renamedthat.js'));
    //                     break;
    //                 case 2:
    //                     newFile.path.should.equal(path.join(__dirname, 'fixtures/scripts/anotherone.js'));
    //                     break;
    //                 case 3:
    //                     newFile.path.should.equal(path.join(__dirname, 'fixtures/scripts/renamedyet.js'));
    //                     break;
    //             }
    //             callback();
    //         }, function () {
    //             fileCount.should.equal(4);
    //             done();
    //         }));
    // });
});

// describe('useref.restore()', function() {
//     it('should bring back the previously filtered files', function(done) {
//         var testFile = getFixture('01.html');

//         var stream = useref.assets();
//         var buffer = [];

//         var completeStream = stream.pipe(stream.restore());

//         completeStream.on('data', function (file) {
//             buffer.push(file);
//         });

//         completeStream.on('end', function () {
//             buffer[0].path.should.equal(path.normalize('./test/fixtures/01.html'));
//             should(String(buffer[0].contents)).eql(String(testFile.contents));
//             done();
//         });

//         stream.write(testFile);

//         stream.end();
//     });
// });
