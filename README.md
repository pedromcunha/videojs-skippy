# videojs-skippy

Skip past broken or invalid segments

## Table of Contents

<!-- START doctoc -->
<!-- END doctoc -->
## Installation

```sh
npm install --save videojs-skippy
```

The npm installation is preferred, but Bower works, too.

```sh
bower install  --save videojs-skippy
```

## Usage

The options you can pass in are limited to:

*maxErrors* The max amount of errors before the player stops trying to skip segments. (defaults to 10)
*onLiveError* A callback function in the case of an error on a live HLS stream. (defaults to noop)

To include videojs-skippy on your website or web application, use any of the following methods.


### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-skippy.min.js"></script>
<script>
  var player = videojs('my-video');

  player.skippy();
</script>
```

### Browserify

When using with Browserify, install videojs-skippy via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-skippy');

var player = videojs('my-video');

player.skippy();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-skippy'], function(videojs) {
  var player = videojs('my-video');

  player.skippy();
});
```

## License

MIT. Copyright (c) Pedro &lt;pedro@younow.com&gt;


[videojs]: http://videojs.com/
