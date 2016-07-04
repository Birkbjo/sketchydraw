/**
 * Created by Birk on 04.07.2016.
 */

function HintWord(fromWord) {
    var self = this;
    this.orgWord = fromWord.trim();
    this.spaceInd = [];
    this.dashInd = [];
    this.apoInd = [];
    this.potentialHints = 0;
    this.availableHints = [];

    init();
    function init() {
        var word = self.orgWord;
        for (var i = 0; i < self.orgWord.length; i++) {
            if (word[i] === ' ') self.spaceInd.push(i);
            else if (word[i] === '-') self.dashInd.push(i);
            else if (word[i] === '\'') self.apoInd.push(i);
            else {
                var obj = {
                    'orgIndex': i,
                    'char': word[i]
                };
                self.availableHints.push(obj);
            }
        }
        self.potentialHints = self.availableHints.length;
    }
}

HintWord.prototype.getInitialHints = function() {
    return {
        'len': this.orgWord.length,
        'spInd': this.spaceInd,
        'dashInd': this.dashInd,
        'apoInd' : this.apoInd
    }
}

HintWord.prototype.getNextHint = function() {
    var randomInd = Math.floor(Math.random() * this.getLength());
    var hint = this.availableHints.splice(randomInd,1)[0];
    return {
        index: hint.orgIndex,
        char: hint.char
    };
}

HintWord.prototype.getOriginalLength = function() {
    return this.orgWord.length;
}

HintWord.prototype.getLength = function() {
    return this.availableHints.length;
}

HintWord.prototype.getNrPotentialHints = function() {
    console.log(this.potentialHints);
    return this.potentialHints;
}

module.exports = HintWord;
