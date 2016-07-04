function CountDownTimer(duration, granularity) {
    this.duration = duration;
    this.granularity = granularity || 1000;
    this.tickFtns = [];
    this.running = false;
}

CountDownTimer.prototype.start = function() {
    if (this.running) {
        return;
    }
    this.running = true;
    var start = Date.now(),
        self = this,
        diff, obj;

    (function timer() {
        diff = self.duration - (((Date.now() - start) / 1000) | 0);

        if (diff > 0) {
            setTimeout(timer, self.granularity);
        } else {
            diff = 0;
            self.running = false;
        }

        obj = CountDownTimer.parse(diff);
        self.tickFtns.forEach(function(ftn) {
            ftn.call(this, obj.seconds);
        }, self);
    }());
};

CountDownTimer.prototype.onTick = function(ftn) {
    if (typeof ftn === 'function') {
        this.tickFtns.push(ftn);
    }
    return this;
};

CountDownTimer.prototype.expired = function() {
    return !this.running;
};

CountDownTimer.parse = function(seconds) {
    return {
        'seconds': seconds
    };
};