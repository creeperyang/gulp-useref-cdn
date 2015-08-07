'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _qiniu = require('qiniu');

var _qiniu2 = _interopRequireDefault(_qiniu);

var setting = {};
var reProtocol = /^https?:\/\//;
/**
 * generate uptoken
 * @param {String} bucket
*/
var genUptoken = function genUptoken() {
    var bucket = arguments.length <= 0 || arguments[0] === undefined ? setting.bucket : arguments[0];

    return bucket === setting.bucket ? setting.token : new _qiniu2['default'].rs.PutPolicy(bucket).token();
};

/**
 * delete file
 * @param {String|buffer} content - content to upload
 * @param {String} key - key of the file to name
 * @param {String} uptoken
*/
var upload = function upload(content, key) {
    var bucket = arguments.length <= 2 || arguments[2] === undefined ? setting.bucket : arguments[2];

    var extra = new _qiniu2['default'].io.PutExtra();
    var method = content instanceof Buffer ? 'put' : 'putFile';
    return new Promise(function (resolve, reject) {
        if (!bucket) {
            reject('Bucket miss.');
        } else if (method === 'putFile' && typeof content !== 'string') {
            reject('Content invalid.');
        } else {
            var token = genUptoken(bucket);
            _qiniu2['default'].io[method](token, key, content, extra, function (err, ret) {
                if (err) {
                    reject(err);
                } else {
                    // add access url
                    if (ret.key) {
                        ret.url = genAccessUrl(ret.key);
                    }
                    resolve(ret);
                }
            });
        }
    });
};

/**
 * generate access url via resource's key
 * @param {String} key - key of the file to name
 * @param {String} domain
*/
var genAccessUrl = function genAccessUrl(key) {
    var domain = arguments.length <= 1 || arguments[1] === undefined ? setting.domain : arguments[1];

    if (!domain) {
        return key;
    }
    if (!reProtocol.test(domain)) {
        domain = '//' + domain;
    }
    return domain + '/' + key;
};

/**
 * delete file
 * @param {String} key - key of the file to del
 * @param {String} bucket
*/
var del = function del(key) {
    var bucket = arguments.length <= 1 || arguments[1] === undefined ? setting.bucket : arguments[1];

    return new Promise(function (resolve, reject) {
        if (!key || typeof key !== 'string') {
            reject('key invalid.');
        } else if (!bucket) {
            reject('Bucket miss.');
        } else {
            var client = setting.client || (setting.client = new _qiniu2['default'].rs.Client());
            client.remove(bucket, key, function (err, ret) {
                if (err) {
                    reject(err);
                } else {
                    resolve(ret);
                }
            });
        }
    });
};

// generate EntryPath
var genEntryPath = function genEntryPath(key) {
    var bucket = arguments.length <= 1 || arguments[1] === undefined ? setting.bucket : arguments[1];
    return new _qiniu2['default'].rs.EntryPath(bucket, key);
};

// generate an array of EntryPath from keys or key-bucket lists
var genPaths = function genPaths(keys) {
    if (keys.length === 0) {
        throw new Error('At least one key.');
    }
    var paths = [];
    keys.forEach(function (key) {
        if (typeof key === 'string') {
            paths.push(genEntryPath(key));
            // key is object: {key: xxx, bucket: xxx}
        } else if (key.key) {
                paths.push(genEntryPath(key.key, key.bucket));
            }
    });
    return paths;
};

// batch operation
var batchOperate = function batchOperate(operation, bucket) {
    for (var _len = arguments.length, keys = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        keys[_key - 2] = arguments[_key];
    }

    return new Promise(function (resolve, reject) {
        if (!bucket) {
            reject('Bucket miss.');
        } else {
            var paths = genPaths(keys);
            var client = setting.client || (setting.client = new _qiniu2['default'].rs.Client());
            client[operation](paths, function (err, ret) {
                if (err) {
                    reject(err);
                } else {
                    resolve(ret);
                }
            });
        }
    });
};

/**
 * batch to get files info
 * @param {String} bucket - bucket name
 * @param keys - list of keys
*/
var batchStat = function batchStat() {
    for (var _len2 = arguments.length, keys = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        keys[_key2 - 1] = arguments[_key2];
    }

    var bucket = arguments.length <= 0 || arguments[0] === undefined ? setting.bucket : arguments[0];
    return batchOperate.apply(undefined, ['batchStat', bucket].concat(keys));
};

/**
 * batch to delete files
 * @param {String} bucket - bucket name
 * @param keys - list of keys
*/
var batchDelete = function batchDelete() {
    for (var _len3 = arguments.length, keys = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        keys[_key3 - 1] = arguments[_key3];
    }

    var bucket = arguments.length <= 0 || arguments[0] === undefined ? setting.bucket : arguments[0];
    return batchOperate.apply(undefined, ['batchDelete', bucket].concat(keys));
};

/**
 * config
 * @param {String} accessKey - access key
 * @param {String} secretKey - secret key
 * @param {String} bucket - bucket name
 * @param {String} domain - domain is used to generate access url
*/
var config = function config(accessKey, secretKey, bucket, domain) {
    _qiniu2['default'].conf.ACCESS_KEY = accessKey;
    _qiniu2['default'].conf.SECRET_KEY = secretKey;
    if (bucket) {
        setting.token = genUptoken(bucket);
        setting.bucket = bucket;
    }
    setting.domain = domain;
};

exports['default'] = { config: config, upload: upload, del: del, batchStat: batchStat, batchDelete: batchDelete };
module.exports = exports['default'];