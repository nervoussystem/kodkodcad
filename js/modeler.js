define(['domReady!','webgl','modelWindow','aabb','glShader', 'basicCurves','gl-matrix-min'],function(doc,webgl,modelWindow,aabb,glShader,basicCurves, glMatrix)
{
  "use strict";
  var mat4 = glMatrix.mat4;
  
  var modeler = {};
  
  /*
    CONSTANTS
  */
  modeler.POINT = 1;
  modeler.LINE = 2;
  modeler.CURVE = 4;
  modeler.SURFACE = 8;
  modeler.EPSILON = 1e-4;
  
  /*
    variables
  */
  modeler.selection = [];
  modeler.objects = [];
  modeler.windows = [];
  modeler.modules = [];
  
  modeler.pMatrix = mat4.create();
  
  var doRedraw = true;
  modeler.aabbTree = new aabb.AABBNode();
  
  /*
    setup drawing environments
  */
  var canvas = doc.getElementById("mainCanvas");
  var gl = webgl.init(canvas);
  modeler.shader = glShader.loadShader(gl,"shaders/phongSimple.vert","shaders/phongSimple.frag");
  
  /*
    setup windows
  */
  var mainWindow = new modelWindow();
  mainWindow.width = canvas.width;
  mainWindow.height = canvas.height;
  mainWindow.setOrtho(true);
  
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
      var currWindow = modeler.windows[i];
      gl.viewport(currWindow.x, currWindow.y, currWindow.width, currWindow.height);
      if(currWindow.camera.isPerspective) {
        //ortho width based on camera distance and an angle of PI/6.0;
        var w = window.camera.distance*0.267949;
        var h = currWindow.height/currWindow.width*w;
        mat4.ortho(modeler.pMatrix, -w,w, h,-h,.1,2000);
      } else {
        mat4.perspective(modeler.pMatrix, PI/6.0, currWindow.width/currWindow.height, .1, 2000);     
      }
      //set uniforms
      modeler.shader.uniforms.pMatrix.set(modeler.pMatrix);
      modeler.shader.uniforms.mvMatrix.set(currWindow.camera.cameraMatrix);
      modeler.shader.uniforms.nMatrix.set(currWindow.camera.nMatrix);
      
      modeler.shader.uniforms.ambientLightingColor.set([.2,.2,.2]);
      modeler.shader.uniforms.directionalDiffuseColor.set([.7,.7,.7]);
      modeler.shader.uniforms.specularColor.set([.2,.2,.2]);
      modeler.shader.uniforms.lightingDirection.set([.1,.1,.1]);
      modeler.shader.uniforms.materialShininess.set(2);
      

     modeler.shader.uniforms.matColor.set([.5,.5,.5,1.0]);
     for(var j=0, numObjects = modeler.objects.length; j<numObjects; ++j) {
        var obj = modeler.objects[j];
        modeler.shader.attribs.vertexPosition.set(obj.display.vertexBuffer);
        if(modeler.shader.attribs.vertexNormal && obj.display.normalsEnabled) {
          modeler.shader.attribs.vertexNormal.set(obj.display.normalBuffer);
        }
        if(modeler.shader.attribs.vertexColor && obj.display.colorsEnabled) {
          modeler.shader.attribs.vertexColor.set(obj.display.colorBuffer);
        }
        //kind of hacky solution on whether to use index buffer or not
        if(obj.type == modeler.SURFACE) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.display.indexBuffer);
          gl.drawElements(gl.TRIANGLES, obj.display.numIndices, gl.UNSIGNED_INT, 0);
        } else if(obj.type == modeler.CURVE || obj.type == modeler.LINE) {
          gl.drawArrays(gl.LINE_STRIP,0,obj.display.numIndices);
        } else {
          gl.drawArrays(gl.POINTS,0,obj.display.numIndices);
        }
      }
    }
  }
  
  modeler.runCommand = function(cmd) {
    
  }
  
  
  
  modeler.step();
  return modeler;
});
