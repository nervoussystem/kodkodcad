var kodkod;

requirejs.config({
  baseUrl: 'js'
});

requirejs(['modeler'], function(modeler) {
  kodkod = modeler;
  kodkod.init();
  kodkod.step();
});