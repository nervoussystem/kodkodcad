define(['domReady!','webgl','modelWindow','aabb','glShader', 'basicCurves','gl-matrix-min', 'vboMesh','pointer','intersect','exports'],function(doc,webgl,modelWindow,aabb,glShader,basicCurves, glMatrix, vboMesh,pointer,intersect,exports)
{
  "use strict";
  var mat4 = glMatrix.mat4;
  var vec4 = glMatrix.vec4;
  var vec3 = glMatrix.vec3;
  var modeler = exports;
  
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
  
  var previousPt = vec3.create();
  var selectedPt = vec3.create();
  modeler.pMatrix = mat4.create();
  
  var doRedraw = true;
  modeler.aabbTree = new aabb.AABBNode();
  
  /*
    setup drawing environments
  */
  var canvas = doc.getElementById("mainCanvas");
  var gl = webgl.init(canvas);
  modeler.gl = gl;
  modeler.shader = glShader.loadShader(gl,"shaders/phongSimple.vert","shaders/phongSimple.frag");
  var mouseHandler = new pointer(canvas);
  /*
    misc drawing stuff
  */
  var pointBuffer = gl.createBuffer();
  

  /*
    setup windows
  */
  var mainWindow = new modelWindow();
  mainWindow.width = canvas.width;
  mainWindow.height = canvas.height;
  mainWindow.setOrtho(true);
  modeler.windows.push(mainWindow);
  var currWindow = mainWindow;
  modeler.currWindow = mainWindow;
  
  modeler.step = function() {
    if(doRedraw) {
      modeler.redraw();
    }
    requestAnimationFrame(modeler.step);
    
  }
  
  modeler.init = function() {
    //var testObj = {};
    //testObj.type = modeler.CURVE;
    //testObj.display = vboMesh.create32(gl);
    var pts = [];
    for(var i=0;i<10;++i) {
      //vboMesh.addVertex(testObj.display,[Math.cos(Math.PI*2*i/20),Math.sin(Math.PI*2*i/20),0]);
      pts.push([Math.cos(Math.PI*2*i/10),Math.sin(Math.PI*2*i/10),i*.1]);
    }
    //vboMesh.buffer(testObj.display, gl);
    //modeler.objects.push(testObj);
    var testObj = basicCurves.curveFromPts(pts);
    testObj.updateMesh();
    modeler.objects.push(testObj);
    modeler.objects.push(basicCurves.circlePtRadius([0,1,0],1.3));
  }
  
  modeler.redraw = function() {
    if(!modeler.shader.isReady) { return; }
    modeler.shader.begin();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for(var i=0, numWindows = modeler.windows.length;i<numWindows; ++i) {
      //setup window camera
      var currWindow = modeler.windows[i];
      currWindow.camera.step();
      currWindow.camera.feed();
      gl.viewport(currWindow.x, currWindow.y, currWindow.width, currWindow.height);
      if(currWindow.camera.isPerspective) {
        mat4.perspective(modeler.pMatrix, Math.PI/6.0, currWindow.width/currWindow.height, .1, 2000);     
      } else {
        //ortho width based on camera distance and an angle of PI/6.0;
        var w = currWindow.camera.distance*0.267949;
        var h = currWindow.height/currWindow.width*w;
        mat4.ortho(modeler.pMatrix, -w,w, h,-h,.1,2000);
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
        obj.draw();
        /*
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
          modeler.shader.attribs.vertexNormal.disable();
          gl.vertexAttrib3fv(modeler.shader.attribs.vertexNormal.location,[0,0,0]);
          gl.drawArrays(gl.LINE_STRIP,0,obj.display.numVertices);
        } else {
          gl.drawArrays(gl.POINTS,0,obj.display.numVertices);
        }*/
      }
    }
    
    //draw selected point
    drawPoints(selectedPt);
    
    modeler.shader.end();
  }
  
  function drawPoints(pts) {
    //need to set shader state
    if(modeler.shader.attribs.vertexNormal) {
      modeler.shader.attribs.vertexNormal.disable();
      gl.vertexAttrib3fv(modeler.shader.attribs.vertexNormal.location,[0,0,0]);
    }
    if(modeler.shader.attribs.vertexColor) {
      modeler.shader.attribs.vertexColor.disable();
      gl.vertexAttrib3fv(modeler.shader.attribs.vertexColor.location,[0,0,0]);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER,pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STREAM_DRAW);
    modeler.shader.attribs.vertexPosition.set(pointBuffer);
    gl.drawArrays(gl.POINTS,0,pts.length/3);
  }
  
  modeler.runCommand = function(cmd) {
    
  }
  
  modeler.selectPoint = function(pt) {
    var ray = mouseRay();
    //snap
    var projMatrix = mat4.create();
    mat4.mul(projMatrix, currWindow.camera.cameraMatrix, modeler.pMatrix);
    for(var i=0;i<modeler.objects.length;++i) {
      var obj = modeler.objects[i];
      if(obj.type === modeler.CURVE) {
        //project to screen
        basicCurves.transform(obj, projMatrix);
        
      }
    }
    
    //if no snap project to plane
    intersect.rayPlane(pt,ray[0],ray[1], currWindow.plane);
  }
  
  var mouseRay = (function() {
    var pt1 = vec4.create();
    var pt2 = vec4.create();
    var invMatrix = mat4.create();
    var ray = [vec3.create(),vec3.create()];
    return function mouseRay() {
      var x = mouseHandler.mouseX;
      var y = mouseHandler.mouseY;
      var minDepth = 1e9,vbo;
      var pt = vec3.create();
      
      //get ray
      vec4.set(pt1, 2.0*x/currWindow.width-1.0, 1.0-2.0*y/currWindow.height,-1.0,1.0);
      vec4.set(pt2, 2.0*x/currWindow.width-1.0, 1.0-2.0*y/currWindow.height,1.0,1.0);
      mat4.invert(invMatrix, modeler.pMatrix);
      vec4.transformMat4(pt1, pt1, invMatrix);
      vec4.transformMat4(pt2, pt2, invMatrix);
      //pt1[2] = -1.0;
      pt1[3] = 0.0;
      //pt2[2] = -1.0;
      pt2[3] = 0.0;
      mat4.invert(invMatrix,currWindow.camera.cameraMatrix);
      vec4.transformMat4(pt1, pt1, invMatrix);
      vec4.transformMat4(pt2, pt2, invMatrix);
      vec3.sub(ray[1], pt1,pt2);
      vec3.normalize(ray[1], ray[1]);
      
      vec3.copy(ray[0], pt2);
      return ray;
    }
  })();
  
  modeler.selectObject = function() {
    var ray = mouseRay();
    var i0,i1,i2;
    var v0 = vec3.create(),
      v1 = vec3.create(),
      v2 = vec3.create();
    for(var i=0,l=vbo.numIndices;i<l;) {
      i0 = vbo.indexData[i++];
      i1 = vbo.indexData[i++];
      i2 = vbo.indexData[i++];
      vboMesh.getVertex(v0,vbo,i0);
      vboMesh.getVertex(v1,vbo,i1);
      vboMesh.getVertex(v2,vbo,i2);
        
        var intersection  = rayTriIntersect(camPos, ray, v0, v1, v2);
        if(intersection) {
            if(intersection[0] < minDepth) {
                minDepth = intersection[0];
                vec3.scale(pt,v1,intersection[1]);
                vec3.scaleAndAdd(pt,pt,v2,intersection[2]);
                vec3.scaleAndAdd(pt,pt,v0,1.0-intersection[1]-intersection[2]);
                if(norm) {
                  vboMesh.getNormal(v0,vbo,i0);
                  vboMesh.getNormal(v1,vbo,i1);
                  vboMesh.getNormal(v2,vbo,i2);
                  vec3.scale(norm,v1,intersection[1]);
                  vec3.scaleAndAdd(norm,norm,v2,intersection[2]);
                  vec3.scaleAndAdd(norm,norm,v0,1.0-intersection[1]-intersection[2]);                
                }
            }
        }
    }
    if(minDepth < 1e8)
        return pt;
    else return null;
  }
  
  /*
    mouse interactions
  */
  
  mouseHandler.mouseDragged = function(event) {
    if(mouseHandler.mouseButton == 3) {
      var dx = mouseHandler.mouseX-mouseHandler.pmouseX;
      var dy = mouseHandler.mouseY-mouseHandler.pmouseY;
      if(event.ctrlKey) {
        currWindow.camera.mouseZoom(dy);
      } else if(event.shiftKey) {
        currWindow.camera.mousePan(dx,dy);      
      } else {
        var rx = mouseHandler.mouseX-(currWindow.x+currWindow.width*0.5);
        var ry = mouseHandler.mouseY-(currWindow.y+currWindow.height*0.5);
        rx /= currWindow.width;
        ry /= currWindow.height;
        currWindow.camera.mouseRotate(dx,dy,rx,ry);
      }
    }
  }
  
  mouseHandler.mouseMoved = function(event) {
    modeler.selectPoint(selectedPt);
  }
  
  
  return modeler;
});
