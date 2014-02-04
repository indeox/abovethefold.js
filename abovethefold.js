var page   = require('webpage').create(),
    fs     = require('fs'),
    system = require('system');

if (system.args.length === 1) {
    console.log('Usage: phantomjs abovethefold.js <URL> <WIDTH>x<HEIGHT>');
    console.log('If no viewport size is given, it defaults to 1280x1024');
    phantom.exit(1);
} else {

    var viewportSize = (system.args[2] || '1280x1024').split('x'),
        width = viewportSize[0],
        height = viewportSize[1];

    page.address = system.args[1];
    page.viewportSize = { width: width, height: height };
    page.resources = [];

    page.settings.webSecurityEnabled = false; // THIS MAKES IT WORK!!

    var currentRequests = 0,
        screenshotName = false,
        lastRequestTimeout,
        finalTimeout,
        outputDir;

    if (system.args.indexOf('--disable-js') != -1) {
        page.settings.javascriptEnabled = false;
    }


    page.onLoadStarted = function () {
        page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
        currentRequests += 1;
        page.resources[req.id] = {
            request: req,
            startReply: null,
            endReply: null
        };
    };

    page.onResourceReceived = function (res) {
        if (res.stage === 'start') {
            page.resources[res.id].startReply = res;
        }
        if (res.stage === 'end') {
            page.resources[res.id].endReply = res;

            currentRequests -= 1;
            debouncedReport();
        }
    };

    page.onError = function(err) {
        // Page errors end up here
    }

    page.open(page.address, function (status) {
        var har;
        if (status !== 'success') {
            console.log('FAIL to load the address');
            phantom.exit(1);
        } else {
            page.endTime = new Date();
            page.loadTime = page.endTime.valueOf() - page.startTime.valueOf();
            page.title = page.evaluate(function () {
                return document.title;
            });
        }
    });

    function debouncedReport() {
        clearTimeout(lastRequestTimeout);
        clearTimeout(finalTimeout);

        lastRequestTimeout = setTimeout(function() {
            if (currentRequests < 1) {
                startReport();
            }
        }, 5000);

        finalTimeout = setTimeout(function() {
            startReport();
        }, 10000);
    }

    function startReport() {
        var rules = page.evaluate(function(width, height) {
            // Insert styles
            var rulesList = {},
                cssEl = document.createElement('style');

            cssEl.innerHTML = '.sm-viewport { position: absolute; top: '+height+'px; left: 0; width: '+width+'px; height: '+document.body.offsetHeight+'px; background: rgba(255,255,255,0.9); z-index: 10000; } '
                            + '.sm-critical { boz-sizing: border-box; background: rgba(255,0,0,0.2) !important; }';

            document.getElementsByTagName('head')[0].appendChild(cssEl);

            // Find elements visible within viewport
            var elements = document.body.getElementsByTagName('*');
            for (var i=0; i<elements.length; i++) {
                var el   = elements[i],
                    rect = el.getBoundingClientRect();

                if (rect.top <= window.innerHeight) {
                        var rules = window.getMatchedCSSRules(el) || [];
                        for(var r=0; r<rules.length; r++) {
                            var rule = rules[r];
                            rulesList[rule.parentStyleSheet.href] = rulesList[rule.parentStyleSheet.href] || {};
                            rulesList[rule.parentStyleSheet.href][rule.selectorText] = {
                                css: rule.cssText
                            };
                            //rulesList.push(rule);
                        }

                        el.className += ' sm-critical';
                };
            }

            // Highlight viewport
            var viewportEl = document.createElement('div');
            viewportEl.className = 'sm-viewport';
            document.body.appendChild(viewportEl);

            return rulesList;
        }, width, height);

        var pageSafeAddress = page.url.replace("http://","").replace(/\/$/,"").replace(/\//gi,"_");
        var outputDir = 'output/' + pageSafeAddress + "/";
        if (!fs.isDirectory(outputDir)) fs.makeDirectory(outputDir);

        outputFileName = pageSafeAddress + '.' + width + 'x' + height + '-' + page.startTime.toISOString() + '-' + 'abovethefold';

        generateCSS(rules,outputDir+outputFileName);

        page.render(outputDir+outputFileName+'.png');
        console.log("*******************\nFiles saved to:\n" + outputDir + outputFileName + ".{css,js}");
        phantom.exit();
    }

    function generateCSS(rulesList, outputPath) {
        var output = ['/* NOTE: This should only be used as guidance, not gospel */'];

        for (var cssHref in rulesList) {
            var cssRules = rulesList[cssHref];
            output.push('/* '+cssHref+' */');
            for (var rule in cssRules) {
                var cssText = cssRules[rule].css;
                output.push('    ' + cssText);
            }

            output.push('\n\n');
        }


        fs.write(outputPath + '.css', output.join('\n'), 'w');
    }
}
