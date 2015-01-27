define(['domReady!','webgl','modelWindow','aabb','glShader', 'basicCurves', 'surface', 'gl-matrix-min', 'vboMesh','pointer','intersect','exports'],function(doc,webgl,modelWindow,aabb,glShader,basicCurves, surface, glMatrix, vboMesh,pointer,intersect,exports)
{
  "use strict";
  var mat4 = glMatrix.mat4;
  var vec4 = glMatrix.vec4;
  var vec3 = glMatrix.vec3;
  var vec2 = glMatrix.vec2;
  var modeler = exports;
  
  //util
  Math.clamp = function(x,min,max) {
    return Math.max(min, Math.min(x,max));
  }
  /*
    CONSTANTS
  */
  modeler.POINT = 1;
  modeler.LINE = 2;
  modeler.CURVE = 4;
  modeler.SURFACE = 8;
  modeler.EPSILON = 1e-4;
  
  /*
    configuration
  */
  modeler.selectedColor = [1.0,1.0,0.0,1.0];
  modeler.units = "mm";
  
  /*
    variables
  */
  modeler.selection = [];
  modeler.objects = [];
  modeler.windows = [];
  modeler.modules = [];
  
  
  var previousPt = vec3.create();
  var selectedPt = vec3.create();
  modeler.selectedPt = selectedPt;
  
  
  var doRedraw = true;
  modeler.aabbTree = new aabb.AABBNode();
  
  var isSelectingPoint = false;
  var selectionFilter = 0;
  var isSelectingObjects = false;
  var isDragging = false;
  var mvMatrix = mat4.create();
  var pMatrix = mat4.create();
  
  function resetUIState() {
    isSelectingPoint = false;
    isSelectingObjects = false;
    isDragging = false;
    selectionFilter = 0;
    
  }
  
  function onSelect() {
  
  }
  
  function onDeselect() {
  
  }
  
  function finishPointSelection(pt) {
  }
  function pointSelection(pt) {
    
  }
  
  /*
    setup drawing environments
  */
  var canvas = doc.getElementById("mainCanvas");
  var commandDiv = doc.getElementById("command");
  var gl = webgl.init(canvas);
  
  vboMesh.setGL(gl);
  modeler.gl = gl;
  modeler.shader = glShader.loadShader(gl,"shaders/phongSimple.vert","shaders/phongSimple.frag");
  var mouseHandler;// = new pointer(canvas);
  /*
    misc drawing stuff
  */
  var pointBuffer = gl.createBuffer();
  

  /*
    setup windows
  */
  var currWindow;// = mainWindow;
  //modeler.currWindow = mainWindow;
  
  var currCommand;
  var currParam;
  var currParamDiv;
  
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
    document.addEventListener("keyup", keyPress, false);
    
    setupGL();
    
    loadCommands(basicCommands);
    loadCommands(basicCurves.commands);
    loadCommands(surface.commands);
    
    //make windows
    var windowDiv = document.getElementById("window1");
    var cWindow = new modelWindow(windowDiv);
    setWindowHandler(cWindow,windowDiv);
    modeler.windows.push(cWindow);
    modeler.currWindow = cWindow;

    windowDiv = document.getElementById("window2");
    cWindow = new modelWindow(windowDiv);
    cWindow.camera.lookAt([0,-10,0],[0,0,0],[0,0,1]);
    vec3.set(cWindow.plane,0,1,0);
    setWindowHandler(cWindow,windowDiv);
    modeler.windows.push(cWindow);
    
    windowDiv = document.getElementById("window3");
    cWindow = new modelWindow(windowDiv);
    cWindow.camera.lookAt([-10,0,0],[0,0,0],[0,0,1]);
    vec3.set(cWindow.plane,1,0,0);
    setWindowHandler(cWindow,windowDiv);
    modeler.windows.push(cWindow);

    windowDiv = document.getElementById("window4");
    cWindow = new modelWindow(windowDiv);
    cWindow.camera.lookAt([10,10,10],[0,0,0],[0,0,1]);
    setWindowHandler(cWindow,windowDiv);
    modeler.windows.push(cWindow);
    
    var pts = [];
    for(var i=0;i<10;++i) {
      //vboMesh.addVertex(testObj.display,[Math.cos(Math.PI*2*i/20),Math.sin(Math.PI*2*i/20),0]);
      pts.push([Math.cos(Math.PI*2*i/10),Math.sin(Math.PI*2*i/10),i*.1]);
    }
    //vboMesh.buffer(testObj.display, gl);
    //modeler.objects.push(testObj);
    var testObj = basicCurves.curveFromPts(pts);
    modeler.objects.push(testObj);
    modeler.objects.push(basicCurves.circlePtRadius([0,1,0],1.3));
  }
  
  function setupGL() {
    //gl.enable(gl.BLEND);
    //gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  
  function setWindowHandler(window, div) {
    var windowMouse = new pointer(div);
    window.mouseHandler = windowMouse;
    div.addEventListener('hover', function(event) { currWindow = modeler.currWindow = window; }, false);
    windowMouse.mouseDragged = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseDragged(event);};
    windowMouse.mouseDragStart = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseDragStart(event);};
    windowMouse.mouseClicked = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseClicked(event);};
    windowMouse.mouseDown = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseDown(event);};
    windowMouse.mouseUp = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseUp(event);};
    
    windowMouse.mouseMoved = function(event) {currWindow = modeler.currWindow = window; mouseHandler = window.mouseHandler; mouseMoved(event);};
  }
  
  modeler.redraw = function() {
    if(!modeler.shader.isReady) { return; }
    modeler.shader.begin();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    for(var i=0, numWindows = modeler.windows.length;i<numWindows; ++i) {
      //setup window camera
      var currWindow = modeler.windows[i];
      currWindow.camera.step();
      currWindow.camera.feed();
      gl.viewport(currWindow.x, canvas.height-currWindow.y-currWindow.height, currWindow.width, currWindow.height);
      if(currWindow.camera.isPerspective) {
        mat4.perspective(currWindow.pMatrix, Math.PI/6.0, currWindow.width/currWindow.height, .1, 2000);     
      } else {
        //ortho width based on camera distance and an angle of PI/6.0;
        var w = currWindow.camera.distance*0.267949;
        var h = currWindow.height/currWindow.width*w;
        mat4.ortho(currWindow.pMatrix, -w,w, h,-h,.1,2000);
      }
      //set uniforms
      mat4.copy(pMatrix,currWindow.pMatrix);
      mat4.copy(mvMatrix,currWindow.camera.cameraMatrix);
      
      modeler.shader.uniforms.pMatrix.set(pMatrix);
      modeler.shader.uniforms.mvMatrix.set(mvMatrix);
      modeler.shader.uniforms.nMatrix.set(currWindow.camera.nMatrix);
      
      modeler.shader.uniforms.ambientLightingColor.set([.2,.2,.2]);
      modeler.shader.uniforms.directionalDiffuseColor.set([.7,.7,.7]);
      modeler.shader.uniforms.specularColor.set([.2,.2,.2]);
      modeler.shader.uniforms.lightingDirection.set([.1,.1,.9]);
      modeler.shader.uniforms.materialShininess.set(2);
      

     modeler.shader.uniforms.matColor.set([.5,.5,.5,1.0]);
     for(var j=0, numObjects = modeler.objects.length; j<numObjects; ++j) {
      //do bounding box culling
      
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
      
      //draw selected point
      if(isSelectingPoint) {
        drawPoints(selectedPt);
      }
      
      if(currCommand) {
        currCommand.preview(currCommand);
      }

    }
    
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
    
  modeler.selectPoint = function(pt) {
    var ray = mouseRay(mouseHandler.mouseX,mouseHandler.mouseY);
    
    //snap
    var snap = false;
    var projMatrix = mat4.create();
    mat4.mul(projMatrix, currWindow.pMatrix,currWindow.camera.cameraMatrix);
    var invMatrix = mat4.create();
    mat4.invert(invMatrix, projMatrix);

    //near
    //snapping distance
    var minDist = 100; //10 pixels
    //homogenize mouse coordinates
    var mousePtH = [mouseHandler.mouseX/currWindow.width*2-1,-mouseHandler.mouseY/currWindow.height*2+1,0];
    var mousePt = [mouseHandler.mouseX,mouseHandler.mouseY,0];
    var testPt = vec3.create();
    for(var i=0;i<modeler.objects.length;++i) {
      var obj = modeler.objects[i];
      if(obj.type == modeler.CURVE) {
        //check bounding box first
        
        //project to screen
        //basicCurves.transform(obj, projMatrix);
        //let's make things more object oriented
        obj.transform(projMatrix);
        
        var u = basicCurves.projectToCurve2D(obj,mousePtH, testPt);
        //basicCurves.transform(obj, invMatrix);
        obj.transform(invMatrix);
        //dehomogenize for distance test
        testPt[0] = (testPt[0]+1)*currWindow.width*0.5;
        testPt[1] = -(testPt[1]-1)*currWindow.height*0.5;
        var dist = vec2.sqrDist(testPt,mousePt);
        if(dist < minDist) {
          minDist = dist;
          basicCurves.evaluate(obj, u, pt);
          snap = true;
        }
      }
    }
    
    //if no snap project to plane
    if(!snap) {
      intersect.rayPlane(pt,ray[0],ray[1], currWindow.plane);
    }
  }
  
  var mouseRay = (function() {
    var pt1 = vec4.create();
    var pt2 = vec4.create();
    var invMatrix = mat4.create();
    var ray = [vec3.create(),vec3.create()];
    return function mouseRay(x,y) {
      var minDepth = 1e9,vbo;
      var pt = vec3.create();
      
      //get ray
      vec4.set(pt1, 2.0*x/currWindow.width-1.0, 1.0-2.0*y/currWindow.height,-1.0,1.0);
      vec4.set(pt2, 2.0*x/currWindow.width-1.0, 1.0-2.0*y/currWindow.height,1.0,1.0);
      mat4.invert(invMatrix, currWindow.pMatrix);
      vec4.transformMat4(pt1, pt1, invMatrix);
      vec4.transformMat4(pt2, pt2, invMatrix);
      //pt1[2] = -1.0;
      pt1[3] = 1.0;
      //pt2[2] = -1.0;
      pt2[3] = 1.0;
      mat4.invert(invMatrix,currWindow.camera.cameraMatrix);
      vec4.transformMat4(pt1, pt1, invMatrix);
      vec4.transformMat4(pt2, pt2, invMatrix);
      vec3.sub(ray[1], pt1,pt2);
      vec3.normalize(ray[1], ray[1]);
      
      vec3.copy(ray[0], pt2);
      return ray;
    }
  })();
   
  var raySrfIntersection = function(out, ray, srf) {
    var i;
    var i1,i2,i3;
    var p1 = vec3.create(),
        p2 = vec3.create(),
        p3 = vec3.create();
    var inter;
    var minDepth = 9e9;
    var interFound = false;
    for(var i=0;i<srf.display.numIndices;) {
      i1 = srf.display.indexData[i++];
      i2 = srf.display.indexData[i++];
      i3 = srf.display.indexData[i++];
      vboMesh.getVertex(p1, srf.display, i1);
      vboMesh.getVertex(p2, srf.display, i2);
      vboMesh.getVertex(p3, srf.display, i3);
      
      inter = intersect.rayTriangle(ray[0], ray[1], p1, p2, p3);
      if(inter) {
        if(inter[0] < minDepth) {
          minDepth = inter[0];
          vec3.scale(out, p1, inter[1]);
          vec3.scaleAndAdd(out, out, p2, inter[2]);
          vec3.scaleAndAdd(out, out, p3, 1-inter[1]-inter[2]);
          interFound = true;
        }
      }
    }
    return interFound;
  }
  
  modeler.selectObject = function() {
    var ray = mouseRay(mouseHandler.mouseX,mouseHandler.mouseY);
    var i0,i1,i2;
    var v0 = vec3.create(),
      v1 = vec3.create(),
      v2 = vec3.create();
    var minDepth = 9e9;

    var selDistSq = 100;
    var projMatrix = mat4.create();
    mat4.mul(projMatrix, currWindow.pMatrix,currWindow.camera.cameraMatrix);
    var invMatrix = mat4.create();
    mat4.invert(invMatrix, projMatrix);

    var mousePtH = [mouseHandler.mouseX/currWindow.width*2-1,-mouseHandler.mouseY/currWindow.height*2+1,0];
    var mousePt = [mouseHandler.mouseX,mouseHandler.mouseY,0];
    var windowPt = vec2.create();
    var testPt = vec3.create();
    var minPt = vec3.create();
    
    //should get candidate objects and sort by depth
    for(var i=0, len=modeler.objects.length;i<len;++i) {
      var obj = modeler.objects[i];
      if(obj.type == modeler.CURVE) {
        //check bounding box first
        
        //project to screen
        //basicCurves.transform(obj, projMatrix);
        if(obj.mode === 0) {
          obj.transform(projMatrix);
          
          var u = basicCurves.projectToCurve2D(obj,mousePtH, testPt);
          //dehomogenize for distance test
          testPt[0] = (testPt[0]+1)*currWindow.width*0.5;
          testPt[1] = -(testPt[1]-1)*currWindow.height*0.5;
          var dist = vec2.sqrDist(testPt,mousePt);
          if(dist < selDistSq) {
            basicCurves.evaluate(obj, u, testPt);
            if(testPt[2] > -1 && testPt[2] < minDepth) {
              closestObj = obj;
              minDepth = testPt[2];
              vec3.copy(minPt, testPt);
            }
          }
          //basicCurves.transform(obj, invMatrix);
          obj.transform(invMatrix);
        } else if(obj.mode === 1) {
          for(var j=0;j<obj.controlPts.length;++j) {
            vec4.projectDown(obj.controlPts[j].pt, testPt);
            vec3.transformMat4(testPt, testPt,projMatrix);
            if(testPt[2] > -1 && testPt[2] < minDepth) {
              windowPt[0] = (testPt[0]+1)*currWindow.width*0.5;
              windowPt[1] = -(testPt[1]-1)*currWindow.height*0.5;
              if(vec2.sqrDist(windowPt, mousePt) < selDistSq) {
                closestObj = obj.controlPts[j];
                minDepth = testPt[2];
                vec3.copy(minPt, testPt);
              }            
            }
          }
        }
      } else if(obj.type == modeler.SURFACE) {
        if(raySrfIntersection(testPt, ray, obj)) {
          if(testPt[2] > -1 && testPt[2] < minDepth) {
            closestObj = obj;
            minDepth = testPt[2];
            vec3.transformMat4(minPt,testPt,projMatrix);
          }
        }
      }
    }
    var closestObj;
    if(closestObj) {
      vec3.transformMat4(selectedPt, minPt, invMatrix);
        return closestObj;
    } else return null;
  }
  
  
  
  function loadCommands(cmds) {
    var cmdDiv = document.getElementById('commands');
    //CHANGE: avoid redraw for each command
    for(var i=0,len=cmds.length;i<len;++i) {
      var cmd = cmds[i];

      var newButton = document.createElement('div');
      newButton.classList.add('commandButton');
      newButton.addEventListener('click', (function(c) {return function() {runCommand(c);} })(cmd) , false);
      newButton.innerHTML = cmd.name;
      cmdDiv.appendChild(newButton);
    }
  }
  
  function cancelCommand() {
    //close command window
    isSelectingPoint = false;    
    currCommand = undefined;
    currParam = undefined;
    commandDiv.innerHTML = "";
  }
  
  function runCommand(cmd) {
    cancelCommand();
    currCommand = cmd;
    //setup gui
    commandDiv.innerHTML = "";
    //put everything in here to avoid multiple draws
    var cmdDiv = document.createElement('div');
    cmdDiv.classList.add("command");
    var tempDiv, innerDiv;
    tempDiv = document.createElement('div');
    tempDiv.classList.add("name");
    tempDiv.innerHTML = cmd.name;
    cmdDiv.appendChild(tempDiv);
    
    var paramDiv;
    var firstParam = undefined;
    for(var name in cmd.parameters) {
      var param = cmd.parameters[name];
      if(firstParam === undefined) { firstParam = name; }
      
      paramDiv = document.createElement('div');
      makeParamUI(param, name, paramDiv);
      cmdDiv.appendChild(paramDiv);
      
      //set parameter value
      if(param.default) {
        if(typeof(param.default) == "function") {
          param.value = param.default();
        } else {
          param.value = param.default;
        }
      } else {
        param.value = undefined;
      }
    }
    commandDiv.appendChild(cmdDiv);
    cmd.start();
    //check for preselection
    
    //start selecting first param
    getCmdParameter(cmd.parameters[firstParam],cmdDiv.children[1].children[1]);
  }
  
  function makeParamUI(param, paramName, paramDiv) {
    paramDiv.classList.add("param");
    
    var tempDiv = document.createElement('div');
    tempDiv.classList.add("label");
    tempDiv.innerHTML = paramName;
    
    paramDiv.appendChild(tempDiv);

    if(param.isList) {
      tempDiv = document.createElement('div');
      tempDiv.classList.add("paramList");
      tempDiv.innerHTML = "<ul><li>add</li></ul>";
      
      tempDiv.addEventListener("click", function() {getCmdParameter(param, tempDiv);}, false);
      paramDiv.appendChild(tempDiv);
    } else {
      if(param.type == "number" || param.type == "integer") {
        tempDiv = document.createElement('input');
        tempDiv.type = "text";
        tempDiv.classList.add("paramInput");
        if(param.default) {
          if(typeof(param.default) == "function") {
            tempDiv.value = param.default();
          } else {
            tempDiv.value = param.default;
          }
        }
        
        tempDiv.addEventListener("click", function() {getCmdParameter(param, tempDiv);}, false);
        tempDiv.addEventListener("change", function() {setCmdParameter(param, this.value);}, false);
        
        paramDiv.appendChild(tempDiv);
        
      } else {
        tempDiv = document.createElement('div');
        tempDiv.classList.add("paramInput");
        
        tempDiv.addEventListener("click", function() {getCmdParameter(param, tempDiv);}, false);
        paramDiv.appendChild(tempDiv);
      }
    }
  }
  
  function getCmdParameter(param, target) {
    //QUESTION: should I assert that param is member of currCommand
    
    //defocus previous parameter
    if(currParamDiv) {
      currParamDiv.classList.remove("focus");
    }
    
    currParam = param;

    if(param.type == "point") {
      isSelectingPoint = true;
      if(param.isList) {
        param.value = [];
        
        pointSelection  = function(pt) {
          //param.value[param.value.length-1] = pt;          
        }
        
        finishPointSelection  = function(pt) {
          param.value.push(vec3.clone(pt) );
          //param.value.push(selectedPt);

          var listItem = document.createElement('li');
          //CHANGE: use option value for precision
          listItem.innerHTML = pt[0].toFixed(3) + ", " + pt[1].toFixed(3) + ", " + pt[2].toFixed(3);
          target.children[0].appendChild(listItem);
        }
      //not a list
      } else {
        pointSelection  = function(pt) {
          param.value = pt;
          //CHANGE: use option value for precision          
          if(target) {
            target.innerHTML = pt[0].toFixed(3) + ", " + pt[1].toFixed(3) + ", " + pt[2].toFixed(3);
          }
        }
        
        finishPointSelection  = function(pt) {
          param.value = vec3.clone(pt);
          //CHANGE: use option value for precision
          if(target) {target.innerHTML = pt[0].toFixed(3) + ", " + pt[1].toFixed(3) + ", " + pt[2].toFixed(3);}
          isSelectingPoint = false;
          nextParameter();
        }
      }
    } else if(param.type == "object") {
      selectionFilter = param.filter;
      if(param.isList) {
        //NOT THE MOST EFFICIENT, COULD REPRODUCE THE FUNCTIONALITY OF SELECTION FOR PARAM
        onSelect = function() {
          param.value = modeler.selection.slice(0);
        }
        onDeselect = function(obj) {
          param.value = modeler.selection.slice(0);
        }
        
      } else {
        onSelect = function(obj) {
          deselectAll();
          nextParameter();
        }

      }
    } else if(param.type == "number") {
      if(param.fromPt) {
        isSelectingPoint = true;
        pointSelection  = function(pt) {
          param.value = param.fromPt(pt,currCommand);
          //CHANGE: use option value for precision
          //target.value = param.value;
        }
        
        finishPointSelection  = function(pt) {
          isSelectingPoint = false;
          target.value = param.value;
          nextParameter();
        }
      }
    }
    
    //ui stuff
    if(target) {
      target.classList.add("focus");
      target.focus();
      currParamDiv = target;
    }
  }
  
  function setCmdParameter(param, val) {
    param.value = val;
  }

  function deselectAll() {
    for(var i=0, len = modeler.selection.length; i<len;++i) {
      modeler.selection[i].selected = false;
    }
    modeler.selection.length = 0;
    onDeselect();
  }
  /*
    mouse interactions
  */

  var mouseClicked = function(event) {
  /*
    //check status
    if(!isSelectingPoint) {
      var obj = modeler.selectObject();
      if(obj != null) {
        if(event.shiftKey) {
          if(modeler.selection.indexOf(obj) == -1) {
            obj.selected = true;
            modeler.selection.push(obj);
          }
          onSelect(obj);
        } else if(event.ctrlKey) {
          var index = modeler.selection.indexOf(obj);
          if(index != -1) {
            modeler.selection.splice(index,1);
            obj.selected = false;
          }
          onDeselect();
        } else {
          for(var i=0, len = modeler.selection.length; i<len;++i) {
            modeler.selection[i].selected = false;
          }
          modeler.selection[0] = obj;
          modeler.selection.length = 1;
          obj.selected = true;
          onSelect(obj);
        }
      } else {
        if(!event.shiftKey && !event.ctrlKey) {
          deselectAll();
        }
      }
    }*/
  }
  
  var mouseUp = function(event) {
    if(isSelectingPoint && mouseHandler.mouseDragging) {
      finishPointSelection(selectedPt);
    }
  }
    
  var mouseDown = function(event) {
    //check status
    if(isSelectingPoint) {
      finishPointSelection(selectedPt);
    } else {
      if(mouseHandler.mouseButton == 1) {
        var obj = modeler.selectObject();
        if(obj != null) {
          if(event.shiftKey) {
            if(modeler.selection.indexOf(obj) == -1) {
              obj.selected = true;
              modeler.selection.push(obj);
            }
            onSelect(obj);
          } else if(event.ctrlKey) {
            var index = modeler.selection.indexOf(obj);
            if(index != -1) {
              modeler.selection.splice(index,1);
              obj.selected = false;
            }
            onDeselect();
          } else {
            for(var i=0, len = modeler.selection.length; i<len;++i) {
              modeler.selection[i].selected = false;
            }
            modeler.selection[0] = obj;
            modeler.selection.length = 1;
            obj.selected = true;
            onSelect(obj);
          }
        } else {
          if(!event.shiftKey && !event.ctrlKey) {
            deselectAll();
          }
        }
      }
    }
  }
  
  var mouseDragged = function(event) {
    if(mouseHandler.mouseButton == 3) {
      var dx = mouseHandler.mouseX-mouseHandler.pmouseX;
      var dy = mouseHandler.mouseY-mouseHandler.pmouseY;
      if(event.ctrlKey) {
        currWindow.camera.mouseZoom(dy);
      } else if(event.shiftKey) {
        currWindow.camera.mousePan(dx,dy);      
      } else {
        var rx = mouseHandler.mouseX-(currWindow.width*0.5);
        var ry = mouseHandler.mouseY-(currWindow.height*0.5);
        rx /= currWindow.width;
        ry /= currWindow.height;
        currWindow.camera.mouseRotate(dx,dy,rx,ry);
      }
    }
  }
  
  var mouseDragStart = function(event) {
    if(mouseHandler.mouseButton == 1) {
      if(modeler.selection.length > 0 && !currCommand) {
        cancelCommand();
        currCommand = dragCommand;
        dragCommand.start();
        
        dragCommand.parameters.objects.value = modeler.selection.slice(0);
        dragCommand.parameters.startPt.value = vec3.clone(selectedPt);
        getCmdParameter(dragCommand.parameters.endPt,null);

      }
    }
  }
  
  var mouseMoved = function(event) {
    if(isSelectingPoint) {
      modeler.selectPoint(selectedPt);
      pointSelection(selectedPt);
      //do something with the point
    } else if(isDragging) {
      
    }
  }
  
  function keyPress(event) {
    switch(event.keyCode) {
      case 13:
        pressEnter();
        break;
      case 27:
        if(currCommand) {
          cancelCommand();
        } else if(modeler.selection.length > 0){
          deselectAll();
        } else {
          for(var i=0;i<modeler.objects.length;++i) {
            modeler.objects[i].disableEditMode();
          }
        }
        break;
    }
  }
  
  function pressEnter() {
    if(currCommand) {
      if(currParam && currParam.isList) {
        nextParameter();
      } else {
        var isDone = true;
        for(var key in currCommand.parameters) {
          if(currCommand.parameters[key].value === undefined) {
            isDone = false;
          }
        }
        if(isDone) {
          finishCommand();
        } else {
          nextParameter();
        }
      }
      //check if all parameters are filled
      //go to next param
      
      //find next unfilled param
      
    }
  }
  
  function clearSelectionEvents() {
    isSelectingPoint = false;
    onSelect = function() {};
    onDeselect = function() {};
    finishPointSelection = function() {};
    pointSelection = function() {};
    deselectAll();
  }
  
  function nextParameter() {
    //clear selection events
    clearSelectionEvents();
    var firstEmpty;
    var firstEmptyI;
    var currParamFound = false;
    var i=0;
    for(var key in currCommand.parameters) {    
      //check if empty
      if(currCommand.parameters[key].value === undefined) {
        if(!currParamFound) {
          if(firstEmpty === undefined) {
            firstEmpty = currCommand.parameters[key];
            firstEmptyI = i;
          }
        } else {
          var paramDiv = commandDiv.children[0].children[i+1].children[1];
          getCmdParameter(currCommand.parameters[key],paramDiv);
          return;
        }
      }
      if(currCommand.parameters[key] === currParam) {
        currParamFound = true;
      }
      i++;
    }
    if(firstEmpty === undefined) {
      finishCommand();
    } else {
      var paramDiv = commandDiv.children[firstEmptyI+1].children[1];
      getCmdParameter(firstEmpty,paramDiv);
    }
  }
  
  function finishCommand() {
    isSelectingPoint = false;
    currCommand.finish(currCommand);
    currCommand = undefined;
    currParam = undefined;
    commandDiv.innerHTML = "";
  }
  
  var dragCommand = 
  {
  "name":"Drag",
  "parameters": {
    "objects" :
     {"type": "object",
      "isList": true},
    "startPt" : 
      {"type": "point"},
    "endPt" :
      {"type": "point"}
    },
  "start" : function(cmd) {
    //check for valid input?
  },
  "preview" : function(cmd) {
    var endPt = cmd.parameters.endPt.value;
    if(endPt) {
      var objs = cmd.parameters.objects.value;
      var i,len = objs.length;
      //get transformation
      var transform = mat4.create();
      var invMatrix = mat4.create();
      mat4.identity(transform);
      var endPt = cmd.parameters.endPt.value;
      var startPt = cmd.parameters.startPt.value;
      var dir = vec3.create();
      vec3.sub(dir,endPt,startPt);
      
      mat4.translate(transform, mvMatrix, dir);
      modeler.shader.uniforms.mvMatrix.set(transform);
      mat4.invert(invMatrix, transform);
      for(i=0;i<len;++i) {
        objs[i].draw();
        
      }
      modeler.shader.uniforms.mvMatrix.set(mvMatrix);
    }
  },
  "finish" : function(cmd) {
    var objs = cmd.parameters.objects.value;
    var i,len = objs.length;
    //get transformation
    var transform = mat4.create();
    mat4.identity(transform);
    var endPt = cmd.parameters.endPt.value;
    var startPt = cmd.parameters.startPt.value;
    var dir = vec3.create();
    vec3.sub(dir,endPt,startPt);
    mat4.translate(transform, transform, dir);
    for(i=0;i<len;++i) {
      objs[i].transform(transform);
    }
  }
  };
  
  var basicCommands = [
  {
  "name":"Move",
  "parameters": {
    "objects" :
     {"type": "object",
      "isList": true},
    "startPt" : 
      {"type": "point"},
    "endPt" :
      {"type": "point"}
    },
  "start" : function(cmd) {
    //check for valid input?
  },
  "preview" : function(cmd) {
    var endPt = cmd.parameters.endPt.value;
    if(endPt) {
      var objs = cmd.parameters.objects.value;
      var i,len = objs.length;
      //get transformation
      var transform = mat4.create();
      mat4.identity(transform);
      var endPt = cmd.parameters.endPt.value;
      var startPt = cmd.parameters.startPt.value;
      //creation is bad
      var dir = vec3.create();
      vec3.sub(dir,endPt,startPt);
      
      mat4.translate(transform, currWindow.camera.cameraMatrix, dir);
      modeler.shader.uniforms.mvMatrix.set(transform);
      for(i=0;i<len;++i) {
        objs[i].draw();
        
      }
      modeler.shader.uniforms.mvMatrix.set(currWindow.camera.cameraMatrix);
    }
  },
  "finish" : function(cmd) {
    var objs = cmd.parameters.objects.value;
    var i,len = objs.length;
    //get transformation
    var transform = mat4.create();
    mat4.identity(transform);
    var endPt = cmd.parameters.endPt.value;
    var startPt = cmd.parameters.startPt.value;
    vec3.sub(endPt,endPt,startPt);
    mat4.translate(transform, transform, endPt);
    for(i=0;i<len;++i) {
      objs[i].transform(transform);
    }
  }
  },
  {
  "name":"Copy",
  "parameters": {
    "objects" :
     {"type": "object",
      "isList": true},
    "startPt" : 
      {"type": "point"},
    "endPt" :
      {"type": "point"}
    },
  "start" : function(cmd) {
    //check for valid input?
  },
  "preview" : function(cmd) {
    var endPt = cmd.parameters.endPt.value;
    if(endPt) {
      var objs = cmd.parameters.objects.value;
      var i,len = objs.length;
      //get transformation
      var transform = mat4.create();
      mat4.identity(transform);
      var endPt = cmd.parameters.endPt.value;
      var startPt = cmd.parameters.startPt.value;
      //creation is bad
      var dir = vec3.create();
      vec3.sub(dir,endPt,startPt);
      
      mat4.translate(transform, currWindow.camera.cameraMatrix, dir);
      modeler.shader.uniforms.mvMatrix.set(transform);
      for(i=0;i<len;++i) {
        objs[i].draw();
        
      }
      modeler.shader.uniforms.mvMatrix.set(currWindow.camera.cameraMatrix);
    }
  },
  "finish" : function(cmd) {
    var objs = cmd.parameters.objects.value;
    var i,len = objs.length;
    //get transformation
    var transform = mat4.create();
    mat4.identity(transform);
    var endPt = cmd.parameters.endPt.value;
    var startPt = cmd.parameters.startPt.value;
    vec3.sub(endPt,endPt,startPt);
    mat4.translate(transform, transform, endPt);
    for(i=0;i<len;++i) {
      //check type
      var obj = objs[i];
      //not a sub object
      if(obj.obj === undefined) {
        //make a copy
        var newObj = obj.clone();
        newObj.transform(transform);
        modeler.objects.push(newObj);
      }
    }
  }
  },
  {
  "name":"Rotate",
  "parameters": {
    "objects" :
     {"type": "object",
      "isList": true},
    "center" : 
      {"type": "point"},
    "angle" :
      {"type": "number"},
    "plane" :
      {"default" : function() { return modeler.currWindow.plane;}}
    },
  "start" : function(cmd) {
    //check for valid input?
  },
  "preview" : function(cmd) {
    var angle = cmd.parameters.angle.value;
    var center = cmd.parameters.center.value;
    var plane = cmd.parameters.plane.value;
    if(angle !== undefined) {
      var objs = cmd.parameters.objects.value;
      var i,len = objs.length;
      //get transformation
      var transform = mat4.create();
      mat4.identity(transform);
      //center
      mat4.translate(transform, currWindow.camera.cameraMatrix, center);
      mat4.rotate(transform, transform, angle, plane);
      vec3.negate(center,center);
      mat4.translate(transform, transform, center);
      modeler.shader.uniforms.mvMatrix.set(transform);
      vec3.negate(center,center);
      for(i=0;i<len;++i) {
        objs[i].draw();
      }
      modeler.shader.uniforms.mvMatrix.set(currWindow.camera.cameraMatrix);
    }
  },
  "finish" : function(cmd) {
    var objs = cmd.parameters.objects.value;

    var angle = cmd.parameters.angle.value;
    var center = cmd.parameters.center.value;
    var plane = cmd.parameters.plane.value;

    var i,len = objs.length;
    //get transformation
    var transform = mat4.create();
    mat4.identity(transform);
      //center
    mat4.translate(transform, transform, center);
    mat4.rotate(transform, transform, angle, plane);
    vec3.negate(center,center);
    mat4.translate(transform, transform, center);
    vec3.negate(center,center);
    for(i=0;i<len;++i) {
      objs[i].transform(transform);
    }
  }
  },
  {
  "name":"EditModeOn",
  "parameters": {
    "objects" :
     {"type": "object",
      "isList": true},
    },
  "start" : function(cmd) {
    //check for valid input?
  },
  "preview" : function(cmd) {
  },
  "finish" : function(cmd) {
    var objs = cmd.parameters.objects.value;
    var i, len = objs.length;
    for(i=0;i<len;++i) {
      objs[i].enableEditMode();
    }
  }
  }  
  ];
  return modeler;
});
