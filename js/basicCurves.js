define(["nurbs","modeler", "gl-matrix-min", "vboMesh","aabb", 'exports'],function(nurbs, modeler, glMatrix, vboMesh, aabb, exports) {
  "use strict";
  var vec3 = glMatrix.vec3;
  
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
        {"name":"q",
         "type": "number"},
        {"name": "plane",
         "type": "plane",
         "default": [0,0,1]}
        
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
  
  basicCurves.curveFromPts = function(pts,degree) {
    //check for closed curve
    var crv = nurbs.createCrv(pts,degree);
    var obj = new Curve();
    obj.rep = crv;
    return obj;
  }
  
  basicCurve.circlePtRadius = function(center, radius, plane) {
    
  }
  
  basicCurves.commands = commands;
});