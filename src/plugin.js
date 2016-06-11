import videojs from 'video.js';

// Default options for the plugin.
const defaults = {};

let recordedTime = 0;
let lastBrokeAt = false; //the last point of where the player broke, cleared at point of success
let clearLastBrokeAt = false; //timeout that clears out the lastBrokeAt variable when playback continues without interruption
let playlist; //playlist meta data for all segements within the HLS video
let brokenSentinel = 0; //maxes the amount of breaks we allow for a video (if it's too high we dont want to go into an infite loop)
let destroyEventHandler; //ensures that we don't register the destroy event twice
let stuckStuck = 0; // check if the player gets stuck
let lastCurrentTime = 0; // last time when the player got stuck
let breakages = {};
let currentSource = "";

const checkForBreakage = (player) => {
  //needs url
	var breakHistory = breakages[currentSource];
	let checkThisTime = Math.floor(recordedTime);
	//if there's breakage at this time go ahead of it to the designated time
	if (breakHistory && breakHistory[checkThisTime]) {
		player.currentTime(breakHistory[checkThisTime]);
	}
	//clear out any remaining breakage queues
	if (player.currentTime() > lastBrokeAt && !clearLastBrokeAt) {
		clearLastBrokeAt = setTimeout(() => {
			lastBrokeAt = false;
		}, 500);
	}
}

//in case the player goes crazy, we can reload it manually in a last ditch effort to play the video
const reload = (src, player) => {
	player.reset();
	player.src({src: src, type: 'application/x-mpegURL'});
}

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 * @param    {Object} [options={}]
 */
const onPlayerReady = (player, options) => {
  player.addClass('vjs-skippy');
	currentSource = player.el_.children[0].children[0].src;
  player.on('timeupdate', (e) => {
    if(player) {
    	if (!lastBrokeAt && player.currentTime) {
    		recordedTime = player.currentTime();
    	}
    	if (player.paused() && player.currentTime() === lastCurrentTime) {
    		stuckStuck++;
    		if (stuckStuck >= 5) {
    			var skipTo = ((Math.floor(player.currentTime() / 2) + 1) * 2) + 0.1; // skip to next segment + 100ms buffer
    			player.currentTime(skipTo);
    			stuckStuck = 0;
    		}
    	} else {
    		stuckStuck = 0;
    	}
    	lastCurrentTime = player.currentTime();
    	checkForBreakage(player);
    }
  });

  player.on('error', () => {
    brokenSentinel++;
  	if (player && player.currentType_ === 'application/x-mpegURL' && brokenSentinel <= 10) {
  		let url = currentSource;
  		let brokeStart;
  		clearTimeout(clearLastBrokeAt);
  		clearLastBrokeAt = false;
  		let hls = player.tech_.hls;
  		if (hls) {
  			playlist = hls.playlists.media();
  		}
  		if (playlist.segments) {
  			if (lastBrokeAt === false) {
  				lastBrokeAt = recordedTime;
  			}
  			if (lastBrokeAt !== false) {
  				brokeStart = Math.floor(lastBrokeAt);
  			} else {
  				brokeStart = Math.floor(recordedTime);
  			}
  			if (!breakages[url]) {
  				breakages[url] = {};
  			}
  			var segmentToSkip = Math.ceil(recordedTime);
  			if (segmentToSkip % 2 !== 0) {
  				segmentToSkip += 1;
  			}
  			breakages[url][brokeStart] = playlist.segments[(segmentToSkip / playlist.targetDuration) > 0 ? (segmentToSkip / playlist.targetDuration) - 1 : (segmentToSkip / playlist.targetDuration) ].duration + segmentToSkip + 0.1;
  			reload(url, player);
  		}
			else {
  			console.warn('No segments');
  		}
		}
  });

};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function skippy
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const skippy = function(options) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions(defaults, options));
  });
};

// Register the plugin with video.js.
videojs.plugin('skippy', skippy);

// Include the version number.
skippy.VERSION = '__VERSION__';

export default skippy;
