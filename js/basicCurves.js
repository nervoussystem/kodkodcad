define(["nurbs","modeler", "gl-matrix-min", "vboMesh","aabb", "controlPt", 'exports'],function(nurbs, modeler, glMatrix, vboMesh, aabb, ControlPt, exports) {
  "use strict";
  var vec3 = glMatrix.vec3;
  var vec4 = glMatrix.vec4;
  var basicCurves = exports;
  
  var Curve = function() {
    this.type = modeler.CURVE;
    this.display = vboMesh.create(modeler.gl,false);
    this.rep = null;
    this.aabb = new aabb.AABBNode();
    this.isClosed = false;
    this.mode = 0;
    this.needsUpdate = true;
    this.controlPts = [];
    //color / material / layer info
  }
  
  Curve.prototype.draw = function() {
    if(this.needsUpdate) {
      this.updateMesh();
    }
    //disable normals
    modeler.shader.attribs.vertexNormal.disable();
    modeler.gl.vertexAttrib3fv(modeler.shader.attribs.vertexNormal.location,[0,0,0]);
    //do color
    if(this.selected) {
      //modeler.selectedColor
      modeler.shader.uniforms.matColor.set(modeler.selectedColor);
    } else {
      modeler.shader.uniforms.matColor.set([0.0,0.0,0.0,1.0]);
    }
    
    
    var numControlPts = this.rep.controlPts.length;
    modeler.shader.attribs.vertexPosition.set(this.display.vertexBuffer);
    
    modeler.gl.drawArrays(modeler.gl.LINE_STRIP,numControlPts,this.display.numVertices-numControlPts);
    
    //draw control points
    if(this.mode == 1) {
      modeler.shader.uniforms.matColor.set([0.8,0.8,0.8,0.9]);
      modeler.gl.drawArrays(modeler.gl.LINE_STRIP,0,numControlPts);
      for(var i=0;i<numControlPts;++i) {
        var pt = this.controlPts[i];
        if(pt.selected) {
          modeler.shader.uniforms.matColor.set(modeler.selectedColor);        
        } else {
          modeler.shader.uniforms.matColor.set([0.0,0.0,0.0,1.0]);        
        }
        modeler.gl.drawArrays(modeler.gl.POINTS,i,1);      
      
      }
    }
  }
  
  Curve.prototype.updateMesh = (function() {
    var pt = vec3.create();
    return function updateMesh() {
      vboMesh.clear(this.display);
      //first add control pts
      
      var controlPts = this.rep.controlPts;
      var numControlPts = controlPts.length;
      for(var i=0;i<numControlPts;++i) {
        vec4.projectDown(controlPts[i],pt);
        vboMesh.addVertex(this.display, pt);
      }
      //add adaptive detail
      var domain = nurbs.domain(this.rep);
      var samples = this.rep.controlPts.length*5;
      var u;
      var domainSpan = domain[1]-domain[0];
      
      for(var i=0;i<=samples;++i) {
        u = domain[0]+i/samples*domainSpan;
        nurbs.evaluateCrv(this.rep, u, pt);
        vboMesh.addVertex(this.display,pt);
      }
      vboMesh.buffer(this.display,modeler.gl);
    }
  })();
  
  Curve.prototype.transform = function(mat) {
    var len = this.rep.controlPts.length;
    if(this.isClosed) {
      len -= 1;
    }
    for(var i=0;i<len;++i) {
      var pt = this.rep.controlPts[i];
      vec4.projectDown(pt,pt);
      vec3.transformMat4(pt, pt, mat);
      vec4.unprojectDown(pt,pt);
    }
    this.needsUpdate = true;
  }
  
  Curve.prototype.enableEditMode = function() {
    if(this.mode === 0) {
      for(var i=0;i<this.rep.controlPts.length;++i) {
        this.controlPts.push(new ControlPt(this, this.rep.controlPts[i]));
      }
      this.mode = 1;
    }    
  }
  
  Curve.prototype.disableEditMode = function() {
    //remove any control pts from selection
    for(var i=0;i<this.controlPts.length;++i) {
      var pt = this.controlPts[i];
      var index = modeler.selection.indexOf(pt);
      if(index >= 0) {
        modeler.selection.splice(index,1);
      }
    }
    this.controlPts.length = 0;
    this.mode = 0;
  }  
  var commands = [
    {
    "name":"Circle",
    "parameters": {
        "center" :
         {"type": "point"},
        "radius" : 
          {"type": "number",
          "fromPt": function(pt,cmd) {
            if(cmd.parameters.center.value) {
              var center = cmd.parameters.center.value;
              //project pt to plane
              var dir = vec3.create();
              vec3.sub(dir, pt, center);
              var dist = vec3.sqrDist(pt,center);
              var perpDist = vec3.dot(cmd.parameters.plane.value, dir);
              return Math.sqrt(dist-perpDist*perpDist);
            }
          }},
        "plane" :
          {
         "type": "plane",
         "default": function() { return modeler.currWindow.plane;} }
        
      },
      "start" : function(currCommand) {
        
      },
      "preview" : function(currCommand) {
        //CHANGE: efficiency
        if(currCommand.parameters.center.value && currCommand.parameters.radius.value) {
          var circle = basicCurves.circlePtRadius(currCommand.parameters.center.value, currCommand.parameters.radius.value, currCommand.parameters.plane.value);
          circle.draw();
        }
      },
      "finish" : function(currCommand) {
        var circle = basicCurves.circlePtRadius(currCommand.parameters.center.value, currCommand.parameters.radius.value, currCommand.parameters.plane.value);
        
        modeler.objects.push(circle);
      }
    },
    {
      "name":"Curve",
      "parameters": {
        "points" : {
         "type":"point",
         "isList": true},
        "degree": {
         "type":"integer",
         "default": 3}
      },
      "start" : function(cmd) {
        
      },
      "preview" : function(currCommand) {
        var pts = currCommand.parameters.points.value.slice(0);
        if(pts.length > 0) {
          pts.push(modeler.selectedPt);
          //var crv = nurbs.createCrv(currCommand.parameters.points.value,currCommand.parameters.degree.value);
          var crv = basicCurves.curveFromPts(pts, currCommand.parameters.degree.value);
          crv.draw();
        }
      },
      "finish" : function(currCommand) {
        if(currCommand.parameters.points.value.length > 1) {
          var newCurve = basicCurves.curveFromPts(currCommand.parameters.points.value,currCommand.parameters.degree.value);
          
          modeler.objects.push(newCurve);
        }
      }
    }
  ];
  
  basicCurves.transform = function(crv, mat) {
    var len = crv.rep.controlPts.length;
    if(crv.isClosed) {
      len -= 1;
    }
    for(var i=0;i<len;++i) {
      var pt = crv.rep.controlPts[i];
      vec4.projectDown(pt,pt);
      vec3.transformMat4(pt, pt, mat);
      vec4.unprojectDown(pt,pt);
    }
  }
  
  basicCurves.projectToCurve2D = function(crv, pt, out) {
    var u = nurbs.projectToCurve2D(crv.rep,  pt);
    nurbs.evaluateCrv(crv.rep, u, out);
    return u;
  }

  basicCurves.evaluate = function(crv,u, out) {
    nurbs.evaluateCrv(crv.rep, u, out);
  }
  
  basicCurves.curveFromPts = function(pts,degree) {
    //check for closed curve
    degree = Math.min(degree, pts.length-1);
    var crv = nurbs.createCrv(pts,degree);
    var obj = new Curve();
    obj.rep = crv;
    return obj;
  }
  
  basicCurves.circlePtRadius = (function() {
    var dir1 = vec3.create();
    var dir2 = vec3.create();
    return function circlePtRadius(center, radius, plane) {
      if(plane === undefined) { plane = modeler.currWindow.plane; }
      //get axes
      if(plane[0] < 0.99) {
        vec3.cross(dir1,plane,[1,0,0]);        
      } else if(plane[1] <  0.99) {
        vec3.cross(dir1,plane,[0,1,0]);        
      } else {
        vec3.cross(dir1,plane,[0,0,1]);
      }
      
      vec3.normalize(dir1,dir1);
      vec3.cross(dir2,dir1,plane);
      
      vec3.scale(dir1,dir1,radius);
      vec3.scale(dir2,dir2,radius);
      
      var crv = {};
      var oddWeight = Math.sqrt(2)/2;
      crv.controlPts = [];
      var pt1 = vec4.create();
      vec3.add(pt1,center,dir1);
      pt1[3] = 1.0;
      crv.controlPts.push(pt1);
      
      var pt = vec4.create();
      vec3.add(pt,center,dir1);
      vec3.add(pt,pt,dir2);
      vec3.scale(pt,pt,oddWeight);
      pt[3] = oddWeight;
      crv.controlPts.push(pt)
      
      pt = vec4.create();
      vec3.add(pt,center,dir2);
      pt[3] = 1.0;
      crv.controlPts.push(pt);
      
      pt = vec4.create();
      vec3.add(pt,center,dir2);
      vec3.sub(pt,pt, dir1);
      vec3.scale(pt,pt,oddWeight);
      pt[3] = oddWeight;
      crv.controlPts.push(pt);
      
      pt = vec4.create();
      vec3.sub(pt, center, dir1);
      pt[3] = 1.0;
      crv.controlPts.push(pt);
      
      pt = vec4.create();
      vec3.sub(pt, center, dir1);
      vec3.sub(pt, pt, dir2);
      vec3.scale(pt,pt,oddWeight);
      pt[3] = oddWeight;
      crv.controlPts.push(pt);
      
      pt = vec4.create();
      vec3.sub(pt, center, dir2);
      pt[3] = 1.0;
      crv.controlPts.push(pt);
      
      pt = vec4.create();
      vec3.add(pt, center, dir1);
      vec3.sub(pt, pt, dir2);
      vec3.scale(pt,pt,oddWeight);
      pt[3] = oddWeight;
      crv.controlPts.push(pt);
      
      crv.controlPts.push(pt1);
      
      crv.degree = 2;
      crv.knots = [0,0,0,.25,.25,.5,.5,.75,.75,1,1,1];
      
      var obj = new Curve();
      obj.rep = crv;
      obj.isClosed = true;
      return obj;
    };
  })();
  
  basicCurves.commands = commands;
});