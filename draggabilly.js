/*!
 * Draggabilly v1.2.3
 * Make that shiz draggable
 * http://draggabilly.desandro.com
 * MIT license
 */

( function( window, factory ) {
  'use strict';

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
        'classie/classie',
        'get-style-property/get-style-property',
        'get-size/get-size',
        'unidragger/unidragger'
      ],
      function( classie, getStyleProperty, getSize, Unidragger ) {
        return factory( window, classie, getStyleProperty, getSize, Unidragger );
      });
  } else if ( typeof exports == 'object' ) {
    // CommonJS
    module.exports = factory(
      window,
      require('desandro-classie'),
      require('desandro-get-style-property'),
      require('get-size'),
      require('unidragger')
    );
  } else {
    // browser global
    window.Draggabilly = factory(
      window,
      window.classie,
      window.getStyleProperty,
      window.getSize,
      window.Unidragger
    );
  }

}( window, function factory( window, classie, getStyleProperty, getSize, Unidragger ) {

'use strict';

// vars
var document = window.document;

function noop() {}

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

// ----- get style ----- //

var defView = document.defaultView;

var getStyle = defView && defView.getComputedStyle ?
  function( elem ) {
    return defView.getComputedStyle( elem, null );
  } :
  function( elem ) {
    return elem.currentStyle;
  };


// http://stackoverflow.com/a/384380/182183
var isElement = ( typeof HTMLElement === 'object' ) ?
  function isElementDOM2( obj ) {
    return obj instanceof HTMLElement;
  } :
  function isElementQuirky( obj ) {
    return obj && typeof obj === 'object' &&
      obj.nodeType === 1 && typeof obj.nodeName === 'string';
  };

// -------------------------- requestAnimationFrame -------------------------- //

// https://gist.github.com/1866474

var lastTime = 0;
var prefixes = 'webkit moz ms o'.split(' ');
// get unprefixed rAF and cAF, if present
var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;
// loop through vendor prefixes and get prefixed rAF and cAF
var prefix;
for( var i = 0, l=prefixes.length; i < l; i++ ) {
  if ( requestAnimationFrame && cancelAnimationFrame ) {
    break;
  }
  prefix = prefixes[i];
  requestAnimationFrame = requestAnimationFrame || window[ prefix + 'RequestAnimationFrame' ];
  cancelAnimationFrame  = cancelAnimationFrame  || window[ prefix + 'CancelAnimationFrame' ] ||
                            window[ prefix + 'CancelRequestAnimationFrame' ];
}

// fallback to setTimeout and clearTimeout if either request/cancel is not supported
if ( !requestAnimationFrame || !cancelAnimationFrame )  {
  requestAnimationFrame = function( callback ) {
    var currTime = +new Date();
    var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
    var id = window.setTimeout( function() {
      callback( currTime + timeToCall );
    }, timeToCall );
    lastTime = currTime + timeToCall;
    return id;
  };

  cancelAnimationFrame = function( id ) {
    window.clearTimeout( id );
  };
}

// -------------------------- scrollOffset window -------------------------- //
var getScrollOffset = 'pageXOffset' in window ? function(w) {
  w = w || window;

  return {
    x: w.pageXOffset,
    y: w.pageYOffset
  };
} : document.compatMode === 'CSS1Compat' ? function(w) {
  w = w || window;

  var d = w.document;

  return {
    x: d.documentElement.scrollLeft,
    y: d.documentElement.scrollTop
  };
} : function(w) {
  w = w || window;

  var d = w.document;

  return {
    x: d.body.scrollLeft,
    y: d.body.scrollTop
  };
};
// --------------------------  -------------------------- //

// -------------------------- contains DOM node -------------------------- //

var ua = navigator.userAgent.toLowerCase(),
isBrokenSafari = !!~ua.indexOf('safari') && !~ua.indexOf('chrome') && function() {
  var version = ua.match(/safari\/(\d+)/ig);

  return !version || version.length === 1 ? !1 : version[1] > 521 ? !1 : !0;
}(),

// IE / Safari(some) DOM
IE_Safari = function( parent, descendant ) {
  return parent === descendant || parent.contains(descendant);
},

// W3C DOM Level 3
W3C_L_3 = function( parent, descendant ) {
  return parent === descendant || !!(parent.compareDocumentPosition(descendant) & 16);
},

// W3C DOM Level 1
W3C_L_1 = function( parent, descendant ) {
  while (descendant && parent !== descendant) {
    descendant = descendant.parentNode;
  }
  return descendant === parent;
};

// --------------------------  -------------------------- //

// -------------------------- support -------------------------- //

var transformProperty = getStyleProperty('transform');
// TODO fix quick & dirty check for 3D support
var is3d = !!getStyleProperty('perspective');

var cssPointerEvents = function() {
  var style = document.createElement('a').style;
  style.cssText = 'pointer-events:auto';
  return style.pointerEvents === 'auto';
}();

var jQuery = window.jQuery;

// --------------------------  -------------------------- //

function Draggabilly( element, options ) {
  // querySelector if string
  this.element = typeof element == 'string' ?
    document.querySelector( element ) : element;

  if ( jQuery ) {
    this.$element = jQuery( this.element );
  }

  // options
  this.options = extend( {}, this.constructor.defaults );
  this.option( options );

  this._create();
}

// inherit Unidragger methods
extend( Draggabilly.prototype, Unidragger.prototype );

Draggabilly.defaults = {
};

/**
 * set options
 * @param {Object} opts
 */
Draggabilly.prototype.option = function( opts ) {
  extend( this.options, opts );
};

Draggabilly.prototype._create = function() {

  // properties
  this.position = {};
  this._getPosition();

  this.startPoint = { x: 0, y: 0 };
  this.dragPoint = { x: 0, y: 0 };

  this.startPosition = extend( {}, this.position );

  var options = this.options;

  if(!options || !options.atBottomLine) {
    // set relative positioning
    var style = getStyle( this.element );
    if ( style.position !== 'relative' && style.position !== 'absolute' ) {
      this.element.style.position = 'relative';
    }
  }

  this.enable();
  this.setHandles();
};

/**
 * set this.handles and bind start events to 'em
 */
Draggabilly.prototype.setHandles = function() {
  this.handles = this.options.handle ?
    this.element.querySelectorAll( this.options.handle ) : [ this.element ];

  this.bindHandles();
};

/**
 * emits events via eventEmitter and jQuery events
 * @param {String} type - name of event
 * @param {Event} event - original event
 * @param {Array} args - extra arguments
 */
Draggabilly.prototype.dispatchEvent = function( type, event, args ) {
  var emitArgs = [ event ].concat( args );
  this.emitEvent( type, emitArgs );
  var jQuery = window.jQuery;
  // trigger jQuery event
  if ( jQuery && this.$element ) {
    if ( event ) {
      // create jQuery event
      var $event = jQuery.Event( event );
      $event.type = type;
      this.$element.trigger( $event, args );
    } else {
      // just trigger with type if no event available
      this.$element.trigger( type, args );
    }
  }
};

// -------------------------- position -------------------------- //

// get left/top position from style
Draggabilly.prototype._getPosition = function() {
  // properties
  var style = getStyle( this.element );

  var x = parseInt( style.left, 10 );
  var y = parseInt( style.top, 10 );

  // clean up 'auto' or other non-integer values
  this.position.x = isNaN( x ) ? 0 : x;
  this.position.y = isNaN( y ) ? 0 : y;

  this._addTransformPosition( style );
};

// add transform: translate( x, y ) to position
Draggabilly.prototype._addTransformPosition = function( style ) {
  if ( !transformProperty ) {
    return;
  }
  var transform = style[ transformProperty ];
  // bail out if value is 'none'
  if ( transform.indexOf('matrix') !== 0 ) {
    return;
  }
  // split matrix(1, 0, 0, 1, x, y)
  var matrixValues = transform.split(',');
  // translate X value is in 12th or 4th position
  var xIndex = transform.indexOf('matrix3d') === 0 ? 12 : 4;
  var translateX = parseInt( matrixValues[ xIndex ], 10 );
  // translate Y value is in 13th or 5th position
  var translateY = parseInt( matrixValues[ xIndex + 1 ], 10 );
  this.position.x += translateX;
  this.position.y += translateY;
};

/**
 * pointer setDropTarget
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.setDropTarget = cssPointerEvents ?
  setDropTargetByCSSDoubleCheck : setDropTargetByJS;

  function setDropTargetByCSSDoubleCheck(event, pointer) {
    var that = this,
      parent = this.element,
      target = pointer.target,
      contains = 'contains' in parent && !isBrokenSafari && target.nodeType === 1 ? IE_Safari :
      'compareDocumentPosition' in parent ? W3C_L_3 : W3C_L_1;

    Draggabilly.prototype.setDropTarget = this.downTarget === target || contains(parent, target) ? setDropTargetByJS : setDropTargetByCSS;

    that.setDropTarget(event, pointer);
  }

  function setDropTargetByCSS(event, pointer) {
    event.dropTarget = pointer.target;
  }

function setDropTargetByJS(event, pointer) {
  var style = this.element.style;
  style.display = 'none';
  event.dropTarget = document.elementFromPoint(pointer.clientX, pointer.clientY);
  style.display = '';
}
// -------------------------- events -------------------------- //

/**
 * pointer start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.pointerDown = function( event, pointer ) {
  this._dragPointerDown( event, pointer );
  // kludge to blur focused inputs in dragger
  var focused = document.activeElement;
  if ( focused && focused.blur ) {
    focused.blur();
  }

  var options = this.options;

  if(options && options.handle) {
    if ( event.preventDefault ) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }
  }

  if(options && options.atBottomLine) {
    var box = this.element.getBoundingClientRect(),
      scroll = getScrollOffset();

    this.startPosition = {
      x: box.left + scroll.x,
      y: box.top + scroll.y
    };
  }

  this.downTarget = pointer.target;

  // bind move and end events
  this._bindPostStartEvents( event );
  classie.add( this.element, 'is-pointer-down' );
  this.dispatchEvent( 'pointerDown', event, [ pointer ] );
};

/**
 * drag move
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.pointerMove = function( event, pointer ) {
  var moveVector = this._dragPointerMove( event, pointer );
  this.dispatchEvent( 'pointerMove', event, [ pointer, moveVector ] );
  this._dragMove( event, pointer, moveVector );
};

/**
 * drag start
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.dragStart = function( event, pointer ) {
  if ( !this.isEnabled ) {
    return;
  }
  var options = this.options;

  if(options && options.atBottomLine) {
    var clone = this.element.cloneNode(true);
    this.clone = clone;

    document.body.appendChild(clone);

    classie.add( this.clone, 'is-clone' );

    this._element = this.element;
    this.element = clone;
  }

  if(!options || !options.atBottomLine) {
    this._getPosition();

    // position _when_ drag began
    this.startPosition.x = this.position.x;
    this.startPosition.y = this.position.y;
  } else {
    this.position = {
      x: this.startPosition.x,
      y: this.startPosition.y
    };
  }

  this.measureContainment();

  // reset left/top style
  this.setLeftTop();

  this.dragPoint.x = 0;
  this.dragPoint.y = 0;

  // reset isDragging flag
  this.isDragging = true;
  classie.add( this.element, 'is-dragging' );

  this.dispatchEvent( 'dragStart', event, [ pointer ] );
  // start animation
  this.animate();
};

Draggabilly.prototype.measureContainment = function() {
  var containment = this.options.containment;
  if ( !containment ) {
    return;
  }

  this.size = getSize( this.element );
  var elemRect = this.element.getBoundingClientRect();

  // use element if element
  var container = isElement( containment ) ? containment :
    // fallback to querySelector if string
    typeof containment == 'string' ? document.querySelector( containment ) :
    // otherwise just `true`, use the parent
    this.element.parentNode;

  this.containerSize = getSize( container );
  var containerRect = container.getBoundingClientRect();

  this.relativeStartPosition = {
    x: elemRect.left - containerRect.left,
    y: elemRect.top  - containerRect.top
  };
};

// ----- move event ----- //

/**
 * drag move
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.dragMove = function( event, pointer, moveVector ) {
  if ( !this.isEnabled ) {
    return;
  }
  var dragX = moveVector.x;
  var dragY = moveVector.y;

  var options = this.options;
  var grid = options.grid;
  var gridX = grid && grid[0];
  var gridY = grid && grid[1];

  if(grid) {
    dragX = applyGrid(dragX, gridX);
    dragY = applyGrid(dragY, gridY);
  }

  if(options.containment) {
    dragX = this.containDrag('x', dragX, gridX);
    dragY = this.containDrag('y', dragY, gridY);
  }

  // constrain to axis
  dragX = this.options.axis === 'y' ? 0 : dragX;
  dragY = this.options.axis === 'x' ? 0 : dragY;

  this.position.x = this.startPosition.x + dragX;
  this.position.y = this.startPosition.y + dragY;
  // set dragPoint properties
  this.dragPoint.x = dragX;
  this.dragPoint.y = dragY;

  this.setDropTarget(event, pointer);

  this.dispatchEvent( 'dragMove', event, [ pointer, moveVector ] );
};

function applyGrid( value, grid, method ) {
  method = method || 'round';
  return grid ? Math[ method ]( value / grid ) * grid : value;
}

Draggabilly.prototype.containDrag = function( axis, drag, grid ) {
  if ( !this.options.containment ) {
    return drag;
  }
  var measure = axis === 'x' ? 'width' : 'height';

  var rel = this.relativeStartPosition[ axis ];
  var min = applyGrid( -rel, grid, 'ceil' );
  var max = this.containerSize[ measure ] - rel - this.size[ measure ];
  max = applyGrid( max, grid, 'floor' );
  return  Math.min( max, Math.max( min, drag ) );
};

// ----- end event ----- //

/**
 * pointer up
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.pointerUp = function( event, pointer ) {
  classie.remove( this.element, 'is-pointer-down' );
  this.dispatchEvent( 'pointerUp', event, [ pointer ] );
  this._dragPointerUp( event, pointer );
};

/**
 * drag end
 * @param {Event} event
 * @param {Event or Touch} pointer
 */
Draggabilly.prototype.dragEnd = function( event, pointer ) {
  if ( !this.isEnabled ) {
    return;
  }
  this.isDragging = false;
  // use top left position when complete
  if ( transformProperty ) {
    this.element.style[ transformProperty ] = '';
    this.setLeftTop();
  }
  classie.remove( this.element, 'is-dragging' );

  this.setDropTarget(event, pointer);

  var options = this.options;
  if(options && options.atBottomLine) {
    document.body.removeChild(this.clone);
    this.element = this._element;

    delete this._element;
    delete this.clone;
  }
  this.dispatchEvent( 'dragEnd', event, [ pointer ] );
};

// -------------------------- animation -------------------------- //

Draggabilly.prototype.animate = function() {
  // only render and animate if dragging
  if ( !this.isDragging ) {
    return;
  }

  this.positionDrag();

  var _this = this;
  requestAnimationFrame( function animateFrame() {
    _this.animate();
  });

};

// transform translate function
var translate = is3d ?
  function( x, y ) {
    return 'translate3d( ' + x + 'px, ' + y + 'px, 0)';
  } :
  function( x, y ) {
    return 'translate( ' + x + 'px, ' + y + 'px)';
  };

// left/top positioning
Draggabilly.prototype.setLeftTop = function() {
  this.element.style.left = this.position.x + 'px';
  this.element.style.top  = this.position.y + 'px';
};

// hardware accelerated position
Draggabilly.prototype.setTranslate = function() {
  // position with transform
  this.element.style[ transformProperty ] = translate( this.dragPoint.x, this.dragPoint.y );
};

Draggabilly.prototype.positionDrag = transformProperty ?
  Draggabilly.prototype.setTranslate : Draggabilly.prototype.setLeftTop;

// ----- staticClick ----- //

Draggabilly.prototype.staticClick = function( event, pointer ) {
  this.dispatchEvent( 'staticClick', event, [ pointer ] );
};

// ----- methods ----- //

Draggabilly.prototype.enable = function() {
  this.isEnabled = true;
};

Draggabilly.prototype.disable = function() {
  this.isEnabled = false;
  if ( this.isDragging ) {
    this.dragEnd();
  }
};

Draggabilly.prototype.destroy = function() {
  this.disable();
  // reset styles
  if ( transformProperty ) {
    this.element.style[ transformProperty ] = '';
  }
  this.element.style.left = '';
  this.element.style.top = '';
  this.element.style.position = '';
  // unbind handles
  this.unbindHandles();
  // remove jQuery data
  if ( this.$element ) {
    this.$element.removeData('draggabilly');
  }
};

// ----- jQuery bridget ----- //

// required for jQuery bridget
Draggabilly.prototype._init = noop;

if ( jQuery && jQuery.bridget ) {
  jQuery.bridget( 'draggabilly', Draggabilly );
}

// -----  ----- //

return Draggabilly;

}));
