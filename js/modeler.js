define(['domReady!','webgl','modelWindow','aabb','glShader', 'basicCurves','gl-matrix-min', 'vboMesh','pointer','intersect','exports'],function(doc,webgl,modelWindow,aabb,glShader,basicCurves, glMatrix, vboMesh,pointer,intersect,exports)
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
    variables
  */
  modeler.selection = [];
  modeler.objects = [];
  modeler.windows = [];
  modeler.modules = [];
  
  var previousPt = vec3.create();
  var selectedPt = vec3.create();
  modeler.selectedPt = selectedPt;
  modeler.pMatrix = mat4.create();
  
  
  var doRedraw = true;
  modeler.aabbTree = new aabb.AABBNode();
  
  var isSelectingPoint = false;
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
    loadCommands(basicCurves.commands);
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
    }
    
    //draw selected point
    if(isSelectingPoint) {
      drawPoints(selectedPt);
    }
    
    if(currCommand) {
      currCommand.preview(currCommand);
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
    var ray = mouseRay();
    
    //snap
    var snap = false;
    var projMatrix = mat4.create();
    mat4.mul(projMatrix, modeler.pMatrix,currWindow.camera.cameraMatrix);
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
        basicCurves.transform(obj, projMatrix);
        
        var u = basicCurves.projectToCurve2D(obj,mousePtH, testPt);
        basicCurves.transform(obj, invMatrix);
        //dehomogenize for distance test
        testPt[0] = (testPt[0]+1)*currWindow.width*0.5;
        testPt[1] = -(testPt[1]-1)*currWindow.height*0.5;
        var dist = vec2.sqrDist(testPt,mousePt);
        if(dist < minDist) {
          minDist = dist;
          basicCurves.evaluate(obj, u, pt);
          snap = true;
        }
        obj.updateMesh();
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
  
  modeler.selectObject = function() {
    var ray = mouseRay();
    var i0,i1,i2;
    var v0 = vec3.create(),
      v1 = vec3.create(),
      v2 = vec3.create();
    var minDepth = 9e9;

    var selDistSq = 100;
    var projMatrix = mat4.create();
    mat4.mul(projMatrix, modeler.pMatrix,currWindow.camera.cameraMatrix);
    var invMatrix = mat4.create();
    mat4.invert(invMatrix, projMatrix);

    var mousePtH = [mouseHandler.mouseX/currWindow.width*2-1,-mouseHandler.mouseY/currWindow.height*2+1,0];
    var mousePt = [mouseHandler.mouseX,mouseHandler.mouseY,0];
    var testPt = vec3.create();
    for(var i=0, len=modeler.objects.length;i<len;++i) {
      var obj = modeler.objects[i];
      if(obj.type == modeler.CURVE) {
        //check bounding box first
        
        //project to screen
        basicCurves.transform(obj, projMatrix);
        
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
          }
        }
        basicCurves.transform(obj, invMatrix);
      }
    }
    var closestObj;
    if(closestObj) {
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
      paramDiv.classList.add("param");
      
      tempDiv = document.createElement('div');
      tempDiv.classList.add("label");
      tempDiv.innerHTML = name;
      
      paramDiv.appendChild(tempDiv);
      
      if(param.isList) {
        tempDiv = document.createElement('div');
        tempDiv.classList.add("paramList");
        tempDiv.innerHTML = "<ul><li>add</li></ul>";
        
        tempDiv.addEventListener("click", (function (p,d) { return function() {getCmdParameter(p, d);} })(param,tempDiv), false);
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
          
          tempDiv.addEventListener("click", (function(p,d) {return function() {getCmdParameter(p, d);} })(param,tempDiv), false);
          tempDiv.addEventListener("change", (function(p,v) { return function() {setCmdParameter(p, this.value);} })(param), false);
          
          paramDiv.appendChild(tempDiv);
          
        } else {
          tempDiv = document.createElement('div');
          tempDiv.classList.add("paramInput");
          
          tempDiv.addEventListener("click", (function(p,d) {return function() {getCmdParameter(p, d);} })(param,tempDiv), false);
          paramDiv.appendChild(tempDiv);
        }
      }   
      cmdDiv.appendChild(paramDiv);
      
      //set parameter value
      if(param.default) {
        if(typeof(param.default) == "function") {
          param.value = param.default();
        } else {
          param.value = param.default;
        }
      } else {
        if(param.isList) {
          param.value = undefined;
        } else {
          param.value = undefined;
        }
      }
    }
    commandDiv.appendChild(cmdDiv);
    cmd.start();
    //check for preselection
    
    //start selecting first param
    getCmdParameter(cmd.parameters[firstParam],cmdDiv.children[1].children[1]);
  }
  
  function getCmdParameter(param, target) {
    //QUESTION: should I assert that param is member of currCommand
    
    //defocus previous parameter
    if(currParamDiv) {
      currParamDiv.classList.remove("focus");
    }
    
    target.classList.add("focus");
    target.focus();
    currParam = param;
    currParamDiv = target;

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
          target.innerHTML = pt[0].toFixed(3) + ", " + pt[1].toFixed(3) + ", " + pt[2].toFixed(3);
        }
        
        finishPointSelection  = function(pt) {
          param.value = vec3.clone(pt);
          //CHANGE: use option value for precision
          target.innerHTML = pt[0].toFixed(3) + ", " + pt[1].toFixed(3) + ", " + pt[2].toFixed(3);
          isSelectingPoint = false;
          nextParameter();
        }
      }
    } else if(param.type == "object") {
      
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
  }
  
  function setCmdParameter(param, val) {
    param.value = val;
  }

  /*
    mouse interactions
  */
  
  mouseHandler.mouseClicked = function(event) {
    //check status
    if(isSelectingPoint) {
      finishPointSelection(selectedPt);
    } else {
      var obj = modeler.selectObject();
      if(obj != null) {
        if(event.shiftKey) {        
          if(modeler.selection.indexOf(obj) == -1) {
            obj.selected = true;
            modeler.selection.push(obj);
          }
        } else if(event.ctrlKey) {
          var index = modeler.selection.indexOf(obj);
          if(index != -1) {
            modeler.selection.splice(index,1);
            obj.selected = false;
          }
        } else {
          for(var i=0, len = modeler.selection.length; i<len;++i) {
            modeler.selection[i].selected = false;
          }
          modeler.selection[0] = obj;
          modeler.selection.length = 1;
          obj.selected = true;
        }
      } else {
        for(var i=0, len = modeler.selection.length; i<len;++i) {
          modeler.selection[i].selected = false;
        }
        if(!event.shiftKey && !event.ctrlKey) {
          modeler.selection.length = 0;
        }
      }
    }
  }
  
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
    if(isSelectingPoint) {
      modeler.selectPoint(selectedPt);
      pointSelection(selectedPt);
      //do something with the point
      
    }
  }
  
  function keyPress(event) {
    switch(event.keyCode) {
      case 13:
        pressEnter();
        break;
      case 27:
        cancelCommand();
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
  
  function nextParameter() {
    isSelectingPoint = false;
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
  
  return modeler;
});
