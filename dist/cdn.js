'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _nodeUseref = require('node-useref');

var _nodeUseref2 = _interopRequireDefault(_nodeUseref);

var _through2 = require('through2');

var _through22 = _interopRequireDefault(_through2);

var _isRelativeUrl = require('is-relative-url');

var _isRelativeUrl2 = _interopRequireDefault(_isRelativeUrl);

var _braceExpansion = require('brace-expansion');

var _braceExpansion2 = _interopRequireDefault(_braceExpansion);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _vinylFs = require('vinyl-fs');

var _vinylFs2 = _interopRequireDefault(_vinylFs);

var _gulpIf = require('gulp-if');

var _gulpIf2 = _interopRequireDefault(_gulpIf);

var _gulpConcat = require('gulp-concat');

var _gulpConcat2 = _interopRequireDefault(_gulpConcat);

var _gulpUtil = require('gulp-util');

var _gulpUtil2 = _interopRequireDefault(_gulpUtil);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _qnJs = require('./qn.js');

var PLUGIN_NAME = 'gulp-qn-cdn';
var assetsSetting = {
    silent: true, // log nothing but error
    md5: 8 // md5 bits: 0(none), 8, 32(all)
};
var noop = function noop() {};
var reScript = /<?script\(?\b[^<]*(?:(?!<\/script>|\))<[^<]*)*(?:<\/script>|\))/gmi;
var reCss = /<?link.*?(?:>|\))/gmi;
var reSubtype = /(?:^|\s+)subtype\s*=\s*(['"])(\S+)\1\s*/gmi;
var reBucket = /(?:^|\s+)bucket\s*=\s*(['"])(\S+)\1\s*/gmi;
var reKey = /(?:^|\s+)key\s*=\s*(['"])(\S+)\1\s*/gmi;
var finalAssetsSetting = undefined;
var zlog = noop;

var getSearchPaths = function getSearchPaths(cwd, searchPath, filepath) {
    // Assuming all paths are relative, strip off leading slashes
    filepath = filepath.replace(/^\/+/, '');

    // Check for multiple search paths within the array
    if (searchPath.indexOf(',') !== -1) {
        return searchPath.split(',').map(function (nestedSearchPath) {
            return _path2['default'].resolve(cwd, nestedSearchPath, filepath);
        });
    } else {
        return _path2['default'].resolve(cwd, searchPath, filepath);
    }
};

/**
 * generate qiniu cdn's key from file
 * @param {Buffer} data - file data
 * @param {String} prefix - key's prefix
 * @param {String} filename
 * @param {type} type - filetype, like js, css ...
*/
var genFileKey = function genFileKey(data) {
    var prefix = arguments.length <= 1 || arguments[1] === undefined ? PLUGIN_NAME + '/' : arguments[1];
    var filename = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];
    var type = arguments.length <= 3 || arguments[3] === undefined ? 'miss' : arguments[3];
    return prefix + filename + '-' + _crypto2['default'].createHash('md5').update(data).digest('hex').substr(0, finalAssetsSetting.md5) + '.' + type;
};

var handleCdnAttr = function handleCdnAttr(attrs) {
    var subtype = undefined,
        bucket = undefined,
        key = undefined;
    if (attrs) {
        subtype = reSubtype.exec(attrs);
        bucket = reBucket.exec(attrs);
        key = reKey.exec(attrs);
        if (subtype) {
            subtype = subtype[2];
            attrs = attrs.replace(reSubtype, ' ').trim();
        }
        if (bucket) {
            bucket = bucket[2];
            attrs = attrs.replace(reBucket, ' ').trim();
        }
        if (key) {
            key = key[2];
            attrs = attrs.replace(reKey, ' ').trim();
        }
        return { subtype: subtype, bucket: bucket, key: key, attrs: attrs };
    }
    return {};
};

var handleCdnContent = function handleCdnContent(content, attrs, target, parsedAttr) {
    var ret = undefined;
    if (reScript.test(content)) {
        if (attrs) {
            ret = '<script src="' + target + '" ' + attrs + '></script>';
        } else {
            ret = '<script src="' + target + '"></script>';
        }
        if (parsedAttr && !parsedAttr.subtype) {
            parsedAttr.subtype = 'js';
        }
    }
    if (reCss.test(content)) {
        if (attrs) {
            ret = '<link rel="stylesheet" href="' + target + '" ' + attrs + '>';
        } else {
            ret = '<link rel="stylesheet" href="' + target + '">';
        }
        if (parsedAttr && !parsedAttr.subtype) {
            parsedAttr.subtype = 'css';
        }
    }
    return ret;
};

var cdnInfo = {};

/**
 * handle assets: concat files and upload to cdn
 * @param {Object} opts - options
 * @param {Stream} steams
*/
var assets = function assets() {
    for (var _len = arguments.length, streams = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        streams[_key - 1] = arguments[_key];
    }

    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var restoreStream = _through22['default'].obj();
    var types = opts.types || ['css', 'js', 'cdn'];
    var validCdnConfig = opts.accessKey && opts.secretKey && opts.domain;
    var keyPrefix = opts.keyPrefix;

    opts = finalAssetsSetting = _lodash2['default'].assign({}, assetsSetting, opts);

    zlog = (function (silent) {
        return silent ? noop : _gulpUtil2['default'].log;
    })(opts.silent);

    if (!validCdnConfig) {
        zlog(_gulpUtil2['default'].colors.cyan(PLUGIN_NAME), _gulpUtil2['default'].colors.red('invalid qiniu cdn config.'));
    } else {
        (0, _qnJs.config)(opts.accessKey, opts.secretKey, opts.bucket, opts.domain);
    }
    var assetStream = _through22['default'].obj(function callee$1$0(file, enc, cb) {
        var parsedAttr, output, assets, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, type, files, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _loop, _iterator2, _step2, _ret;

        return regeneratorRuntime.async(function callee$1$0$(context$2$0) {
            var _this2 = this;

            while (1) switch (context$2$0.prev = context$2$0.next) {
                case 0:
                    parsedAttr = {};
                    output = (0, _nodeUseref2['default'])(file.contents.toString(), {
                        cdn: function cdn(content, target, attrs, alternateSearchPath) {
                            parsedAttr[target] = handleCdnAttr(attrs);
                            return handleCdnContent(content, parsedAttr[target].attrs, target, parsedAttr[target]);
                        }
                    });
                    assets = output[1];
                    _iteratorNormalCompletion = true;
                    _didIteratorError = false;
                    _iteratorError = undefined;
                    context$2$0.prev = 6;
                    _iterator = types[Symbol.iterator]();

                case 8:
                    if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                        context$2$0.next = 45;
                        break;
                    }

                    type = _step.value;
                    files = assets[type];

                    if (files) {
                        context$2$0.next = 13;
                        break;
                    }

                    return context$2$0.abrupt('continue', 42);

                case 13:
                    _iteratorNormalCompletion2 = true;
                    _didIteratorError2 = false;
                    _iteratorError2 = undefined;
                    context$2$0.prev = 16;

                    _loop = function callee$2$0() {
                        var name, filepaths, src, globs, searchPaths;
                        return regeneratorRuntime.async(function callee$2$0$(context$3$0) {
                            var _this = this;

                            while (1) switch (context$3$0.prev = context$3$0.next) {
                                case 0:
                                    name = _step2.value;
                                    filepaths = files[name].assets;
                                    src = undefined, globs = undefined, searchPaths = undefined;

                                    if (filepaths.length) {
                                        context$3$0.next = 5;
                                        break;
                                    }

                                    return context$3$0.abrupt('return', 'continue');

                                case 5:

                                    searchPaths = files[name].searchPaths || opts.searchPath;

                                    // If searchPaths is not an array, use brace-expansion to expand it into an array
                                    if (!Array.isArray(searchPaths)) {
                                        searchPaths = (0, _braceExpansion2['default'])(searchPaths);
                                    }

                                    // Get relative file paths and join with search paths to send to vinyl-fs
                                    globs = filepaths.filter(_isRelativeUrl2['default']).map(function (filepath) {
                                        if (opts.transformPath) {
                                            filepath = opts.transformPath(filepath);
                                        }
                                        if (searchPaths.length) {
                                            return searchPaths.map(function (searchPath) {
                                                return getSearchPaths(file.cwd, searchPath, filepath);
                                            });
                                        } else {
                                            return _path2['default'].join(file.base, filepath);
                                        }
                                    });
                                    // Flatten nested array before giving it to vinyl-fs
                                    src = _vinylFs2['default'].src(_lodash2['default'].flatten(globs, true), {
                                        base: file.base,
                                        nosort: true,
                                        nonull: true
                                    });

                                    // If any external streams were included, pipe all files to them first
                                    streams.forEach(function (stream) {
                                        src = src.pipe(stream(name));
                                    });
                                    // Add assets to the stream
                                    // If noconcat option is false, concat the files first.
                                    context$3$0.next = 12;
                                    return regeneratorRuntime.awrap(new Promise(function (resolve, reject) {
                                        src.pipe((0, _gulpIf2['default'])(!opts.noconcat, (0, _gulpConcat2['default'])(name))).pipe(_through22['default'].obj(function (newFile, enc, callback) {
                                            _this.push(newFile);
                                            // do cdn upload
                                            var info = cdnInfo[name] = {
                                                globs: globs,
                                                contents: newFile.contents,
                                                attrs: parsedAttr[name]
                                            };
                                            if (newFile.isBuffer() && validCdnConfig) {
                                                (0, _qnJs.upload)(info.contents, info.attrs.key || genFileKey(info.contents, keyPrefix, _gulpUtil2['default'].replaceExtension(_path2['default'].basename(name), ''), info.attrs.subtype), info.attrs.bucket).then(function (res) {
                                                    info.url = res.url;
                                                    info.uploaded = true;
                                                    zlog(_gulpUtil2['default'].colors.cyan(PLUGIN_NAME), 'upload successfully!', _gulpUtil2['default'].colors.cyan(name), '-->', _gulpUtil2['default'].colors.cyan(info.url));
                                                    callback();
                                                })['catch'](function (err) {
                                                    zlog(_gulpUtil2['default'].colors.cyan(PLUGIN_NAME), _gulpUtil2['default'].colors.red('upload error'), JSON.stringify(err));
                                                    _this.emit('error', new _gulpUtil2['default'].PluginError(PLUGIN_NAME, 'failed to upload to qiniu, maybe config info is invalid.'));
                                                    callback();
                                                });
                                            } else {
                                                callback();
                                            }
                                        })).on('finish', function () {
                                            resolve('cdn uploaded');
                                        });
                                    }));

                                case 12:
                                case 'end':
                                    return context$3$0.stop();
                            }
                        }, null, _this2);
                    };

                    _iterator2 = Object.keys(files)[Symbol.iterator]();

                case 19:
                    if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                        context$2$0.next = 28;
                        break;
                    }

                    context$2$0.next = 22;
                    return regeneratorRuntime.awrap(_loop());

                case 22:
                    _ret = context$2$0.sent;

                    if (!(_ret === 'continue')) {
                        context$2$0.next = 25;
                        break;
                    }

                    return context$2$0.abrupt('continue', 25);

                case 25:
                    _iteratorNormalCompletion2 = true;
                    context$2$0.next = 19;
                    break;

                case 28:
                    context$2$0.next = 34;
                    break;

                case 30:
                    context$2$0.prev = 30;
                    context$2$0.t0 = context$2$0['catch'](16);
                    _didIteratorError2 = true;
                    _iteratorError2 = context$2$0.t0;

                case 34:
                    context$2$0.prev = 34;
                    context$2$0.prev = 35;

                    if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                        _iterator2['return']();
                    }

                case 37:
                    context$2$0.prev = 37;

                    if (!_didIteratorError2) {
                        context$2$0.next = 40;
                        break;
                    }

                    throw _iteratorError2;

                case 40:
                    return context$2$0.finish(37);

                case 41:
                    return context$2$0.finish(34);

                case 42:
                    _iteratorNormalCompletion = true;
                    context$2$0.next = 8;
                    break;

                case 45:
                    context$2$0.next = 51;
                    break;

                case 47:
                    context$2$0.prev = 47;
                    context$2$0.t1 = context$2$0['catch'](6);
                    _didIteratorError = true;
                    _iteratorError = context$2$0.t1;

                case 51:
                    context$2$0.prev = 51;
                    context$2$0.prev = 52;

                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }

                case 54:
                    context$2$0.prev = 54;

                    if (!_didIteratorError) {
                        context$2$0.next = 57;
                        break;
                    }

                    throw _iteratorError;

                case 57:
                    return context$2$0.finish(54);

                case 58:
                    return context$2$0.finish(51);

                case 59:

                    restoreStream.write(file, cb);

                case 60:
                case 'end':
                    return context$2$0.stop();
            }
        }, null, this, [[6, 47, 51, 59], [16, 30, 34, 42], [35,, 37, 41], [52,, 54, 58]]);
    }, function () {
        this.emit('end');
    });

    assetStream.restore = function () {
        return restoreStream.pipe(_through22['default'].obj(), { end: false });
    };

    return assetStream;
};

/**
 * rewrite html page/tag
 * @param {Object} opts - options
*/
var cdn = function cdn() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    return _through22['default'].obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new _gulpUtil2['default'].PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return;
        }

        var output = (0, _nodeUseref2['default'])(file.contents.toString(), _lodash2['default'].assign(opts, {
            cdn: function cdn(content, target, attrs, alternateSearchPath) {
                var info = handleCdnAttr(attrs);
                var url = undefined;
                if (cdnInfo[target].uploaded) {
                    url = cdnInfo[target].url;
                    zlog(_gulpUtil2['default'].colors.cyan(PLUGIN_NAME), 'rewrite HTML TAG with CDN url.', _gulpUtil2['default'].colors.cyan(url));
                } else {
                    url = target;
                    zlog(_gulpUtil2['default'].colors.cyan(PLUGIN_NAME), 'rewrite HTML TAG with local url.', _gulpUtil2['default'].colors.cyan(url));
                }
                return handleCdnContent(content, info.attrs, url);
            }
        }));
        var html = output[0];

        try {
            file.contents = new Buffer(html);
            this.push(file);
        } catch (err) {
            this.emit('error', new _gulpUtil2['default'].PluginError(PLUGIN_NAME, err));
        }

        cb();
    });
};

cdn.assets = assets;

exports['default'] = cdn;
module.exports = exports['default'];