import videojs from 'video.js';

// Default options for the plugin.
const defaults = {};

let recordedTime = 0;
let lastBrokeAt = false; //the last point of where the player broke, cleared at point of success
let clearLastBrokeAt = false; //timeout that clears out the lastBrokeAt variable when playback continues without interruption
let playlist; //playlist meta data for all segements within the HLS video
let destroyEventHandler; //ensures that we don't register the destroy event twice
let stuckStuck = 0; // check if the player gets stuck
let lastCurrentTime = 0; // last time when the player got stuck
let errorStrike = false;
let breakages = {};
let currentSource = ""; //Keeping track of the source
let errorSentinel = 0; //prevents us from infinite looping, can be customizable
let maxErrors = 10; //optional value passed in by user for max amount of errors sentinel has to watch out for
let onLiveError = false; //optional handler passed in by user to handle live broadcast errors
let retryCount = 0; //this is so that the retry handler has time to cooldown
let debug = false;

const handleLiveHlsFailure = (player) => {
	if(retryCount>=4) {	// 5 errors within 10 seconds
		logger('max retry count!');
	}
	// If time has progressed since last failure, retry
	else if(lastBrokeAt!=lastCurrentTime) {
		retry( (retryCount || 1)*1000, player);
		errorStrike=1;
		logger('time has progressed since last failure, retry in ' + ((retryCount || 1) * 1000) + 'seconds');
	}
	// If time hasn't progressed, retry once, but also delay for 3 seconds to increase likelihood of success
	else if(errorStrike<2) {
		logger('no progress recover');
		retry(3000, player);
		errorStrike=2;
	}
	// 3 errors without progressing
	else {
		logger('three errors without progressing');
	}
};

const handleHlsFailure = (player, url) => {
	let brokeStart;
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
}

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

const retry = (delay, player) => {
	retryCount++;
	// console.log(errorCount+": "+window.location.search.substring(1)+' videotime:'+lastCurrentTime+" pagetime:"+((new Date().getTime()-startTime)/1000));
	setTimeout(() => {
		if(onLiveError) {
			onLiveError();
		} else {
			reload(currentSource, player);
		}
		// After 10 seconds, error count is brought back down
		window.setTimeout(function(){
			retryCount--;
		}, 10000);
	}, delay>0 ? delay : 0);
}

const logger = (string) => {
	if(debug) {
		console.log(string);
	}
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
					logger("Stuckstuck enabled: " stuckStuck);
					if(player.duration() === Infinity) {
						retry(0, player);
					} else {
						let skipTo = ((Math.floor(player.currentTime() / 2) + 1) * 2) + 0.1; // skip to next segment + 100ms buffer
						player.currentTime(skipTo);
						stuckStuck = 0;
					}
    		}
    	} else {
    		stuckStuck = 0;
    	}
    	lastCurrentTime = player.currentTime();
    	checkForBreakage(player);
    }
  });

  player.on('error', () => {
    errorSentinel++;
  	if (player && player.currentType_ === 'application/x-mpegURL' && errorSentinel <= maxErrors) {
  		let url = currentSource;
  		clearTimeout(clearLastBrokeAt);
  		clearLastBrokeAt = false;
			if(player.duration() === Infinity) {
					handleLiveHlsFailure(player)
			} else {
	  			handleHlsFailure(player, url)
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
 * @param    {Number} [maxErrors]
 * @param    {Function} [onLiveError]
 * @param    {String} [debug]
 *
 *          maxErrors defines the amount of times the player is allowed to fail, optionally set to 10
 *					onLiveError defined an optional error handler for live streams
 *					debug when debugging it's useful to turn this to true, default is false.
 */
const skippy = function(options) {
  this.ready(() => {
		if(!options) {
			options = {};
		}
		if(options.maxErrors) {
			maxErrors = options.maxErrors;
		}
		if(options.onLiveError) {
			onLiveError = options.onLiveError;
		}
    onPlayerReady(this, videojs.mergeOptions(defaults, options));
  });
};

// Register the plugin with video.js.
videojs.plugin('skippy', skippy);

// Include the version number.
skippy.VERSION = '__VERSION__';

export default skippy;
