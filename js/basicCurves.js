define(["nurbs","modeler", "gl-matrix-min", "vboMesh","aabb", 'exports'],function(nurbs, modeler, glMatrix, vboMesh, aabb, exports) {
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
    //color / material / layer info
  }
  
  Curve.prototype.draw = function() {
    //disable normals
    modeler.shader.attribs.vertexNormal.disable();
    modeler.gl.vertexAttrib3fv(modeler.shader.attribs.vertexNormal.location,[0,0,0]);
    //do color
    modeler.shader.uniforms.matColor.set([0.0,0.0,0.0,1.0]);
    
    modeler.shader.attribs.vertexPosition.set(this.display.vertexBuffer);
    modeler.gl.drawArrays(modeler.gl.LINE_STRIP,0,this.display.numVertices);
    
    //draw control points
    if(this.mode == 1) {
      
    }
  }
  
  Curve.prototype.updateMesh = (function() {
    var pt = vec3.create();
    return function updateMesh() {
      //add adaptive detail
      var domain = nurbs.domain(this.rep);
      var samples = this.rep.controlPts.length*5;
      var u;
      var domainSpan = domain[1]-domain[0];
      
      vboMesh.clear(this.display);
      for(var i=0;i<=samples;++i) {
        u = domain[0]+i/samples*domainSpan;
        nurbs.evaluateCrv(this.rep, u, pt);
        vboMesh.addVertex(this.display,pt);
      }
      vboMesh.buffer(this.display,modeler.gl);
    }
  })();
  
  
  
  var commands = [
    {
    "name":"Circle",
    "parameters": [
        {"name":"center",
         "type": "point"},
        {"name":"radius",
         "type": "number"},
        {"name": "plane",
         "type": "plane",
         "default": function() { return modeler.currWindow.plane;} }
        
      ],
      "start" : function() {
        
      },
      "preview" : function() {
      
      },
      "finish" : function() {
      
      }
    },
    {
      "name":"Curve",
      "parameters": [
        {"name":"points",
         "type":"point",
         "isList": true},
        {"name":"degree",
         "type":"integer",
         "default": 3}
      ],
      "start" : function(cmd) {
        cmd.points = [];
      },
      "preview" : function(cmd) {
        var crv = nurbs.createCrv(cmd.pts,cmd.degree);
        return crv;
      },
      "finish" : function(cmd) {
        var newCurve = new Curve();
        
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
      obj.updateMesh();
      return obj;
    };
  })();
  
  basicCurves.commands = commands;
});