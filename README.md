# [gulp](https://github.com/gulpjs/gulp)-useref-cdn 

[![Build Status](https://travis-ci.org/creeperyang/gulp-useref-cdn.svg)](https://travis-ci.org/creeperyang/gulp-useref-cdn)

> Parse build blocks in HTML files to replace references and automatically upload to **qiniu** cdn.

Inspired by the grunt plugin [grunt-useref](https://github.com/pajtai/grunt-useref) and [gulp-useref](https://github.com/jonkemp/gulp-useref). It can handle file concatenation but not minification. And it can upload the concatenated file to cdn automatically. Files are then passed down the stream. For minification of assets or other modifications, use [gulp-if](https://github.com/robrich/gulp-if) to conditionally handle specific types of assets.

**Note**: lot of code from [gulp-useref](https://github.com/jonkemp/gulp-useref). `gulp-useref` doesn't apply API to manage `js|css` file concatenation. This is why I don't make `gulp-useref` as lib dependency and borrow lot of code.

## Install

Install with [npm](https://npmjs.org/package/gulp-useref-cdn)

```
npm install --save-dev gulp-useref-cdn
```


## Usage

The following example will parse the build blocks in the HTML, replace them, upload to cdn, and pass those files through. Assets inside the build blocks will be concatenated and passed through in a stream as well.

```js
var gulp = require('gulp'),
    useref = require('gulp-useref-cdn');

gulp.task('default', function () {
    var assets = useref.assets();

    return gulp.src('app/*.html')
        .pipe(assets)
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});
```

More details: <https://github.com/jonkemp/gulp-useref>. All `gulp-useref`'s syntax and usage are supported by `gulp-useref-cdn`.

**What's important here is that an extended syntax/usage is added!**


```html
<!-- build:<type>(alternate search path) <path> <attrs> -->
```

**type** could be either `js`, `css` or `remove`. However, the new `cdn` is added now.

When you use `cdn` as the type, no need to write `js` or `css` anymore. The plugin will detect it automatically, and it will do the work as expected when you use `js|css`. Make sure `cdn` could not replace `remove`.

What's more, the plugin will upload the concatenated file to `qiniu` cdn.

An example of this in completed form can be seen below:

```html
<html>
<head>
    <!-- build:cdn css/combined.css -->
    <link href="css/one.css" rel="stylesheet">
    <link href="css/two.css" rel="stylesheet">
    <!-- endbuild -->
</head>
<body>
    <!-- build:cdn scripts/combined.js <bucket='xxx'> <key='yyy'>-->
    <script type="text/javascript" src="scripts/one.js"></script>
    <script type="text/javascript" src="scripts/two.js"></script>
    <!-- endbuild -->
</body>
</html>
```

```js
import cdn from 'gulp-useref-cdn';
let assets = cdn.assets({
    accessKey: 'ACCESS_KEY',
    secretKey: 'SECRET_KEY',
    domain: 'DOMAIN',
    bucket: 'BUCKET', // could be replaced if you rewrite at html <bucket='xxx'>
    keyPrefix: ''
});

gulp.src('test/fixtures/cdn.html')
    .pipe(assets)
    .on('error', (err) => {
        done(err);
    })
    .pipe(assets.restore())
    .pipe(cdn())
    .pipe(gulp.dest('dist'));
```


The resulting HTML would be:

```html
<html>
<head>
    <link rel="stylesheet" href="http://7xkuzg.com1.z0.glb.clouddn.com/combined-f9ebd308.css"/>
</head>
<body>
    <script src="http://7xkuzg.com1.z0.glb.clouddn.com/combined-ce2a0c47.js"></script>
</body>
</html>
```

And you will see `combined-ce2a0c47.js` and `combined-f9ebd308.css` in your qiniu cdn's bucket.

## API

### useref(options)

Returns a stream with the asset replaced resulting HTML files. Supports all options from [useref](https://github.com/digisfera/useref).

### useref.assets(options)

Returns a stream with the concatenated asset files from the build blocks inside the HTML.

#### options.searchPath

Type: `String` or `Array`  
Default: `none`  

Specify the location to search for asset files, relative to the current working directory. Can be a string or array of strings.

#### options.noconcat

Type: `Boolean`  
Default: `false`  

Skip concatenation and add all assets to the stream instead.

#### options.silent

Type: `Boolean`  
Default: `true`  

Set to `false` if you want to see messages except error.

#### options.md5

Type: `Number`  
Default: `8`  

#### options.keyPrefix

Type: `String`  
Default: `gulp-useref-cdn/`  

The above two are all about `key`. `Key` is defined by [Qiniu](http://developer.qiniu.com/docs/v6/api/overview/concepts.html#resource). Key can be set clearly via `<key='yyy'>` in comment.

When `key` is not offered, plugin will generate the `key`:

```
prefix + filename + '-' + md5 + '.' + filetype;
```

- prefix --- `options.keyPrefix`
- md5 --- the md5 string of the file, `options.md5` specify md5's length(after cut).
- filename, filetype are detected by plugin.

### stream.restore()

Brings back the previously filtered out HTML files.

## License

Copyright (c) 2015 creeperyang. Licensed under the MIT license.