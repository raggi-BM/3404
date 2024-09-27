/*!
 * wordcloud2.js
 * http://timdream.org/wordcloud2.js/
 *
 * Copyright 2011 - 2019 Tim Guan-tin Chien and contributors.
 * Released under the MIT license
 */

'use strict'
var wordData = []; // Array to hold word data
var proStatus = new Proxy({ _done: false }, {
  set(target, prop, value) {
    if (typeof target !== 'object') {
      throw new Error(`Attempted to modify a non-object: ${target}`);
    }
    target[prop] = value;
    return true;
  }
});

// ////console.log(proStatus); // Should print: Proxy { _done: false }



// Add a function to handle post-processing
var processingDone = function () {
  // ////console.log("All words have been processed. Word data:", wordData);
  // Additional logic can be added here
};
// setImmediate
if (!window.setImmediate) {
  window.setImmediate = (function setupSetImmediate() {
    return window.msSetImmediate ||
      window.webkitSetImmediate ||
      window.mozSetImmediate ||
      window.oSetImmediate ||
      (function setupSetZeroTimeout() {
        if (!window.postMessage || !window.addEventListener) {
          return null
        }

        var callbacks = [undefined]
        var message = 'zero-timeout-message'

        // Like setTimeout, but only takes a function argument.  There's
        // no time argument (always zero) and no arguments (you have to
        // use a closure).
        var setZeroTimeout = function setZeroTimeout(callback) {
          var id = callbacks.length
          callbacks.push(callback)
          window.postMessage(message + id.toString(36), '*')

          return id
        }

        window.addEventListener('message', function setZeroTimeoutMessage(evt) {
          // Skipping checking event source, retarded IE confused this window
          // object with another in the presence of iframe
          if (typeof evt.data !== 'string' ||
            evt.data.substr(0, message.length) !== message/* ||
            evt.source !== window */) {
            return
          }

          evt.stopImmediatePropagation()

          var id = parseInt(evt.data.substr(message.length), 36)
          if (!callbacks[id]) {
            return
          }

          callbacks[id]()
          callbacks[id] = undefined
        }, true)

        /* specify clearImmediate() here since we need the scope */
        window.clearImmediate = function clearZeroTimeout(id) {
          if (!callbacks[id]) {
            return
          }

          callbacks[id] = undefined
        }

        return setZeroTimeout
      })() ||
      // fallback
      function setImmediateFallback(fn) {
        window.setTimeout(fn, 0)
      }
  })()
}

if (!window.clearImmediate) {
  window.clearImmediate = (function setupClearImmediate() {
    return window.msClearImmediate ||
      window.webkitClearImmediate ||
      window.mozClearImmediate ||
      window.oClearImmediate ||
      // "clearZeroTimeout" is implement on the previous block ||
      // fallback
      function clearImmediateFallback(timer) {
        window.clearTimeout(timer)
      }
  })()
}

