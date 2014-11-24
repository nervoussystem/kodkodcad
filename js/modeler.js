define(['domReady!','webgl','modelWindow','aabb'],function(doc,webgl,modelWindow,aabb)
{
  "use strict";
  var modeler = {};
  
  /*
    CONSTANTS
  */
  modeler.POINT = 1;
  modeler.LINE = 2;
  modeler.CURVE = 4;
  modeler.SURFACE = 8;
  modeler.EPSILON = 1e-4;
  
  modeler.selection = [];
  modeler.objects = [];
  modeler.windows = [];
  var doRedraw = true;
  modeler.aabbTree = new aabb.AABBNode();
  
  var canvas = doc.getElementById("mainCanvas");
  var gl = webgl.init(canvas);
  
  
  modeler.step = function() {
    if(doRedraw) {
      modeler.redraw();
    }
    requestAnimationFrame(modeler.step);
    
  }
  
  modeler.redraw = function() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for(var i=0, numWindows = modeler.windows.length;i<numWindows; ++i) {
      //setup window camera
      window
      for(var j=0, numObjects = modeler.objects.length; j<numObjects; ++j) {
        vboMesh.draw(modeler.objects[j].display);
      }
    }
  }
  
  modeler.runCommand = function(cmd) {
    
  }
  
  return modeler;
});
