import gulp from 'gulp';
import through from 'through2';
import should from 'should';
import fs from 'fs';
import path from 'path';
import cdn from '../dist/cdn.js';
// make sure your cdn config is right
import cdnConfig from './cdn-config.js';

describe('gulp-qn-cdn', function() {
    it('should concat CSS/JS assets, upload them to cdn and replace html tag', function(done) {
        let fileCount = 0;
        let assets = cdn.assets(cdnConfig);
        let files = ['test/expected/cdn.html', 'test/expected/cdn.html', 'test/expected/cdn.html'];

        gulp.src('test/fixtures/cdn.html')
            .pipe(assets)
            .on('error', (err) => {
                done(err);
            })
            .pipe(assets.restore())
            .pipe(cdn())
            .pipe(through.obj(function (newFile, enc, callback) {
                should.exist(newFile.contents);
                if(++fileCount === 3) {
                    let expected = fs.readFileSync('test/expected/cdn.html').toString();
                    newFile.contents.toString().should.equal(expected);
                }
                callback();
            }, function () {
                fileCount.should.equal(3);
                done();
            }));
    });
});