(function (global) {
  // Check if WordCloud can run on this browser
  var isSupported = (function isSupported() {
    var canvas = document.createElement('canvas')
    if (!canvas || !canvas.getContext) {
      return false
    }

    var ctx = canvas.getContext('2d')
    if (!ctx) {
      return false
    }
    if (!ctx.getImageData) {
      return false
    }
    if (!ctx.fillText) {
      return false
    }

    if (!Array.prototype.some) {
      return false
    }
    if (!Array.prototype.push) {
      return false
    }

    return true
  }())

  // Find out if the browser impose minium font size by
  // drawing small texts on a canvas and measure it's width.
  var minFontSize = (function getMinFontSize() {
    if (!isSupported) {
      return
    }

    var ctx = document.createElement('canvas').getContext('2d')

    // start from 20
    var size = 20

    // two sizes to measure
    var hanWidth, mWidth

    while (size) {
      ctx.font = size.toString(10) + 'px sans-serif'
      if ((ctx.measureText('\uFF37').width === hanWidth) &&
        (ctx.measureText('m').width) === mWidth) {
        return (size + 1)
      }

      hanWidth = ctx.measureText('\uFF37').width
      mWidth = ctx.measureText('m').width

      size--
    }

    return 0
  })()

  var getItemExtraData = function (item) {
    if (Array.isArray(item)) {
      var itemCopy = item.slice()
      // remove data we already have (word and weight)
      itemCopy.splice(0, 2)
      return itemCopy
    } else {
      return []
    }
  }

  // Based on http://jsfromhell.com/array/shuffle
  var shuffleArray = function shuffleArray(arr) {
    for (var j, x, i = arr.length; i;) {
      j = Math.floor(Math.random() * i)
      x = arr[--i]
      arr[i] = arr[j]
      arr[j] = x
    }
    return arr
  }

  var timer = {};

  var WordCloud = function WordCloud(elements, options) {
    if (!isSupported) {
      return
    }

    var timerId = Math.floor(Math.random() * Date.now())

    if (!Array.isArray(elements)) {
      elements = [elements]
    }

    elements.forEach(function (el, i) {
      if (typeof el === 'string') {
        elements[i] = document.getElementById(el)
        if (!elements[i]) {
          throw new Error('The element id specified is not found.')
        }
      } else if (!el.tagName && !el.appendChild) {
        throw new Error('You must pass valid HTML elements, or ID of the element.')
      }
    })

    /* Default values to be overwritten by options object */
    var settings = {
      margin: 0,
      drawCenter: true,
      list: [],
      fontFamily: '"Trebuchet MS", "Heiti TC", "微軟正黑體", ' +
        '"Arial Unicode MS", "Droid Fallback Sans", sans-serif',
      fontWeight: 'normal',
      color: 'random-dark',
      minSize: 0, // 0 to disable
      weightFactor: 1,
      clearCanvas: true,
      backgroundColor: '#fff', // opaque white = rgba(255, 255, 255, 1)

      gridSize: 8,
      drawOutOfBound: false,
      shrinkToFit: false,
      origin: null,
      border: 0, // New setting for marking edges as occupied


      drawMask: false,
      maskColor: 'rgba(255,0,0,0.3)',
      maskGapWidth: 0.3,

      wait: 0,
      abortThreshold: 0, // disabled
      abort: function noop() { },

      minRotation: -Math.PI / 2,
      maxRotation: Math.PI / 2,
      rotationSteps: 0,

      boxPadding: 0, // Add this new setting, default to 0 if not provided
      drawGridLines: false,
      moveCenter: false,

      shuffle: true,
      rotateRatio: 0.1,

      shape: 'circle',
      // shape: 'cardioid',
      // ellipticity: 0.65,
      ellipticity: 0.65,

      classes: null,

      hover: null,
      click: null
    }

    if (options) {
      for (var key in options) {
        if (key in settings) {
          settings[key] = options[key]
        }
      }
    }

    /* Convert weightFactor into a function */
    if (typeof settings.weightFactor !== 'function') {
      var factor = settings.weightFactor
      settings.weightFactor = function weightFactor(pt) {
        return pt * factor // in px
      }
    }

    /* Convert shape into a function */
    if (typeof settings.shape !== 'function') {
      switch (settings.shape) {
        case 'circle':
        /* falls through */
        default:
          // 'circle' is the default and a shortcut in the code loop.
          settings.shape = 'circle'
          break

        case 'cardioid':
          settings.shape = function shapeCardioid(theta) {
            return 1 - Math.sin(theta)
          }
          break

        /*
        To work out an X-gon, one has to calculate "m",
        where 1/(cos(2*PI/X)+m*sin(2*PI/X)) = 1/(cos(0)+m*sin(0))
        http://www.wolframalpha.com/input/?i=1%2F%28cos%282*PI%2FX%29%2Bm*sin%28
        2*PI%2FX%29%29+%3D+1%2F%28cos%280%29%2Bm*sin%280%29%29
        Copy the solution into polar equation r = 1/(cos(t') + m*sin(t'))
        where t' equals to mod(t, 2PI/X)
       */

        case 'diamond':
          // http://www.wolframalpha.com/input/?i=plot+r+%3D+1%2F%28cos%28mod+
          // %28t%2C+PI%2F2%29%29%2Bsin%28mod+%28t%2C+PI%2F2%29%29%29%2C+t+%3D
          // +0+..+2*PI
          settings.shape = function shapeSquare(theta) {
            var thetaPrime = theta % (2 * Math.PI / 4)
            return 1 / (Math.cos(thetaPrime) + Math.sin(thetaPrime))
          }
          break

        case 'square':
          // http://www.wolframalpha.com/input/?i=plot+r+%3D+min(1%2Fabs(cos(t
          // )),1%2Fabs(sin(t)))),+t+%3D+0+..+2*PI
          settings.shape = function shapeSquare(theta) {
            return Math.min(
              1 / Math.abs(Math.cos(theta)),
              1 / Math.abs(Math.sin(theta))
            )
          }
          break

        case 'triangle-forward':
          // http://www.wolframalpha.com/input/?i=plot+r+%3D+1%2F%28cos%28mod+
          // %28t%2C+2*PI%2F3%29%29%2Bsqrt%283%29sin%28mod+%28t%2C+2*PI%2F3%29
          // %29%29%2C+t+%3D+0+..+2*PI
          settings.shape = function shapeTriangle(theta) {
            var thetaPrime = theta % (2 * Math.PI / 3)
            return 1 / (Math.cos(thetaPrime) +
              Math.sqrt(3) * Math.sin(thetaPrime))
          }
          break

        case 'triangle':
        case 'triangle-upright':
          settings.shape = function shapeTriangle(theta) {
            var thetaPrime = (theta + Math.PI * 3 / 2) % (2 * Math.PI / 3)
            return 1 / (Math.cos(thetaPrime) +
              Math.sqrt(3) * Math.sin(thetaPrime))
          }
          break

        case 'pentagon':
          settings.shape = function shapePentagon(theta) {
            var thetaPrime = (theta + 0.955) % (2 * Math.PI / 5)
            return 1 / (Math.cos(thetaPrime) +
              0.726543 * Math.sin(thetaPrime))
          }
          break

        case 'star':
          settings.shape = function shapeStar(theta) {
            var thetaPrime = (theta + 0.955) % (2 * Math.PI / 10)
            if ((theta + 0.955) % (2 * Math.PI / 5) - (2 * Math.PI / 10) >= 0) {
              return 1 / (Math.cos((2 * Math.PI / 10) - thetaPrime) +
                3.07768 * Math.sin((2 * Math.PI / 10) - thetaPrime))
            } else {
              return 1 / (Math.cos(thetaPrime) +
                3.07768 * Math.sin(thetaPrime))
            }
          }
          break
      }
    }

    /* Make sure gridSize is a whole number and is not smaller than 4px */
    settings.gridSize = Math.max(Math.floor(settings.gridSize), 4)

    /* shorthand */
    var g = settings.gridSize
    var maskRectWidth = g - settings.maskGapWidth

    /* normalize rotation settings */
    var rotationRange = Math.abs(settings.maxRotation - settings.minRotation)
    var rotationSteps = Math.abs(Math.floor(settings.rotationSteps))
    var minRotation = Math.min(settings.maxRotation, settings.minRotation)

    /* information/object available to all functions, set when start() */
    var grid, // 2d array containing filling information
      ngx, ngy, // width and height of the grid
      center, // position of the center of the cloud
      maxRadius

    /* timestamp for measuring each putWord() action */
    var escapeTime

    /* function for getting the color of the text */
    var getTextColor
    function randomHslColor(min, max) {
      return 'hsl(' +
        (Math.random() * 360).toFixed() + ',' +
        (Math.random() * 30 + 70).toFixed() + '%,' +
        (Math.random() * (max - min) + min).toFixed() + '%)'
    }
    switch (settings.color) {
      case 'random-dark':
        getTextColor = function getRandomDarkColor() {
          return randomHslColor(10, 50)
        }
        break

      case 'random-light':
        getTextColor = function getRandomLightColor() {
          return randomHslColor(50, 90)
        }
        break

      default:
        if (typeof settings.color === 'function') {
          getTextColor = settings.color
        }
        break
    }

    /* function for getting the font-weight of the text */
    var getTextFontWeight
    if (typeof settings.fontWeight === 'function') {
      getTextFontWeight = settings.fontWeight
    }

    /* function for getting the classes of the text */
    var getTextClasses = null
    if (typeof settings.classes === 'function') {
      getTextClasses = settings.classes
    }

    /* Interactive */
    var interactive = false
    var infoGrid = []
    var hovered

    var getInfoGridFromMouseTouchEvent =
      function getInfoGridFromMouseTouchEvent(evt) {
        var canvas = evt.currentTarget
        var rect = canvas.getBoundingClientRect()
        var clientX
        var clientY
        /** Detect if touches are available */
        if (evt.touches) {
          clientX = evt.touches[0].clientX
          clientY = evt.touches[0].clientY
        } else {
          clientX = evt.clientX
          clientY = evt.clientY
        }
        var eventX = clientX - rect.left
        var eventY = clientY - rect.top

        var x = Math.floor(eventX * ((canvas.width / rect.width) || 1) / g)
        var y = Math.floor(eventY * ((canvas.height / rect.height) || 1) / g)

        if (!infoGrid[x]) {
          return null
        }

        return infoGrid[x][y]
      }

    var wordcloudhover = function wordcloudhover(evt) {
      var info = getInfoGridFromMouseTouchEvent(evt)

      if (hovered === info) {
        return
      }

      hovered = info
      if (!info) {
        settings.hover(undefined, undefined, evt)

        return
      }

      settings.hover(info.item, info.dimension, evt)
    }

    var wordcloudclick = function wordcloudclick(evt) {
      var info = getInfoGridFromMouseTouchEvent(evt)
      if (!info) {
        return
      }

      settings.click(info.item, info.dimension, evt)
      evt.preventDefault()
    }

    /* Get points on the grid for a given radius away from the center */
    var pointsAtRadius = []
    var getPointsAtRadius = function getPointsAtRadius(radius) {
      if (pointsAtRadius[radius]) {
        return pointsAtRadius[radius]
      }

      // Look for these number of points on each radius
      var T = radius * 8

      // Getting all the points at this radius
      var t = T
      var points = []

      if (radius === 0) {
        points.push([center[0], center[1], 0])
      }

      while (t--) {
        // distort the radius to put the cloud in shape
        var rx = 1
        if (settings.shape !== 'circle') {
          rx = settings.shape(t / T * 2 * Math.PI) // 0 to 1
        }

        // Push [x, y, t] t is used solely for getTextColor()
        points.push([
          center[0] + radius * rx * Math.cos(-t / T * 2 * Math.PI),
          center[1] + radius * rx * Math.sin(-t / T * 2 * Math.PI) *
          settings.ellipticity,
          t / T * 2 * Math.PI])
      }

      pointsAtRadius[radius] = points
      return points
    }

    /* Return true if we had spent too much time */
    var exceedTime = function exceedTime() {
      return ((settings.abortThreshold > 0) &&
        ((new Date()).getTime() - escapeTime > settings.abortThreshold))
    }

    /* Get the deg of rotation according to settings, and luck. */
    var getRotateDeg = function getRotateDeg() {
      if (settings.rotateRatio === 0) {
        return 0
      }

      if (Math.random() > settings.rotateRatio) {
        return 0
      }

      if (rotationRange === 0) {
        return minRotation
      }

      if (rotationSteps > 0) {
        // Min rotation + zero or more steps * span of one step
        return minRotation +
          Math.floor(Math.random() * rotationSteps) *
          rotationRange / (rotationSteps - 1)
      } else {
        return minRotation + Math.random() * rotationRange
      }
    }

    var getBoxInfo = function getBoxInfo(word, weight, rotateDeg, extraDataArray, customFont) {
      // Log the word being processed
      // ////console.log("Processing word:", word);

      var fontSize = settings.weightFactor(weight);
      if (fontSize <= settings.minSize) {
        // ////console.log("Word skipped due to small font size:", fontSize);
        return false;
      }

      var padding = settings.boxPadding || 0;
      // ////console.log("Font size:", fontSize, "Padding:", padding);

      // Scaling factor, similar to getTextInfo
      var mu = 1;
      if (fontSize < minFontSize) {
        mu = (function calculateScaleFactor() {
          var mu = 2;
          while (mu * fontSize < minFontSize) {
            mu += 2;
          }
          return mu;
        })();
      }
      // ////console.log("Scaling factor (mu):", mu);

      // Create a canvas to measure the text dimensions
      var fcanvas = document.createElement('canvas');
      var fctx = fcanvas.getContext('2d');
      fctx.font = settings.fontWeight + ' ' + (fontSize * mu).toString(10) + 'px ' + customFont;

      // Measure text dimensions
      var fw = fctx.measureText(word).width / mu;
      var fh = Math.max(fontSize * mu, fctx.measureText('m').width, fctx.measureText('\uFF37').width) / mu;
      // ////console.log("Measured dimensions:", { fw, fh });

      // Add padding to the dimensions to get the bounding box size
      var paddedWidth = fw + padding * 2;
      var paddedHeight = fh + padding * 2;
      // ////console.log("Padded dimensions:", { paddedWidth, paddedHeight });

      // Calculate the number of grid cells occupied by the box
      var gw = Math.ceil(paddedWidth / settings.gridSize);
      var gh = Math.ceil(paddedHeight / settings.gridSize);
      // ////console.log("Grid cells (gw, gh):", { gw, gh });

      // Calculate the offsets for centering the text in the box
      var fillTextOffsetX = -fw / 2;
      var fillTextOffsetY = -fh * 0.4;
      // ////console.log("Text offsets (X, Y):", { fillTextOffsetX, fillTextOffsetY });

      // Adjust for rotation
      var cgh = Math.ceil((paddedWidth * Math.abs(Math.sin(rotateDeg)) +
        paddedHeight * Math.abs(Math.cos(rotateDeg))) / settings.gridSize);
      var cgw = Math.ceil((paddedWidth * Math.abs(Math.cos(rotateDeg)) +
        paddedHeight * Math.abs(Math.sin(rotateDeg))) / settings.gridSize);
      // ////console.log("Canvas grid cells with rotation (cgw, cgh):", { cgw, cgh });

      var width = cgw * settings.gridSize;
      var height = cgh * settings.gridSize;
      // ////console.log("Canvas width and height:", { width, height });

      fcanvas.setAttribute('width', width);
      fcanvas.setAttribute('height', height);

      // Scale the canvas for better text rendering
      fctx.scale(1 / mu, 1 / mu);
      fctx.translate(width * mu / 2, height * mu / 2);
      fctx.rotate(-rotateDeg);

      // Set the font again after scaling
      fctx.font = settings.fontWeight + ' ' + (fontSize * mu).toString(10) + 'px ' + customFont;

      // Fill the text into the canvas
      fctx.fillStyle = '#000';
      fctx.textBaseline = 'middle';
      fctx.fillText(word, fillTextOffsetX * mu, (fillTextOffsetY + fontSize * 0.5) * mu);

      // Mark all grid cells in the bounding box as occupied
      var occupied = [];
      for (var gx = 0; gx < gw; gx++) {
        for (var gy = 0; gy < gh; gy++) {
          occupied.push([gx, gy]);  // Mark each grid cell inside the box as occupied
        }
      }
      // ////console.log("Occupied grid cells:", occupied);

      // Define bounds based on the full bounding box
      var bounds = [0, gw - 1, gh - 1, 0];
      // ////console.log("Bounds:", bounds);

      // Add ////////// //debugger statement for deep inspection during execution
      ////////// //debugger;

      // Return information about the box and text for placement
      return {
        paddedWidth: paddedWidth,
        paddedHeight: paddedHeight,
        fillTextOffsetX: fillTextOffsetX,
        fillTextOffsetY: fillTextOffsetY,
        fontSize: fontSize,
        mu: mu,  // Scaling factor
        padding: padding,
        gw: gw,  // Grid width in cells
        gh: gh,  // Grid height in cells
        occupied: occupied,  // All cells within the bounding box are marked as occupied
        bounds: bounds,
        fillTextWidth: fw,
        fillTextHeight: fh
      };
    };

    var getBoxInfoWithPixelData = function getBoxInfoWithPixelData(word, weight, rotateDeg, extraDataArray, customFont) {
      // ////console.log("Rendering word with added spaces in a new canvas and calculating bounding box...");

      var padding = settings.boxPadding || 0; // Padding around the word, add it as % of the words width to all sides before calculating the bounding box
      var margin = settings.margin;
      var fontSize = settings.weightFactor(weight);
      if (fontSize <= settings.minSize) {
        // ////console.log("Word skipped due to small font size:", fontSize);
        return false;
      }

      // ////console.log("Font size:", fontSize);

      var mu = 1;
      if (fontSize < minFontSize) {
        mu = (function calculateScaleFactor() {
          var mu = 2;
          while (mu * fontSize < minFontSize) {
            mu += 2;
          }
          return mu;
        })();
      }

      // Add spaces in front of the word
      var paddedWord = "" + word; // Add three spaces before the word
      var padding = settings.boxPadding || 0; // Padding around the word, add it as % of the words width to all sides before calculating the bounding box
      // Create a canvas to measure the word size first
      var measureCanvas = document.createElement('canvas');
      var measureCtx = measureCanvas.getContext('2d');

      // Apply the font and measure text width and height
      measureCtx.font = settings.fontWeight + ' ' + (fontSize * mu).toString(10) + 'px ' + customFont;
      var fw = measureCtx.measureText(paddedWord).width / mu;
      var fh = Math.max(fontSize * mu, measureCtx.measureText('m').width, measureCtx.measureText('\uFF37').width) / mu;

      // Add a larger buffer to prevent any cutoff
      var buffer = 400; // Increased buffer size
      var canvasWidth = Math.ceil(fw * mu) + buffer; // Buffer for larger words
      var canvasHeight = Math.ceil(fh * mu) + buffer; // Buffer for larger words

      // Create a new canvas to fit the word with the buffer
      var fcanvas = document.createElement('canvas');
      var fctx = fcanvas.getContext('2d');

      fcanvas.setAttribute('width', canvasWidth);
      fcanvas.setAttribute('height', canvasHeight);

      // Step 1: Render the word on the canvas
      fctx.font = settings.fontWeight + ' ' + (fontSize * mu).toString(10) + 'px ' + customFont;
      fctx.fillStyle = 'green'; // Use green color for word rendering
      fctx.textBaseline = 'top'; // Top baseline simplifies boundary calculation
      fctx.fillText(paddedWord, buffer / 2, buffer / 2); // Draw in the center of the buffer

      // Get pixel data for the entire canvas
      var imageData = fctx.getImageData(0, 0, canvasWidth, canvasHeight).data;

      // Initialize variables to track the bounding box
      var top = canvasHeight, bottom = 0, left = canvasWidth, right = 0;

      // Loop through the pixel array and find the green pixels
      for (var y = 0; y < canvasHeight; y++) {
        for (var x = 0; x < canvasWidth; x++) {
          var index = (y * canvasWidth + x) * 4; // Pixel index in the array
          var r = imageData[index];     // Red channel
          var g = imageData[index + 1]; // Green channel
          var b = imageData[index + 2]; // Blue channel
          var alpha = imageData[index + 3]; // Alpha channel

          // Check if the pixel is the specific green color we used for the text
          if (r === 0 && g === 128 && b === 0 && alpha > 0) {
            if (y < top) top = y;        // Update top-most pixel
            if (y > bottom) bottom = y;  // Update bottom-most pixel
            if (x < left) left = x;      // Update left-most pixel
            if (x > right) right = x;    // Update right-most pixel
          }
        }
      }



      // Calculate the actual width and height based on the detected boundaries
      var accurateWidth = right - left;
      var accurateHeight = bottom - top;

      var checkBoxWidth = accurateWidth
      var checkBoxHeight = accurateHeight

      // calculate the padding as a percentage of the word's width
      var paddingWidthPercent = (padding / 100) * accurateWidth;
      var paddingHeightPercent = ((padding * 1.2) / 100) * accurateHeight;
      // round the padding to the nearest whole number

      // add the margin to the paddingPercent
      // var paddingWidthPerMargin = paddingWidthPercent + margin;
      // var paddingHeightPerMargin = paddingHeightPercent + margin;
      var paddingWidthPerMargin = paddingWidthPercent + margin;
      var paddingHeightPerMargin = paddingHeightPercent + margin;

      // add the padding to the accurate width and height to get the padded width and height on all
      accurateWidth += paddingWidthPerMargin * 2;
      accurateHeight += paddingHeightPerMargin * 2;


      // add the padding to the accurate width and height to get the padded width and height on all 

      // Convert the accurate width and height into grid units (divide by gridSize)
      var gw = Math.ceil(accurateWidth / settings.gridSize);
      var gh = Math.ceil(accurateHeight / settings.gridSize);

      // Calculate the grid bounds in pixel terms, converted to grid units
      var topBound = Math.floor(top / settings.gridSize);
      var bottomBound = Math.ceil(bottom / settings.gridSize);
      var leftBound = Math.floor(left / settings.gridSize);
      var rightBound = Math.ceil(right / settings.gridSize);

      // Define the bounds as [top, right, bottom, left] for the word
      var bounds = [topBound, rightBound, bottomBound, leftBound];

      // Step 2: Recalculate offsets based on actual render
      var offsetX = left - (buffer / 2);  // Adjust X offset based on buffer
      var offsetY = top - (buffer / 2);   // Adjust Y offset based on buffer

      // Dynamically calculate fillText offsets using recalculated pixel bounds
      var fillTextOffsetX = offsetX * mu;
      var fillTextOffsetY = offsetY * mu;

      // ////console.log("Pixel-based bounding box:", { accurateWidth, accurateHeight, gw, gh, bounds });

      // Calculate the grid cells that the box covers and store in `occupied`
      var occupied = [];
      for (var x = 0; x < gw; x++) {
        for (var y = 0; y < gh; y++) {
          occupied.push([x, y]);
        }
      }

      return {
        checkBoxHeight: checkBoxHeight,
        checkBoxWidth: checkBoxWidth,
        margin: margin,
        paddingWidth: paddingWidthPercent,
        paddingHeight: paddingHeightPercent,
        paddedWidth: accurateWidth,  // No padding
        paddedHeight: accurateHeight,  // No padding
        fillTextOffsetX: fillTextOffsetX,
        fillTextOffsetY: fillTextOffsetY,
        fontSize: fontSize,
        mu: mu,
        gw: gw,  // Grid width in grid cells
        gh: gh,  // Grid height in grid cells
        bounds: bounds,  // Properly calculated bounds based on the word
        fillTextWidth: accurateWidth,
        fillTextHeight: accurateHeight,
        occupied: occupied,  // Grid cells occupied by the box
      };
    };










    var getTextInfo = function getTextInfo(word, weight, rotateDeg, extraDataArray, customFont) {
      // calculate the acutal font size
      // fontSize === 0 means weightFactor function wants the text skipped,
      // and size < minSize means we cannot draw the text.
      var debug = false
      var fontSize = settings.weightFactor(weight)
      if (fontSize <= settings.minSize) {
        return false
      }

      // Scale factor here is to make sure fillText is not limited by
      // the minium font size set by browser.
      // It will always be 1 or 2n.
      var mu = 1
      if (fontSize < minFontSize) {
        mu = (function calculateScaleFactor() {
          var mu = 2
          while (mu * fontSize < minFontSize) {
            mu += 2
          }
          return mu
        })()
      }

      // Get fontWeight that will be used to set fctx.font
      var fontWeight
      if (getTextFontWeight) {
        fontWeight = getTextFontWeight(word, weight, fontSize, extraDataArray)
      } else {
        fontWeight = settings.fontWeight
      }

      var fcanvas = document.createElement('canvas')
      var fctx = fcanvas.getContext('2d', { willReadFrequently: true })

      fctx.font = fontWeight + ' ' +
        (fontSize * mu).toString(10) + 'px ' + customFont

      // Estimate the dimension of the text with measureText().
      var fw = fctx.measureText(word).width / mu
      var fh = Math.max(fontSize * mu,
        fctx.measureText('m').width,
        fctx.measureText('\uFF37').width
      ) / mu

      // Create a boundary box that is larger than our estimates,
      // so text don't get cut of (it sill might)
      var boxWidth = fw + fh * 2
      var boxHeight = fh * 3
      var fgw = Math.ceil(boxWidth / g)
      var fgh = Math.ceil(boxHeight / g)
      boxWidth = fgw * g
      boxHeight = fgh * g

      // Calculate the proper offsets to make the text centered at
      // the preferred position.

      // This is simply half of the width.
      var fillTextOffsetX = -fw / 2
      // Instead of moving the box to the exact middle of the preferred
      // position, for Y-offset we move 0.4 instead, so Latin alphabets look
      // vertical centered.
      var fillTextOffsetY = -fh * 0.4

      // Calculate the actual dimension of the canvas, considering the rotation.
      var cgh = Math.ceil((boxWidth * Math.abs(Math.sin(rotateDeg)) +
        boxHeight * Math.abs(Math.cos(rotateDeg))) / g)
      var cgw = Math.ceil((boxWidth * Math.abs(Math.cos(rotateDeg)) +
        boxHeight * Math.abs(Math.sin(rotateDeg))) / g)
      var width = cgw * g
      var height = cgh * g

      fcanvas.setAttribute('width', width)
      fcanvas.setAttribute('height', height)

      if (debug) {
        // Attach fcanvas to the DOM
        document.body.appendChild(fcanvas)
        // Save it's state so that we could restore and draw the grid correctly.
        fctx.save()
      }

      // Scale the canvas with |mu|.
      fctx.scale(1 / mu, 1 / mu)
      fctx.translate(width * mu / 2, height * mu / 2)
      fctx.rotate(-rotateDeg)

      // Once the width/height is set, ctx info will be reset.
      // Set it again here.
      fctx.font = fontWeight + ' ' +
        (fontSize * mu).toString(10) + 'px ' + customFont

      // Fill the text into the fcanvas.
      // XXX: We cannot because textBaseline = 'top' here because
      // Firefox and Chrome uses different default line-height for canvas.
      // Please read https://bugzil.la/737852#c6.
      // Here, we use textBaseline = 'middle' and draw the text at exactly
      // 0.5 * fontSize lower.
      fctx.fillStyle = '#000'
      fctx.textBaseline = 'middle'
      fctx.fillText(
        word, fillTextOffsetX * mu,
        (fillTextOffsetY + fontSize * 0.5) * mu
      )

      // Get the pixels of the text
      var imageData = fctx.getImageData(0, 0, width, height).data

      if (exceedTime()) {
        return false
      }

      if (debug) {
        // Draw the box of the original estimation
        fctx.strokeRect(
          fillTextOffsetX * mu,
          fillTextOffsetY, fw * mu, fh * mu
        )
        fctx.restore()
      }

      // Read the pixels and save the information to the occupied array
      var occupied = []
      var gx = cgw
      var gy, x, y
      var bounds = [cgh / 2, cgw / 2, cgh / 2, cgw / 2]
      while (gx--) {
        gy = cgh
        while (gy--) {
          y = g
          /* eslint no-labels: ["error", { "allowLoop": true }] */
          singleGridLoop: while (y--) {
            x = g
            while (x--) {
              if (imageData[((gy * g + y) * width +
                (gx * g + x)) * 4 + 3]) {
                occupied.push([gx, gy])

                if (gx < bounds[3]) {
                  bounds[3] = gx
                }
                if (gx > bounds[1]) {
                  bounds[1] = gx
                }
                if (gy < bounds[0]) {
                  bounds[0] = gy
                }
                if (gy > bounds[2]) {
                  bounds[2] = gy
                }

                if (debug) {
                  fctx.fillStyle = 'rgba(255, 0, 0, 0.5)'
                  fctx.fillRect(gx * g, gy * g, g - 0.5, g - 0.5)
                }
                break singleGridLoop
              }
            }
          }
          if (debug) {
            fctx.fillStyle = 'rgba(0, 0, 255, 0.5)'
            fctx.fillRect(gx * g, gy * g, g - 0.5, g - 0.5)
          }
        }
      }

      if (debug) {
        fctx.fillStyle = 'rgba(0, 255, 0, 0.5)'
        fctx.fillRect(
          bounds[3] * g,
          bounds[0] * g,
          (bounds[1] - bounds[3] + 1) * g,
          (bounds[2] - bounds[0] + 1) * g
        )
      }

      // Return information needed to create the text on the real canvas
      return {
        mu: mu,
        occupied: occupied,
        bounds: bounds,
        gw: cgw,
        gh: cgh,
        fillTextOffsetX: fillTextOffsetX,
        fillTextOffsetY: fillTextOffsetY,
        fillTextWidth: fw,
        fillTextHeight: fh,
        fontSize: fontSize
      }
    }

    var canFitBox = function canFitBox(gx, gy, info) {
      var gw = info.gw;  // Grid width in cells
      var gh = info.gh;  // Grid height in cells

      // Check if the box fits within the grid
      for (var x = gx; x < gx + gw; x++) {
        for (var y = gy; y < gy + gh; y++) {
          if (x >= ngx || y >= ngy || x < 0 || y < 0 || !grid[x][y]) {
            return false; // The box doesn't fit if any cell is out of bounds or already occupied
          }
        }
      }
      return true;
    };



    /* Determine if there is room available in the given dimension */
    var canFitText = function canFitText(gx, gy, gw, gh, occupied) {
      // Go through the occupied points,
      // return false if the space is not available.
      var i = occupied.length
      while (i--) {
        var px = gx + occupied[i][0]
        var py = gy + occupied[i][1]

        if (px >= ngx || py >= ngy || px < 0 || py < 0) {
          if (!settings.drawOutOfBound) {
            return false
          }
          continue
        }

        if (!grid[px][py]) {
          return false
        }
      }
      return true
    }

    var drawBox = function drawBox(gx, gy, info, word, weight, distance, theta, rotateDeg, customFont, wordId) {
      var ctx = elements[0].getContext('2d', { willReadFrequently: true });
      var mu = info.mu;
      var fontSize = info.fontSize;
      var paddingWidth = info.paddingWidth;
      var paddingHeight = info.paddingHeight;
      var margin = info.margin;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear the entire canvas

      // Get fontWeight that will be used to set ctx.font and font style rule
      var fontWeight = getTextFontWeight ? getTextFontWeight(word, weight, fontSize) : settings.fontWeight;

      // Calculate the pixel positions
      var pixelX = (gx + info.gw / 2) * settings.gridSize;
      var pixelY = (gy + info.gh / 2) * settings.gridSize;

      ctx.save();
      ctx.scale(1 / mu, 1 / mu);

      // Step 1: Draw the bounding box with padding
      ctx.strokeStyle = '#000'; // Color for the box border
      ctx.lineWidth = 2; // Line width for the box
      ctx.strokeRect(gx * settings.gridSize, gy * settings.gridSize, info.checkBoxWidth, info.checkBoxHeight);

      // Step 2: Set up the font and text style for drawing the word inside the box
      ctx.font = fontWeight + ' ' + (info.fontSize * mu).toString(10) + 'px ' + customFont;
      ctx.fillStyle = '#377e22'; // Use the correct color for the text (greenish #377e22)

      // Draw the word on top of the box without offset
      var textX = gx * settings.gridSize; // X position is the same
      var textY = gy * settings.gridSize; // Y position is the same (no offset yet)
      ctx.fillText(word, textX * mu, textY * mu); // Draw the word
      // //debugger
      ctx.restore();

      // Step 3: Capture the pixel data of the box area
      var boxX = gx * settings.gridSize;
      var boxY = gy * settings.gridSize;
      var boxWidth = info.checkBoxWidth;
      var boxHeight = info.checkBoxHeight;

      // if the boxwidth or height is less than 0, return and skip this word
      if (boxWidth <= 0 || boxHeight <= 0) {
        return
      }



      var pixelData = ctx.getImageData(boxX, boxY, boxWidth, boxHeight); // Snapshot of the box area



      var pixels = pixelData.data;

      // Step 4: Loop through the pixel data to find the lowest greenish pixel inside the box and draw red pixels for each row checked
      var lowestGreenPixelY = 0;
      var rowsChecked = 0;
      var greenPixelFound = true; // Start as true to ensure we check at least the first 3 rows
      var minRowsToCheck = 10; // Always check the first 3 rows

      for (var i = 0; i < pixels.length; i += 4) {
        var red = pixels[i];   // Red value
        var green = pixels[i + 1]; // Green value
        var blue = pixels[i + 2];  // Blue value
        var alpha = pixels[i + 3]; // Alpha value (transparency)

        // Calculate the pixel's position in the box
        var pixelIndex = i / 4;
        var xPos = pixelIndex % boxWidth;
        var yPos = Math.floor(pixelIndex / boxWidth);

        // Render a red pixel for each row we check
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red with transparency
        ctx.fillRect(boxX + xPos, boxY + yPos, 1, 1); // Draw the red pixel

        // If we're starting a new row, reset green pixel found for this row
        if (xPos === 0) {
          greenPixelFound = false; // Assume no green pixel until found
        }

        // Check if the pixel matches the color #377e22 (RGB: 55, 126, 34)
        if (red === 55 && green === 126 && blue === 34 && alpha > 0) {
          greenPixelFound = true; // Mark that a green pixel was found
          if (yPos > lowestGreenPixelY) {
            lowestGreenPixelY = yPos; // Track the lowest green pixel
          }
        }

        // Increment the row check counter when reaching the end of a row
        if (xPos === boxWidth - 1) {
          rowsChecked++;

          // Continue checking at least the first 3 rows, or stop if no green pixel found after that
          if (rowsChecked >= minRowsToCheck && !greenPixelFound) {

            break; // Stop checking once we find a row with no green pixels after 3 rows
          }
        }
      }



      // //debugger
      // Step 5: Calculate the offset based on the lowest green pixel position
      var offsetY = info.paddedHeight - lowestGreenPixelY - (paddingHeight * 1.05 + margin * 2); // Offset from the bottom of the box

      // Step 6: Draw **two separate buffer zones (squares)** that are 20px taller than the original box
      var bufferSize = info.paddedWidth / 8; // Set the size of each buffer square (100px wide)
      // make the bufferSize the closest whole number
      bufferSize = Math.floor(bufferSize);
      // If bufferSize is 0, default it to 6
      if (bufferSize === 0) {
        bufferSize = 6;
      }

      var bufferHeight = boxHeight; // Increase the buffer height by 20px
      var bufferTopOffset = boxHeight + 3; // Shift the buffer up by 10px

      // Adjust the overlap by 40px
      var overlap = info.paddedWidth / 16;

      // Left buffer square (placed left of the bounding box)
      var leftBufferX = boxX - bufferSize + overlap; // Overlap the box by 40px
      var leftBufferY = boxY - bufferTopOffset; // Move the buffer up by 10px
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Light blue for buffer zone
      ctx.lineWidth = 2;
      ctx.strokeRect(leftBufferX - 2, leftBufferY - 2, bufferSize + 4, bufferHeight + 4); // Buffer 20px taller

      // Right buffer square (placed right of the bounding box)
      var rightBufferX = boxX + boxWidth - overlap; // Overlap the box by 40px
      var rightBufferY = boxY - bufferTopOffset; // Move the buffer up by 10px
      ctx.strokeRect(rightBufferX - 2, rightBufferY - 2, bufferSize + 4, bufferHeight + 4); // Buffer 20px taller

      function checkBufferZone(startX, startY, width, height, isLeftBuffer) {
        var bufferData = ctx.getImageData(startX, startY, width, height); // Buffer zone area
        var bufferPixels = bufferData.data; // RGBA values

        var foundGreenPixel = false; // Flag to track if a green pixel is found
        var farthestGreenPixelX = isLeftBuffer ? width : 0; // Initialize as farthest possible, depending on the buffer side
        var halfWidth = Math.floor(bufferSize); // Calculate half of the buffer width

        // Define the scan direction based on left or right buffer
        var startColumn = isLeftBuffer ? width - 1 : 0; // Start from right for left buffer, left for right buffer
        var step = isLeftBuffer ? -1 : 1; // Step direction: left buffer moves left, right buffer moves right

        var hasReachedHalf = false; // Flag to check if we've passed half of the buffer

        // Scan columns one by one
        for (var x = startColumn; (isLeftBuffer ? x >= 0 : x < width); x += step) {
          var isGreenPixelInColumn = false;

          // Check every row in this column for green pixels
          for (var y = 0; y < height; y++) {
            var pixelIndex = (y * width + x) * 4; // Calculate the RGBA index for this pixel

            var red = bufferPixels[pixelIndex];
            var green = bufferPixels[pixelIndex + 1];
            var blue = bufferPixels[pixelIndex + 2];
            var alpha = bufferPixels[pixelIndex + 3];

            //log current pixel color
            //console.log('Pixel color at X:', x, 'Y:', y, 'R:', red, 'G:', green, 'B:', blue, 'A:', alpha);

            // Check if this pixel is green
            if (!(red === 0 && green === 0 && blue === 0 && alpha === 0)) {
              //console.log('Green pixel found at X:', x, 'Y:', y);
              isGreenPixelInColumn = true;
              farthestGreenPixelX = isLeftBuffer ? (width - x) : x; // Track the farthest green pixel
              foundGreenPixel = true; // Mark that we found at least one green pixel

              // Render the current column as red for visualization
              ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red with transparency
              ctx.fillRect(startX + x, startY, 1, height); // Render one column wide (x position)
              break; // No need to check other rows if we found a green pixel in this column
            }
          }



          // Check if we've passed half the buffer width
          if (Math.abs(startColumn - x) >= halfWidth) {
            hasReachedHalf = true;
          }

          // If we've reached half of the buffer zone, and no green pixel was found in the current column, stop
          if (hasReachedHalf && !isGreenPixelInColumn && foundGreenPixel) {
            //console.log('Farthest green pixel in left buffer:', farthestGreenPixelX);
            //debugger
            break;
          }

          // If we've passed half and haven't found any green pixels at all, stop
          if (hasReachedHalf && !foundGreenPixel) {
            //console.log('No green pixels found in left buffer');
            //debugger
            break;
          }
        }
        //debugger
        // Return the last farthest green pixel, even if none was found
        return isLeftBuffer ? farthestGreenPixelX : -farthestGreenPixelX;
      }







      // Check left and right buffer zones
      var farthestGreenPixelLeft = checkBufferZone(leftBufferX, leftBufferY, bufferSize, bufferHeight, true);
      var farthestGreenPixelRight = checkBufferZone(rightBufferX, rightBufferY, bufferSize, bufferHeight, false);
      // ////console.log('Farthest green pixel in left buffer:', farthestGreenPixelLeft);
      // ////console.log('Farthest green pixel in right buffer:', farthestGreenPixelRight);

      // Sum the distances from both buffers
      var farthestGreenPixelSum = 0;

      if (farthestGreenPixelRight < 0 && farthestGreenPixelLeft > 0) {
        // This is the case where the left buffer is positive, and right buffer is negative as expected
        farthestGreenPixelSum = farthestGreenPixelLeft + farthestGreenPixelRight;
      } else if (farthestGreenPixelRight < 0) {
        // No green pixels in left buffer, move left (because right is negative)
        farthestGreenPixelSum = farthestGreenPixelRight;
      } else if (farthestGreenPixelLeft > 0) {
        // No green pixels in right buffer, move right
        farthestGreenPixelSum = farthestGreenPixelLeft;
      }

      //console.log('Farthest green pixel sum:', farthestGreenPixelSum);
      //debugger

      // Step 8: Adjust horizontal position based on buffer zones
      var horizontalOffsetX = paddingWidth + farthestGreenPixelSum;

      // ////console.log('Farthest green pixel sum:', farthestGreenPixelSum);
      // // Step 8: Adjust horizontal position based on buffer zones
      // // var horizontalOffsetX =  margin + padding - margin/2; // Default horizontal offset
      // var horizontalOffsetX = paddingWidth;

      // if (farthestGreenPixelRight > 0) {
      //   // ////console.log('Farthest green pixel in right buffer:', farthestGreenPixelRight);
      //   // Move the word to the left by how far the farthest green pixel is in the right buffer
      //   // //debugger
      //   horizontalOffsetX = horizontalOffsetX-farthestGreenPixelRight;
      // } else if (farthestGreenPixelLeft > 0) {
      //   // ////console.log('Farthest green pixel in left buffer:', farthestGreenPixelLeft);
      //   // //debugger
      //   // Move the word to the right by how far the farthest green pixel is from the right side of the left buffer
      //   horizontalOffsetX = horizontalOffsetX+farthestGreenPixelLeft;
      // }

      // Step 9: Redraw the word with the horizontal offset applied
      ctx.save();
      ctx.scale(1 / mu, 1 / mu);

      // Redraw the bounding box (no clearing)
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx * settings.gridSize, gy * settings.gridSize, info.paddedWidth, info.paddedHeight);

      // Redraw the word with the correct horizontal offset
      ctx.font = fontWeight + ' ' + (info.fontSize * mu).toString(10) + 'px ' + customFont;
      ctx.fillStyle = '#377e22'; // Use the same color for consistency

      // Draw the word using the new X and Y positions (with the horizontal offset)
      ctx.fillText(word, (textX + horizontalOffsetX) * mu, (textY + offsetY) * mu);
      // ////console.log("Text drawn at X:", (textX + horizontalOffsetX) * mu, "Y:", (textY + offsetY) * mu);
      // //debugger
      ctx.restore();

      // clear the canvas
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // textPosX = (textX + horizontalOffsetX) * mu;
      // textPosY = (textY + offsetY) * mu;
      // rectPosx = gx * settings.gridSize;


      // Store word details in wordData array (optional if needed)
      wordData.push({
        paddingHeight: paddingHeight,
        paddingWidth: paddingWidth,
        info: info,
        text: word,
        x: pixelX,
        y: pixelY,
        size: fontSize,
        rotation: rotateDeg,
        mu: mu,
        offsetX: horizontalOffsetX,
        offsetY: offsetY,
        baseline: 'middle',
        fontFamily: customFont,
        wordId: wordId,
      });
    };


    var drawText = function drawText(gx, gy, info, word, weight, distance, theta, rotateDeg, attributes, extraDataArray, customFont, wordId) {


      var fontSize = info.fontSize;
      var color;
      if (getTextColor) {
        color = getTextColor(word, weight, fontSize, distance, theta, extraDataArray);
      } else {
        color = settings.color;
      }

      // Get fontWeight that will be used to set ctx.font and font style rule
      var fontWeight = getTextFontWeight ? getTextFontWeight(word, weight, fontSize, extraDataArray) : settings.fontWeight;

      var ctx = elements[0].getContext('2d', { willReadFrequently: true });
      var mu = info.mu;

      // Calculate the pixel positions
      var pixelX = (gx + info.gw / 2) * g;
      var pixelY = (gy + info.gh / 2) * g;


      ctx.save();
      ctx.scale(1 / mu, 1 / mu);

      ctx.font = fontWeight + ' ' + (fontSize * mu).toString(10) + 'px ' + customFont;
      ctx.fillStyle = color;

      // Translate the canvas position to the origin coordinate of where the text should be put.
      ctx.translate((gx + info.gw / 2) * g * mu, (gy + info.gh / 2) * g * mu);

      if (rotateDeg !== 0) {
        ctx.rotate(-rotateDeg);
      }

      ctx.textBaseline = 'middle';
      ctx.fillText(word, info.fillTextOffsetX * mu, (info.fillTextOffsetY + fontSize * 0.5) * mu);

      ctx.restore();

      // Store word details in wordData array
      wordData.push({
        info: info,
        text: word,
        x: pixelX,
        y: pixelY,
        size: fontSize,
        rotation: rotateDeg,
        mu: mu,
        offsetX: info.fillTextOffsetX,
        offsetY: info.fillTextOffsetY,
        baseline: 'middle', // or any other setting if changed
        fontFamily: customFont,
        wordId: wordId,
      });
    };
    // Expose the wordData array globally so it can be accessed
    global.getWordCloudData = function () {
      return wordData;
    };
    // Modify the start function to return the word data after drawing
    //   var start = function start() {
    //     // All the logic for drawing remains here...
    //     // Start the word cloud generation process
    //     // ////console.log("Starting word cloud generation...");
    // var timerId = setImmediate(function loop() {
    //   // ////console.log("Current word index:", i);
    //       if (i >= settings.list.length) {
    //         clearImmediate(timerId);
    //         // ////console.log('All words have been processed. Word data:', wordData);
    //         // Call processingDone once all words have been processed
    //         processingDone();

    //         return wordData;
    //       }

    //       escapeTime = (new Date()).getTime();
    //       var drawn = putWord(settings.list[i]);

    //       if (drawn) {
    //         // Log the word if drawn successfully
    //         //// ////console.log('Word Drawn:', settings.list[i][0]);
    //       }

    //       i++;
    //       timerId = setImmediate(loop);
    //     });
    //     //// ////console.log('Word Data:', wordData);
    //     // At the end, return the collected word data
    //     return wordData;
    //   };


    /* Help function to updateGrid */
    var fillGridAt = function fillGridAt(x, y, drawMask, dimension, item) {
      if (x >= ngx || y >= ngy || x < 0 || y < 0) {
        return
      }

      grid[x][y] = false

      if (drawMask) {
        var ctx = elements[0].getContext('2d')
        ctx.fillRect(x * g, y * g, maskRectWidth, maskRectWidth)
      }

      if (interactive) {
        infoGrid[x][y] = { item: item, dimension: dimension }
      }
    }

    /* Update the filling information of the given space with occupied points.
       Draw the mask on the canvas if necessary. */
    var updateGrid = function updateGrid(gx, gy, gw, gh, info, item) {
      var occupied = info.occupied;
      var drawMask = settings.drawMask;
      var ctx;

      if (drawMask) {
        ctx = elements[0].getContext('2d');
        ctx.save();
        ctx.fillStyle = settings.maskColor;
      }

      var dimension;
      if (interactive) {
        var bounds = info.bounds;
        dimension = {
          x: (gx + bounds[3]) * settings.gridSize,
          y: (gy + bounds[0]) * settings.gridSize,
          w: (bounds[1] - bounds[3] + 1) * settings.gridSize,
          h: (bounds[2] - bounds[0] + 1) * settings.gridSize,
        };
      }

      // Loop through the occupied grid cells and update them
      var i = occupied.length;
      while (i--) {
        var px = gx + occupied[i][0];
        var py = gy + occupied[i][1];

        if (px >= ngx || py >= ngy || px < 0 || py < 0) {
          continue;
        }

        // Mark the grid cell as occupied
        grid[px][py] = false;

        if (drawMask) {
          ctx.fillRect(px * settings.gridSize, py * settings.gridSize, settings.gridSize, settings.gridSize);
        }

        if (interactive) {
          infoGrid[px][py] = { item: item, dimension: dimension };
        }
      }

      if (drawMask) {
        ctx.restore();
      }
    };



    /* putWord() processes each item on the list,
       calculate it's size and determine it's position, and actually
       put it on the canvas. */
    var putWord = function putWord(item) {
      var word, weight, attributes, customFont, wordId;
      // Get word data from the item
      if (Array.isArray(item)) {
        word = item[0];
        weight = item[1];
        customFont = item[2];
        wordId = item[3];
      } else {
        word = item.word;
        weight = item.weight;
        attributes = item.attributes;
      }

      var rotateDeg = getRotateDeg();
      var extraDataArray = getItemExtraData(item);


      //// //debugger;
      // Conditionally get info either for the text or for the box
      var info = settings.boxPadding > 0
        ? getBoxInfoWithPixelData(word, weight, rotateDeg, extraDataArray, customFont)
        : getTextInfo(word, weight, rotateDeg, extraDataArray, customFont);


      // ////console.log('newbox info:', getBoxInfoWithPixelData(word, weight, rotateDeg, extraDataArray, customFont));
      // ////console.log('box Info:', getBoxInfo(word, weight, rotateDeg, extraDataArray, customFont));
      // ////console.log('text Info:', getTextInfo(word, weight, rotateDeg, extraDataArray, customFont));
      //// //debugger;

      if (!info) {
        return false; // Skip this word if no info is returned
      }

      if (exceedTime()) {
        return false;
      }

      // Skip words that don't fit within the canvas bounds, unless drawOutOfBound is true
      if (!settings.drawOutOfBound && !settings.shrinkToFit) {
        var bounds = info.bounds;
        if ((bounds[1] - bounds[3] + 1) > ngx || (bounds[2] - bounds[0] + 1) > ngy) {
          return false;
        }
      }

      // Start looking for the nearest available points to place the word/box
      var r = maxRadius + 1;

      // Try placing the word/box at each point
      var tryToPutWordAtPoint = function (gxy) {
        // Calculate grid coordinates
        var gx = Math.floor(gxy[0] - info.gw / 2);
        var gy = Math.floor(gxy[1] - info.gh / 2);
        var gw = info.gw;
        var gh = info.gh;

        // Conditionally check if the box or text fits in the grid
        var canFit = settings.boxPadding > 0
          ? canFitBox(gx, gy, info)  // Use box logic if boxPadding is set
          : canFitText(gx, gy, gw, gh, info.occupied);  // Use regular word logic otherwise

        if (!canFit) {
          return false;
        }

        // Draw the box or the text depending on boxPadding
        if (settings.boxPadding > 0) {
          drawBox(gx, gy, info, word, weight, (maxRadius - r), gxy[2], rotateDeg, customFont, wordId);
        } else {
          drawText(gx, gy, info, word, weight, (maxRadius - r), gxy[2], rotateDeg, attributes, extraDataArray, customFont, wordId);
        }

        // Mark the spaces on the grid as filled
        updateGrid(gx, gy, gw, gh, info, item);

        return true;  // Return true to indicate successful placement
      };

      // Try to place the word/box at points on the grid
      while (r--) {
        var points = getPointsAtRadius(maxRadius - r);

        if (settings.shuffle) {
          points = [].concat(points);
          shuffleArray(points);
        }

        // Try to fit the words/boxes by looking at each point
        var drawn = points.some(tryToPutWordAtPoint);

        if (drawn) {
          return true;  // Successfully placed the word/box
        }
      }

      // Shrink the word if necessary
      if (settings.shrinkToFit) {
        if (Array.isArray(item)) {
          item[1] = item[1] * 3 / 4;
        } else {
          item.weight = item.weight * 3 / 4;
        }
        return putWord(item);  // Retry with a smaller size
      }

      return false;  // If no valid position was found
    };




    /* Send DOM event to all elements. Will stop sending event and return
       if the previous one is canceled (for cancelable events). */
    var sendEvent = function sendEvent(type, cancelable, details) {
      if (cancelable) {
        return !elements.some(function (el) {
          var event = new CustomEvent(type, {
            detail: details || {}
          })
          return !el.dispatchEvent(event)
        }, this)
      } else {
        elements.forEach(function (el) {
          var event = new CustomEvent(type, {
            detail: details || {}
          })
          el.dispatchEvent(event)
        }, this)
      }
    }

    /* Start drawing on a canvas */
    var start = function start() {

      // reset the wordData array before starting
      wordData = [];

      // Sort settings.list by weight (index 1 in each item)
      settings.list.sort(function (a, b) {
        return b[1] - a[1]; // Sorting by weight in descending order
      });

      // For dimensions, clearCanvas etc.,
      // we only care about the first element.
      var canvas = elements[0]

      if (canvas.getContext) {
        ngx = Math.ceil(canvas.width / g);
        ngy = Math.ceil(canvas.height / g);
      } else {
        var rect = canvas.getBoundingClientRect()
        ngx = Math.ceil(rect.width / g)
        ngy = Math.ceil(rect.height / g)
      }

      // Sending a wordcloudstart event which cause the previous loop to stop.
      // Do nothing if the event is canceled.
      if (!sendEvent('wordcloudstart', true)) {
        return
      }

      // Determine the center of the word cloud
      // center = (settings.origin)
      //   ? [settings.origin[0] / g, settings.origin[1] / g]
      //   : [ngx / 2, ngy / 2]
      center = (settings.origin)
        ? [settings.origin[0] / g, settings.origin[1] / g]
        : [Math.floor(ngx / 2), Math.floor(ngy / 2)];  // Ensure the center is exactly in the middle


      // draw a cross indicating the center
      if (settings.drawCenter) {
        var ctx = canvas.getContext('2d')
        ctx.save()
        ctx.translate(center[0] * g, center[1] * g)
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(5, 0)
        ctx.moveTo(0, -5)
        ctx.lineTo(0, 5)
        ctx.lineWidth = 2
        ctx.strokeStyle = 'red'
        ctx.stroke()
        ctx.restore()

      }
      // Maxium radius to look for space
      maxRadius = Math.floor(Math.sqrt(ngx * ngx + ngy * ngy))

      /* Clear the canvas only if the clearCanvas is set,
         if not, update the grid to the current canvas state */
      grid = []

      var gx, gy, i
      if (!canvas.getContext || settings.clearCanvas) {
        elements.forEach(function (el) {
          if (el.getContext) {
            var ctx = el.getContext('2d')
            ctx.fillStyle = settings.backgroundColor
            ctx.clearRect(0, 0, ngx * (g + 1), ngy * (g + 1))
            ctx.fillRect(0, 0, ngx * (g + 1), ngy * (g + 1))
          } else {
            el.textContent = ''
            el.style.backgroundColor = settings.backgroundColor
            el.style.position = 'relative'
          }
        })




        /* fill the grid with empty state */
        gx = ngx
        while (gx--) {
          grid[gx] = []
          gy = ngy
          while (gy--) {
            grid[gx][gy] = true
          }
        }

        // If the border setting is greater than 0, mark the edge cells as occupied
        if (settings.border > 0) {
          const n = settings.border;  // Number of rows/columns to mark as occupied

          // Mark the top and bottom n rows as occupied
          for (let gx = 0; gx < ngx; gx++) {
            for (let i = 0; i < n; i++) {
              grid[gx][i] = false; // Top edge (n rows)
              grid[gx][ngy - 1 - i] = false; // Bottom edge (n rows)
            }
          }

          // Mark the left and right n columns as occupied
          for (let gy = 0; gy < ngy; gy++) {
            for (let i = 0; i < n; i++) {
              grid[i][gy] = false; // Left edge (n columns)
              grid[ngx - 1 - i][gy] = false; // Right edge (n columns)
            }
          }
        }

        // draw the grid lines if drawGridLines is set
        if (settings.drawGridLines) {
          var ctx = elements[0].getContext('2d')
          ctx.beginPath()
          for (gx = 0; gx < ngx; gx++) {
            ctx.moveTo(gx * g, 0)
            ctx.lineTo(gx * g, ngy * g)
          }
          for (gy = 0; gy < ngy; gy++) {
            ctx.moveTo(0, gy * g)
            ctx.lineTo(ngx * g, gy * g)
          }
          ctx.lineWidth = 1
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
          ctx.stroke()
        }

      } else {
        /* Determine bgPixel by creating
           another canvas and fill the specified background color. */
        var bctx = document.createElement('canvas').getContext('2d')

        bctx.fillStyle = settings.backgroundColor
        bctx.fillRect(0, 0, 1, 1)
        var bgPixel = bctx.getImageData(0, 0, 1, 1).data

        /* Read back the pixels of the canvas we got to tell which part of the
           canvas is empty.
           (no clearCanvas only works with a canvas, not divs) */
        var imageData =
          canvas.getContext('2d').getImageData(0, 0, ngx * g, ngy * g).data

        gx = ngx
        var x, y
        while (gx--) {
          grid[gx] = []
          gy = ngy
          while (gy--) {
            y = g
            /* eslint no-labels: ["error", { "allowLoop": true }] */
            singleGridLoop: while (y--) {
              x = g
              while (x--) {
                i = 4
                while (i--) {
                  if (imageData[((gy * g + y) * ngx * g +
                    (gx * g + x)) * 4 + i] !== bgPixel[i]) {
                    grid[gx][gy] = false
                    break singleGridLoop
                  }
                }
              }
            }
            if (grid[gx][gy] !== false) {
              grid[gx][gy] = true
            }
          }
        }

        imageData = bctx = bgPixel = undefined
      }

      // fill the infoGrid with empty state if we need it
      if (settings.hover || settings.click) {
        interactive = true

        /* fill the grid with empty state */
        gx = ngx + 1
        while (gx--) {
          infoGrid[gx] = []
        }

        if (settings.hover) {
          canvas.addEventListener('mousemove', wordcloudhover)
        }

        if (settings.click) {
          canvas.addEventListener('click', wordcloudclick)
          canvas.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0)'
        }

        canvas.addEventListener('wordcloudstart', function stopInteraction() {
          canvas.removeEventListener('wordcloudstart', stopInteraction)
          canvas.removeEventListener('mousemove', wordcloudhover)
          canvas.removeEventListener('click', wordcloudclick)
          hovered = undefined
        })
      }

      i = 0
      var loopingFunction, stoppingFunction
      if (settings.wait !== 0) {
        loopingFunction = window.setTimeout
        stoppingFunction = window.clearTimeout
      } else {
        loopingFunction = window.setImmediate
        stoppingFunction = window.clearImmediate
      }

      var addEventListener = function addEventListener(type, listener) {
        elements.forEach(function (el) {
          el.addEventListener(type, listener)
        }, this)
      }

      var removeEventListener = function removeEventListener(type, listener) {
        elements.forEach(function (el) {
          el.removeEventListener(type, listener)
        }, this)
      }

      var anotherWordCloudStart = function anotherWordCloudStart() {
        removeEventListener('wordcloudstart', anotherWordCloudStart)
        stoppingFunction(timer[timerId])
      }

      addEventListener('wordcloudstart', anotherWordCloudStart)
      timer[timerId] = loopingFunction(function loop() {
        if (i >= settings.list.length) {
          // ////console.log("proStatus before setting done:", proStatus); // Debug log

          stoppingFunction(timer[timerId])
          sendEvent('wordcloudstop', false)
          removeEventListener('wordcloudstart', anotherWordCloudStart)
          delete timer[timerId];
          // Mark the word cloud generation as complete
          proStatus.done = true;
          // ////console.log("proStatus after setting done:", proStatus); // Debug log
          // ////console.log("Word cloud generation is complete.");

          return
        }
        escapeTime = (new Date()).getTime()
        ////////// //debugger;
        var drawn = putWord(settings.list[i])
        var canceled = !sendEvent('wordclouddrawn', true, {
          item: settings.list[i],
          drawn: drawn
        })
        if (exceedTime() || canceled) {
          stoppingFunction(timer[timerId])
          settings.abort()
          sendEvent('wordcloudabort', false)
          sendEvent('wordcloudstop', false)
          removeEventListener('wordcloudstart', anotherWordCloudStart)
          delete timer[timerId]
          return
        }
        i++
        timer[timerId] = loopingFunction(loop, settings.wait)
      }, settings.wait)
    }

    // ////console.log("Before calling start()...");
    start();  // Ensure this is being called in your script
    // ////console.log("After calling start()...");
  }

  WordCloud.isSupported = isSupported
  WordCloud.minFontSize = minFontSize
  WordCloud.stop = function stop() {

    if (timer) {
      for (var timerId in timer) {
        window.clearImmediate(timer[timerId])
      }
    }
  }

  // Expose the library as an AMD module
  if (typeof define === 'function' && define.amd) { // eslint-disable-line no-undef
    global.WordCloud = WordCloud
    define('wordcloud', [], function () { return WordCloud }) // eslint-disable-line no-undef
  } else if (typeof module !== 'undefined' && module.exports) { // eslint-disable-line no-undef
    module.exports = WordCloud // eslint-disable-line no-undef
  } else {
    global.WordCloud = WordCloud
  }
})(this) // jshint ignore:line