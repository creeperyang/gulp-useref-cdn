import path from 'path';
import useref from 'node-useref';
import through from 'through2';
import isRelativeUrl from 'is-relative-url';
import expand from 'brace-expansion';
import _ from 'lodash';
import vfs from 'vinyl-fs';
import gulpif from 'gulp-if';
import concat from 'gulp-concat';
import gutil from 'gulp-util';
import crypto from 'crypto';

import {config, upload, del, batchStat, batchDelete} from './qn.js';

const PLUGIN_NAME = 'gulp-qn-cdn';
const assetsSetting = {
    silent: true, // log nothing but error
    md5: 8 // md5 bits: 0(none), 8, 32(all)
};
const noop = () => {};
const reScript = /<?script\(?\b[^<]*(?:(?!<\/script>|\))<[^<]*)*(?:<\/script>|\))/gmi;
const reCss = /<?link.*?(?:>|\))/gmi;
const reSubtype = /(?:^|\s+)subtype\s*=\s*(['"])(\S+)\1\s*/gmi;
const reBucket = /(?:^|\s+)bucket\s*=\s*(['"])(\S+)\1\s*/gmi;
const reKey = /(?:^|\s+)key\s*=\s*(['"])(\S+)\1\s*/gmi;
let finalAssetsSetting;
let zlog = noop;

const getSearchPaths = (cwd, searchPath, filepath) => {
    // Assuming all paths are relative, strip off leading slashes
    filepath = filepath.replace(/^\/+/, '');

    // Check for multiple search paths within the array
    if (searchPath.indexOf(',') !== -1) {
        return searchPath.split(',').map((nestedSearchPath) => {
            return path.resolve(cwd, nestedSearchPath, filepath);
        });
    } else {
        return path.resolve(cwd, searchPath, filepath);
    }
};

/**
 * generate qiniu cdn's key from file
 * @param {Buffer} data - file data
 * @param {String} prefix - key's prefix
 * @param {String} filename
 * @param {type} type - filetype, like js, css ...
*/
const genFileKey = (data, prefix = PLUGIN_NAME + '/', filename = '', type = 'miss') => prefix + 
    filename + '-' + crypto.createHash('md5').update(data).digest('hex').substr(0, finalAssetsSetting.md5) + '.' + type;

const handleCdnAttr = attrs => {
    let subtype, bucket, key;
    if(attrs) {
        subtype = reSubtype.exec(attrs);
        bucket = reBucket.exec(attrs);
        key = reKey.exec(attrs);
        if(subtype) {
            subtype = subtype[2];
            attrs = attrs.replace(reSubtype, ' ').trim();
        }
        if(bucket) {
            bucket = bucket[2];
            attrs = attrs.replace(reBucket, ' ').trim();
        }
        if(key) {
            key = key[2];
            attrs = attrs.replace(reKey, ' ').trim();
        }
        return {subtype, bucket, key, attrs};
    }
    return {};
};

const handleCdnContent = (content, attrs, target, parsedAttr) => {
    let ret;
    if (reScript.test(content)) {
        if (attrs) {
            ret = '<script src="' + target + '" ' + attrs + '></script>';
        } else {
            ret = '<script src="' + target + '"></script>';
        }
        if(parsedAttr && !parsedAttr.subtype) {
            parsedAttr.subtype = 'js';
        }
    }
    if (reCss.test(content)) {
        if (attrs) {
            ret = '<link rel="stylesheet" href="' + target + '" ' + attrs + '>';
        } else {
            ret = '<link rel="stylesheet" href="' + target + '">';
        }
        if(parsedAttr && !parsedAttr.subtype) {
            parsedAttr.subtype = 'css';
        }
    }
    return ret;
};

const cdnInfo = {};

/**
 * handle assets: concat files and upload to cdn
 * @param {Object} opts - options
 * @param {Stream} steams
*/
const assets = (opts = {}, ...streams) => {

    let restoreStream = through.obj();
    let types = opts.types || ['css', 'js', 'cdn'];
    let validCdnConfig = opts.accessKey && opts.secretKey && opts.domain;
    let keyPrefix = opts.keyPrefix;

    opts = finalAssetsSetting = _.assign({}, assetsSetting, opts);

    zlog = ((silent) => {
        return silent ? noop : gutil.log;
    })(opts.silent);

    if(!validCdnConfig) {
        zlog(gutil.colors.cyan(PLUGIN_NAME), gutil.colors.red('invalid qiniu cdn config.'));
    } else {
        config(opts.accessKey, opts.secretKey, opts.bucket, opts.domain);
    }
    let assetStream = through.obj(async function(file, enc, cb) {
        let parsedAttr = {};
        let output = useref(file.contents.toString(), {
            cdn(content, target, attrs, alternateSearchPath) {
                parsedAttr[target] = handleCdnAttr(attrs);
                return handleCdnContent(content, parsedAttr[target].attrs, target, parsedAttr[target]);
            }
        });
        let assets = output[1];
        for(let type of types) {
            let files = assets[type];
            if (!files) {
                continue;
            }
            for(let name of Object.keys(files)) {
                let filepaths = files[name].assets;
                let src, globs, searchPaths;

                if (!filepaths.length) {
                    continue;
                }

                searchPaths = files[name].searchPaths || opts.searchPath;

                // If searchPaths is not an array, use brace-expansion to expand it into an array
                if(!Array.isArray(searchPaths)) {
                    searchPaths = expand(searchPaths);
                }

                // Get relative file paths and join with search paths to send to vinyl-fs
                globs = filepaths
                    .filter(isRelativeUrl)
                    .map(filepath => {
                        if (opts.transformPath) {
                            filepath = opts.transformPath(filepath);
                        }
                        if (searchPaths.length) {
                            return searchPaths.map(function (searchPath) {
                                return getSearchPaths(file.cwd, searchPath, filepath);
                            });
                        } else {
                            return path.join(file.base, filepath);
                        }
                    });
                // Flatten nested array before giving it to vinyl-fs
                src = vfs.src(_.flatten(globs, true), {
                    base: file.base,
                    nosort: true,
                    nonull: true
                });

                // If any external streams were included, pipe all files to them first
                streams.forEach( stream => {
                    src = src.pipe(stream(name));
                });
                // Add assets to the stream
                // If noconcat option is false, concat the files first.
                await new Promise((resolve, reject) => {
                    src.pipe(gulpif(!opts.noconcat, concat(name)))
                        .pipe(through.obj( (newFile, enc, callback) => {
                            this.push(newFile);
                            // do cdn upload
                            let info = cdnInfo[name] = {
                                globs: globs,
                                contents: newFile.contents,
                                attrs: parsedAttr[name]
                            };
                            if(newFile.isBuffer() && validCdnConfig) {
                                upload(info.contents, info.attrs.key || 
                                    genFileKey(info.contents, keyPrefix, gutil.replaceExtension(path.basename(name), ''), info.attrs.subtype), 
                                    info.attrs.bucket).then(res => {
                                        info.url = res.url;
                                        info.uploaded = true;
                                        zlog(gutil.colors.cyan(PLUGIN_NAME), 'upload successfully!', gutil.colors.cyan(name), '-->', gutil.colors.cyan(info.url));
                                        callback();
                                    }).catch((err) => {
                                        zlog(gutil.colors.cyan(PLUGIN_NAME), gutil.colors.red('upload error'), JSON.stringify(err));
                                        this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'failed to upload to qiniu, maybe config info is invalid.'));
                                        callback();
                                    });
                            } else {
                                callback();
                            }
                        }))
                        .on('finish', () => {
                            resolve('cdn uploaded');
                        });
                });
            }
        }

        restoreStream.write(file, cb);
    }, function() {
        this.emit('end');
    });

    assetStream.restore = () => restoreStream.pipe(through.obj(), { end: false });

    return assetStream;
};

/**
 * rewrite html page/tag
 * @param {Object} opts - options
*/
const cdn = (opts = {}) => {
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return;
        }

        let output = useref(file.contents.toString(), _.assign(opts, {
            cdn(content, target, attrs, alternateSearchPath) {
                let info = handleCdnAttr(attrs);
                let url;
                if(cdnInfo[target].uploaded) {
                    url = cdnInfo[target].url;
                    zlog(gutil.colors.cyan(PLUGIN_NAME), 'rewrite HTML TAG with CDN url.', gutil.colors.cyan(url));
                } else {
                    url = target;
                    zlog(gutil.colors.cyan(PLUGIN_NAME), 'rewrite HTML TAG with local url.', gutil.colors.cyan(url));
                }
                return handleCdnContent(content, info.attrs, url);
            }
        }));
        let html = output[0];
        
        try {
            file.contents = new Buffer(html);
            this.push(file);
        } catch (err) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
        }

        cb();
    });
};

cdn.assets = assets;

export default cdn;