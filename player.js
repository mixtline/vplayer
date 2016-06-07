Object.prototype.toTime = function ()
{
    var self = +this;
    var m = ''+Math.floor(self/60);
    while (m.length < 2) m = '0' + m;
    var h = ''+Math.floor(self/60/60);
    while (h.length < 1) h = '0' + h;
    var s = '' + ~~(self - h*3600 - m*60);
    while (s.length < 2) s = '0' + s;
    return h + ':' + m + ':' + s;
};
Object.prototype.extend = function (obj)
{
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            this[i] = obj[i];
        }
    }
};

var Player = function (id, movie, options)
{
    if (this.players[id]) return this.players[id];

    this.movie = movie;

    options = options || {};
    this.options.extend(options);

    this.container = null;
    this.video = null;
    this.controlPanel = null;
    this.buttonsPanel = null;
    this.controls = {
        play: null,
        pause: null,
        replay: null,
        timer: null,
        slider: null,
        volume: null,
        fs: null
    };
    this.buttons = {
        play: null,
        pause: null,
        replay: null
    };

    this.sliderHandler = null;
    this.volumeHandler = null;
    this.clickHandler = null;

    this.init();
    var container = document.getElementById(id);
    if (container) {
        container.appendChild(this.container);
    } else {
        throw 'No element found';
    }

    this.players[id] = this;

    return this;
};

