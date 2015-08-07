import qiniu from 'qiniu';

const setting = {};
const reProtocol = /^https?:\/\//;
/**
 * generate uptoken
 * @param {String} bucket
*/
const genUptoken = (bucket = setting.bucket) => {
    return bucket === setting.bucket ? setting.token : 
            new qiniu.rs.PutPolicy(bucket).token();
};

/**
 * delete file
 * @param {String|buffer} content - content to upload
 * @param {String} key - key of the file to name
 * @param {String} uptoken
*/
const upload = (content, key, bucket = setting.bucket) => {
    let extra = new qiniu.io.PutExtra();
    let method = content instanceof Buffer ? 'put' : 'putFile';
    return new Promise((resolve, reject) => {
        if(!bucket) {
            reject('Bucket miss.');
        } else if(method === 'putFile' && typeof content !== 'string') {
            reject('Content invalid.');
        } else {
            let token = genUptoken(bucket);
            qiniu.io[method](token, key, content, extra, (err, ret) => {
                if(err) {
                    reject(err);
                } else {
                    // add access url
                    if(ret.key) {
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
const genAccessUrl = (key, domain = setting.domain) => {
    if(!domain) {
        return key;
    }
    if(!reProtocol.test(domain)) {
        domain = '//' + domain;
    }
    return domain + '/' + key;
};


/**
 * delete file
 * @param {String} key - key of the file to del
 * @param {String} bucket
*/
const del = (key, bucket = setting.bucket) => {
    return new Promise((resolve, reject) => {
        if(!key || typeof key !== 'string') {
            reject('key invalid.');
        } else if(!bucket) {
            reject('Bucket miss.');
        } else {
            let client = setting.client || (setting.client = new qiniu.rs.Client());
            client.remove(bucket, key, (err, ret) => {
                if(err) {
                    reject(err);
                } else {
                    resolve(ret);
                }
            });
        }
    });
};

// generate EntryPath
const genEntryPath = (key, bucket = setting.bucket) => new qiniu.rs.EntryPath(bucket, key);

// generate an array of EntryPath from keys or key-bucket lists
const genPaths = keys => {
    if(keys.length === 0) {
        throw new Error('At least one key.');
    }
    let paths = [];
    keys.forEach(key => {
        if(typeof key === 'string') {
            paths.push(genEntryPath(key));
        // key is object: {key: xxx, bucket: xxx}
        } else if(key.key) {
            paths.push(genEntryPath(key.key, key.bucket));
        }
    });
    return paths;
}

// batch operation
const batchOperate = (operation, bucket, ...keys) => {
    return new Promise((resolve, reject) => {
        if(!bucket) {
            reject('Bucket miss.');
        } else {
            let paths = genPaths(keys);
            let client = setting.client || (setting.client = new qiniu.rs.Client());
            client[operation](paths, function(err, ret) {
                if(err) {
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
const batchStat = (bucket = setting.bucket, ...keys) => batchOperate('batchStat', bucket, ...keys);

/**
 * batch to delete files
 * @param {String} bucket - bucket name
 * @param keys - list of keys
*/
const batchDelete = (bucket = setting.bucket, ...keys) => batchOperate('batchDelete', bucket, ...keys);

/**
 * config
 * @param {String} accessKey - access key
 * @param {String} secretKey - secret key
 * @param {String} bucket - bucket name
 * @param {String} domain - domain is used to generate access url
*/
const config = (accessKey, secretKey, bucket, domain) => {
    qiniu.conf.ACCESS_KEY = accessKey;
    qiniu.conf.SECRET_KEY = secretKey;
    if(bucket) {
        setting.token = genUptoken(bucket);
        setting.bucket = bucket;
    }
    setting.domain = domain;
};

export default {config, upload, del, batchStat, batchDelete};
