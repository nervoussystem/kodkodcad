define(function() {
  "use strict";
  
  var webgl = {};
  
  webgl.init = function(canvas) {
    var gl;
    try {
        gl = canvas.getContext("webgl",{preserveDrawingBuffer: true});
        ext = gl.getExtension("OES_element_index_uint");
    } catch (e) {
    }
    if (!gl) {
        //alert("Could not initialise WebGL, sorry :-(");
        throw "No webGL supported";
    }
    return gl;
  }
  
  return webgl;
});