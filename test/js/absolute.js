var transformProperty = getStyleProperty('transform');

var testElem = document.querySelector('.test--absolute');
var h2 = testElem.querySelector('h2');
h2.textContent = 'Drag this element';
classie.add( testElem, 'running' );
var draggieElem =  testElem.querySelector('.draggie');
var draggie = new Draggabilly( draggieElem, {
  atBottomLine: true
});