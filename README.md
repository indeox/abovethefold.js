abovethefold.js
===============

An experimental phantomjs script based on Paul Kinlan's [blog post](http://paul.kinlan.me/detecting-critical-above-the-fold-css/) to detect elements visible above the fold and output the CSS styles required to display them.

*Note* The generated CSS file is not meant to be used as-is and is merely a guide at which styles **could** be inlined to optimise page speed render.

```
  phantomjs abovethefold.js <URL>
  phantomjs abovethefold.js http://www.live.bbc.co.uk/hindi
```

This will generate a CSS file with styles needed to render "Above the fold" content and a rendered screenshot of the page in a directory named *output*

### Other viewports

By default, the viewport renders at 1280x1024, and can be overridden with: 

```
    phantomjs abovethefold.js <URL> <WIDTH>x<HEIGHT>
    phantomjs abovethefold.js http://www.live.bbc.co.uk/hindi 320x480
```

### TODO
- Allow multiple URLs to aggregate different page types
- Extract mediaqueries in the output CSS
