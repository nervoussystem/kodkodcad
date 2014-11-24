var kodkod;

requirejs.config({
  baseUrl: 'js'
});

requirejs(['modeler'], function(modeler) {
  kodkod = modeler;
});