Player.prototype = {
    players: {},

    options: {
        theme: 'default',
        width: 640,
        height: 480,
        durationTimer: true // show timer from 00:00 (false - show rest time)
    },

    init: function() {
        this.initCss();
        this.initContainer();
        this.initVideo();
        this.initControls();
    },

    initCss: function()
    {
        var cssId = 'css__player__' + this.options.theme;
        if (!document.getElementById(cssId)) {
            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'themes/'+this.options.theme+'/'+this.options.theme+'.css';
            link.media = 'all';
            head.appendChild(link);
        }
        cssId = 'css__player__awesome';
        if (!document.getElementById(cssId)) {
            head = document.getElementsByTagName('head')[0];
            link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'css/font-awesome.min.css';
            link.media = 'all';
            head.appendChild(link);
        }
    },

    initContainer: function()
    {
        this.container = document.createElement('div');
        this.container.className = 'player__'+this.options.theme+'__video';
    },

    initVideo: function()
    {
        this.video = document.createElement('video');
        this.video.width = this.options.width;
        this.video.height = this.options.height;
        this.video.controls = false;
        this.video.autoplay = false;
        this.container.appendChild(this.video);

        var movie = document.createElement('source');
        movie.src = this.movie;
        this.video.appendChild(movie);
        this.video.addEventListener('play', this.showStatus.bind(this, 'play'), false);
        this.video.addEventListener('pause', this.showStatus.bind(this, 'pause'), false);
        this.video.addEventListener('ended', this.showStatus.bind(this, 'end'), false);
        this.video.addEventListener('timeupdate', this.setTimer.bind(this), false);
        this.video.addEventListener('loadeddata', this.showStatus.bind(this, 'start'), false);
        this.video.load();


        var warn = document.createElement('p');
        warn.innerHTML = 'To view this video please enable JavaScript, and consider upgrading to a web browser that supports HTML5 video';
        this.video.appendChild(warn);
    },

    initControls: function()
    {
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'player__'+this.options.theme+'__player';
        this.container.appendChild(this.controlPanel);

        // play
        this.controls.play = document.createElement('div');
        this.controls.play.className = 'player__'+this.options.theme+'__player-play';
        this.controls.play.addEventListener('click', this.play.bind(this), false);
        this.controlPanel.appendChild(this.controls.play);
        var icon_play = document.createElement('i');
        icon_play.className = 'fa fa-play';
        this.controls.play.appendChild(icon_play);

        // pause
        this.controls.pause = document.createElement('div');
        this.controls.pause.className = 'player__'+this.options.theme+'__player-pause';
        this.controls.pause.style.display = 'none';
        this.controls.pause.addEventListener('click', this.pause.bind(this), false);
        this.controlPanel.appendChild(this.controls.pause);
        var icon_pause = document.createElement('i');
        icon_pause.className = 'fa fa-pause';
        this.controls.pause.appendChild(icon_pause);
        this.clickHandler = this.pause.bind(this);

        // replay
        this.controls.replay = document.createElement('div');
        this.controls.replay.className = 'player__'+this.options.theme+'__player-replay';
        this.controls.replay.style.display = 'none';
        this.controls.replay.addEventListener('click', this.play.bind(this), false);
        this.controlPanel.appendChild(this.controls.replay);
        var icon_replay = document.createElement('i');
        icon_replay.className = 'fa fa-refresh';
        this.controls.replay.appendChild(icon_replay);

        // timer
        this.controls.timer = document.createElement('div');
        this.controls.timer.className = 'player__'+this.options.theme+'__player-timer';
        this.controlPanel.appendChild(this.controls.timer);
        this.controls.timer.addEventListener('click', this.changeTimerStatus.bind(this), false);

        // slider
        var slider_container = document.createElement('div');
        slider_container.className = 'player__'+this.options.theme+'__player-slider';
        this.controlPanel.appendChild(slider_container);

        this.controls.slider = document.createElement('div');
        this.controls.slider.className = 'player__'+this.options.theme+'__player-progressbar';
        slider_container.appendChild(this.controls.slider);
        var progress = document.createElement('div');
        progress.className = 'player__'+this.options.theme+'__player-progress';
        this.controls.slider.appendChild(progress);
        this.controls.slider.addEventListener('mouseup', this.slideEnd.bind(this), false);
        this.controls.slider.addEventListener('mousedown', this.slideStart.bind(this), false);
        this.controls.slider.addEventListener('mousemove', this.slideMove.bind(this), false);

        // volume
        this.controls.volume = document.createElement('div');
        this.controls.volume.className = 'player__'+this.options.theme+'__player-volume';
        this.controlPanel.appendChild(this.controls.volume);
        var icon_volume = document.createElement('i');
        icon_volume.className = 'fa fa-volume-up fa-fw';
        this.controls.volume.appendChild(icon_volume);
        icon_volume.addEventListener('click', this.mute.bind(this), false);
        var volume = document.createElement('div');
        volume.className = 'player__'+this.options.theme+'__player-progressbar';
        this.controls.volume.appendChild(volume);
        var volumeLevel = document.createElement('div');
        volumeLevel.className = 'player__'+this.options.theme+'__player-progress';
        volume.appendChild(volumeLevel);
        volume.addEventListener('mouseup', this.volumeEnd.bind(this), false);
        volume.addEventListener('mousedown', this.volumeStart.bind(this), false);
        volume.addEventListener('mousemove', this.volumeMove.bind(this), false);

        // social
        var social_container = document.createElement('div');
        social_container.className = 'player__'+this.options.theme+'__player-social';
        this.controlPanel.appendChild(social_container);
        var twitter = document.createElement('i');
        twitter.className = 'fa fa-twitter';
        social_container.appendChild(twitter);
        twitter.addEventListener('click', function(){alert ('Nothing to do');});

        // full screen
        this.controls.fs = document.createElement('div');
        this.controls.fs.className = 'player__'+this.options.theme+'__player-fs';
        this.controls.fs.addEventListener('click', this.fs.bind(this), false);
        this.controlPanel.appendChild(this.controls.fs);
        var icon_fs = document.createElement('i');
        icon_fs.className = 'fa fa-expand';
        this.controls.fs.appendChild(icon_fs);

        // big icons
        this.buttonsPanel = document.createElement('div');
        this.buttonsPanel.className = 'player__'+this.options.theme+'__video-buttons';
        this.container.appendChild(this.buttonsPanel);

        this.buttons.play = document.createElement('div');
        this.buttons.play.className = 'player__'+this.options.theme+'__video-buttons-play';
        this.buttons.play.style.display = 'none';
        this.buttonsPanel.appendChild(this.buttons.play);
        var play_icon = document.createElement('i');
        play_icon.className = 'fa fa-play fa-4x';
        this.buttons.play.appendChild(play_icon);
        this.buttons.play.addEventListener('click', this.play.bind(this), false);

        this.buttons.pause = document.createElement('div');
        this.buttons.pause.className = 'player__'+this.options.theme+'__video-buttons-pause';
        this.buttons.pause.style.display = 'none';
        this.buttonsPanel.appendChild(this.buttons.pause);
        var pause_icon = document.createElement('i');
        pause_icon.className = 'fa fa-pause fa-4x';
        this.buttons.pause.appendChild(pause_icon);
        this.buttons.pause.addEventListener('click', this.pause.bind(this), false);

        this.buttons.replay = document.createElement('div');
        this.buttons.replay.className = 'player__'+this.options.theme+'__video-buttons-replay';
        this.buttons.replay.style.display = 'none';
        this.buttonsPanel.appendChild(this.buttons.replay);
        var replay_icon = document.createElement('i');
        replay_icon.className = 'fa fa-refresh fa-4x';
        this.buttons.replay.appendChild(replay_icon);
        this.buttons.replay.addEventListener('click', this.play.bind(this), false);
    },

    initMovie: function()
    {
        this.setTimer();
        this.setVolume();
    },

    showStatus: function(status)
    {
        this.buttons.play.style.display = 'none';
        this.buttons.pause.style.display = 'none';
        this.buttons.replay.style.display = 'none';
        this.controls.play.style.display = 'none';
        this.controls.pause.style.display = 'none';
        this.controls.replay.style.display = 'none';
        this.buttonsPanel.removeEventListener('click', this.clickHandler, false);
        if (status == 'pause') {
            this.buttons.play.style.display = 'block';
            this.controls.play.style.display = 'block';
        } else
        if (status == 'play' && !this.video.paused) {
            this.controls.pause.style.display = 'block';
            this.buttonsPanel.addEventListener('click', this.clickHandler, false);
        } else
        if (status == 'start') {
            this.initMovie();
            this.controls.play.style.display = 'block';
            this.buttons.play.style.display = 'block';
        } else
        if (status == 'end') {
            this.controls.replay.style.display = 'block';
            this.buttons.replay.style.display = 'block';
        }
    },

    play: function()
    {
        this.video.play();
    },
    pause: function()
    {
        this.video.pause();
    },

    changeTimerStatus: function()
    {
        this.options.durationTimer = !this.options.durationTimer;
        this.setTimer();
    },

    setTimer: function()
    {
        if (this.options.durationTimer) {
            this.controls.timer.innerHTML = this.video.currentTime.toTime();
        } else {
            this.controls.timer.innerHTML = (this.video.duration-this.video.currentTime).toTime();
        }
        var dx = 100*this.video.currentTime/this.video.duration;
        this.controls.slider.querySelector('div').style.width = ''+dx+'%';
    },

    slide: function(e)
    {
        var dx = 100 * e.offsetX / this.controls.slider.offsetWidth;
        this.video.currentTime = this.video.duration * dx / 100;
    },
    slideStart: function(e)
    {
        this.sliderHandler = true;
        this.slide(e);
    },
    slideEnd: function(e)
    {
        this.sliderHandler = null;
        this.slide(e);
    },
    slideMove: function(e)
    {
        if (!this.sliderHandler) return;
        this.slide(e);
    },

    mute: function()
    {
        this.video.muted = !this.video.muted;
        var icon = this.controls.volume.querySelector('i');
        if (this.video.muted) {
            icon.className = 'fa fa-volume-off fa-fw';
        } else {
            icon.className = 'fa fa-volume-up fa-fw';
        }
    },
    setVolume: function()
    {
        var volume = this.controls.volume.querySelector('div');
        var dx = 100*this.video.volume;
        volume.querySelector('div').style.width = ''+dx+'%';
    },
    volume: function(e)
    {
        var volume = this.controls.volume.querySelector('div');
        var dx = 100 * e.offsetX /volume.offsetWidth;
        this.video.volume = dx / 100;
        this.setVolume();
    },
    volumeStart: function(e)
    {
        this.volumeHandler = true;
        this.volume(e);
    },
    volumeEnd: function(e)
    {
        this.volumeHandler = null;
        this.volume(e);
    },
    volumeMove: function(e)
    {
        if (!this.volumeHandler) return;
        this.volume(e);
    },

    fs: function()
    {
        if (this.video.requestFullscreen) {
            this.video.requestFullscreen();
        } else if (this.video.msRequestFullscreen) {
            this.video.msRequestFullscreen();
        } else if (this.video.mozRequestFullScreen) {
            this.video.mozRequestFullScreen();
        } else if (this.video.webkitRequestFullscreen) {
            this.video.webkitRequestFullscreen();
        }
    }
};


