var mixes = require('mixes');
var SimplexNoise = require('simplex-noise');
var lerp = require('lerp');
var sampling = require('sampling');
var clamp = require('clamp')

var PRNG = function () {
    this.seed = 1;
    this.random = function() { return (this.gen() / 2147483647); };
    this.gen = function() { return this.seed = (this.seed * 16807) % 2147483647; };
};

var rand = undefined;

//we can use a deterministic random generator if we want...
//rand = new PRNG();

var simplex = new SimplexNoise(rand);

//Samples a 1-component texture, noise in this case
function NoiseSampler(size) {
        if (!size)
            throw "no size specified to NoiseSampler";

        this.size = size;   
        this.scale = 1;
        this.offset = 0;
        this.smooth = true;
        this.seamless = false;

        // this.scales = [
        //     10, 0.1, 0.2, 1
        // ];
        // this.strengths = [
        //     0.1, 0.3, 0.2, 1
        // ];
        
        this.scales = [
            1, 20, 0.5
        ];
        this.strengths = [
            1, 0.1, 0.5
        ];

        this.data = new Float32Array(this.size * this.size);
}
 
mixes(NoiseSampler, {

    seamlessNoise: function(s, t, scale, cx, cy, cz, cw) {
        // Generate the 4d coordinates that wrap around seamlessly
        var r = scale / (2 * Math.PI);
        var axy = 2 * Math.PI * s / scale;        
        var x = r * Math.cos(axy);
        var y = r * Math.sin(axy);
        
        var azw = 2 * Math.PI * t / scale;        
        var z = r * Math.cos(azw);
        var w = r * Math.sin(azw);

        return simplex.noise4D(cx + x, cy + y, cz + z, cw + w);
    },

    generate: function() {
        var noiseMap = this.data,
            noiseSize = this.size,
            noiseOff = this.offset,
            seamless = this.seamless,
            zoom = this.scale;

        var scales = this.scales;
        if (!scales || scales.length === 0)
            scales = [ 1 ];

        //clear
        for (var i=0; i<noiseMap.length; i++) {
            noiseMap[i] = 0;
        }

        for (var j=0; j<scales.length; j++) {
            zoom = scales[j] * this.scale;

            var strength = this.strengths[j];
            strength = (strength===0||strength) ? strength : 1.0;

            for (var i=0; i<noiseMap.length; i++) {
                var x = i % noiseSize,
                    y = ~~( i / noiseSize );

                if (seamless)
                    noiseMap[i] += this.seamlessNoise(x/noiseSize*zoom + noiseOff, y/noiseSize*zoom + noiseOff, zoom, 0, 0, 0, 0) * strength;
                else
                    noiseMap[i] += simplex.noise3D(x/noiseSize * zoom, y/noiseSize * zoom, noiseOff) * strength;
            }
        }
    },

    //returns a float, -1 to 1
    sample: function(x, y) {
        //avoid negatives
        if (this.seamless) {
            x = (x%this.size + this.size)%this.size
            y = (y%this.size + this.size)%this.size
        } else {
            x = clamp(x, 0, this.size)
            y = clamp(y, 0, this.size)
        }

        if (this.smooth)
            return sampling.bilinear(this.data, this.size, this.size, x, y);
        else
            return sampling.nearest(this.data, this.size, this.size, x, y);
    },
});

module.exports = NoiseSampler;