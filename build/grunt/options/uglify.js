module.exports = function() {

    var debugFuncs = [],
        logLevels = ["error", "warn", "info", "debug", "log"];


    for (var i = 0; i < logLevels.length; i++) {
        debugFuncs.push("self.debug." + logLevels[i]);
        debugFuncs.push("this.debug." + logLevels[i]);
        debugFuncs.push("rslt.debug." + logLevels[i]);
    }

    return {
        generated: {
            options: {
                beautify: true,
                compress: false,
                mangle: false,
                banner: '//COPYRIGHT/* Last build : @@TIMESTAMP / git revision : @@REVISION */\n'
            }
        },

        generated_edu: {
            options: {
                beautify: true,
                compress: false,
                mangle: false,
                banner: '//COPYRIGHT/* Last build : @@TIMESTAMP / git revision : @@REVISION */\n'
            },
            files: {
                "../distedu/dash-has-debug.js": [
                "../app/lib/xml2json.js",
                "../app/lib/objectiron.js",
                "../app/lib/dijon.js",
                "../app/lib/Math.js",
                "../app/lib/long.js",
                "../app/lib/base64.js",
                "../app/lib/log4javascript.js",
                "../app/lib/q.js",
                "../app/lib/objectiron.js",
                "../app/js/streaming/MediaPlayer.js",
                "../app/js/streaming/Context.js",
                "../app/js/dash/Dash.js",
                "../app/js/dash/DashContext.js",
                "../app/js/dash/**/*.js",
                "../app/js/streaming/**/*.js",
                "../app/js/custom/**/*.js",
                "../app/js/hls/**/*.js",
                 "../app/js/mss/**/*.js",
                ]
            }
        },

        min: {
            options: {
                compress:{
                    pure_funcs: debugFuncs,
                    drop_console : true,
                    drop_debugger: true,
                    warnings: false
                },
                preserveComments: 'all'
            },
            files: {
                '<%= path %>/hasplayer.min.js': ['<%= path %>/hasplayer.js']
            }
        },

        json: {
            options: {
                beautify : false,
                mangle: false
            },
            files: {
                '<%= path %>/json.js': ['<%= path %>/json.js']
            }
        }
    };

};