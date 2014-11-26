define(["nurbs","modeler", "gl-matrix-min", "vboMesh","aabb"],function(nurbs, modeler, glMatrix, vboMesh, aabb) {
  "use strict";
  var vec3 = glMatrix.vec3;
  
  var Curve = function() {
    this.type = modeler.CURVE;
    this.display = vboMesh.create(false);
    this.rep = null;
    this.aabb = new aabb.AABBNode();
    this.isClosed = false;
    this.mode = 0;
    //color / material / layer info
  }
  
  Curve.prototype.draw() {
    //disable normals
    modeler.shader.attribs.vertexNormal.disable();
    modeler.gl.vertexAttrib3fv(modeler.shader.attribs.vertexNormal.location,[0,0,0]);
    //do color
    modeler.shader.uniforms.matColor.set([0.0,0.0,0.0,0.0]);
    
    modeler.shader.attribs.vertexPosition.set(this.display.vertexBuffer);
    modeler.gl.drawArrays(gl.LINE_STRIP,0,this.display.numVertices);
    
    //draw control points
    if(this.mode == 1) {
      
    }
  }
  
  Curve.prototype.updateBuffer() {
    
  }
  
  
  
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
  
  ]
});