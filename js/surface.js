define(["nurbs","modeler", "gl-matrix-min", "vboMesh","aabb", 'exports'],function(nurbs, modeler, glMatrix, vboMesh, aabb, exports) {
  "use strict";
  var vec3 = glMatrix.vec3;
  var vec4 = glMatrix.vec4;
  var surface = exports;
  
  var Surface = function() {
    this.type = modeler.SURFACE;
    this.display = vboMesh.create32(modeler.gl,true);
    vboMesh.enableNormals(this.display);
    this.rep = null;
    this.aabb = new aabb.AABBNode();
    this.mode = 0;
    this.needsUpdate = true;
    this.controlPts = [];
    //color / material / layer info
  }
  
  Surface.prototype.draw = function() {
    if(this.needsUpdate) {
      this.updateMesh();
    }
    //disable normals
    modeler.shader.attribs.vertexNormal.enable();
    //do color
    if(this.selected) {
      modeler.shader.uniforms.matColor.set(modeler.selectedColor);
    } else {
      modeler.shader.uniforms.matColor.set([0.8,0.8,0.8,1.0]);
    }
    
    modeler.shader.attribs.vertexPosition.set(this.display.vertexBuffer);
    modeler.shader.attribs.vertexNormal.set(this.display.normalBuffer);
    modeler.gl.bindBuffer(modeler.gl.ELEMENT_ARRAY_BUFFER, this.display.indexBuffer);
    modeler.gl.drawElements(modeler.gl.TRIANGLES,this.display.numIndices,modeler.gl.UNSIGNED_INT,0);
    
    //draw outline?
    
    //edit mode
    if(this.mode == 1) {
      var numControlPts = this.controlPts.length;
      //draw control points
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
  
  Surface.prototype.updateMesh = (function() {
    var pt = vec3.create();
    var du = vec3.create();
    var dv = vec3.create();
    var norm = vec3.create();
    return function updateMesh() {
      //CHANGE: add adaptive detail
      var domain = nurbs.domainSrf(this.rep);
      var samplesU = this.rep.controlPts.length*8;
      var samplesV = this.rep.controlPts[0].length*8;
      var u,v;
      var domainSpanU = domain[0][1]-domain[0][0];
      var domainSpanV = domain[1][1]-domain[1][0];
      
      vboMesh.clear(this.display);
      var i,j;
      for(i=0;i<=samplesU;++i) {
        u = domain[0][0]+i/samplesU*domainSpanU;
        for(j=0;j<=samplesV;++j) {
          v = domain[1][0]+j/samplesV*domainSpanV;
          nurbs.evaluateSrfDerivatives(this.rep, u, v, pt, du, dv);
          //nurbs.evaluateSrf(this.rep, u, v, pt);
          vboMesh.addVertex(this.display,pt);
          
          //normal
          vec3.cross(norm, du,dv);
          vec3.normalize(norm,norm);
          vboMesh.setNormal(this.display,this.display.numVertices-1,norm);
          
          if(i < samplesU && j < samplesV) {
            vboMesh.addTriangle(this.display, i*(samplesV+1)+j,i*(samplesV+1)+j+1,(i+1)*(samplesV+1)+j+1);
            vboMesh.addTriangle(this.display, i*(samplesV+1)+j,(i+1)*(samplesV+1)+j+1,(i+1)*(samplesV+1)+j);
          }
        }
      }
      this.needsUpdate = false;
      vboMesh.buffer(this.display,modeler.gl);
    }
  })();
  
  Surface.prototype.enableEditMode = function() {
    if(this.mode === 0) {
      var i,j,len,len2;
      for(i=0, len=this.rep.controlPts.length;i<len;++i) {
        var pts = this.rep.controlPts[i];
        for(j=0, len2 = pts.length;j<len2;++j) {
          this.controlPts.push(new ControlPt(this, pts[j]));
        }
      }
      this.mode = 1;
    }
  }
  
  Surface.prototype.disableEditMode = function() {
    if(this.mode === 1) {
      for(var i=0;i<this.controlPts.length;++i) {
        var pt = this.controlPts[i];
        var index = modeler.selection.indexOf(pt);
        if(index >= 0) {
          modeler.selection.splice(index,1);
        }
      }
      this.mode = 0;
      this.controlPts.length = 0;
    }
  }
  
  Surface.prototype.transform = function(mat) {
    var len = this.rep.controlPts.length;
    var i,j, len2;
    for(i=0;i<len;++i) {
      var pts = this.rep.controlPts[i];
      for(j=0, len2 = pts.length; j<len2; ++j) {
        var pt = pts[j];
        vec4.projectDown(pt,pt);
        vec3.transformMat4(pt, pt, mat);
        vec4.unprojectDown(pt,pt);
      }
    }
    this.needsUpdate = true;
  }
  
  //modeler is not initialized so modeler.CURVE does not work
  var commands = [
    {
    "name":"Loft",
    "parameters": {
      "curves": {
        "type" : "object",
        "isList" : true,
        "filter" : 4//modeler.CURVE
        }
      },
    "start" : function(cmd) {
      
    },
    "preview" : function(cmd) {
      
    },
    "finish" : function(cmd) {
      var srf = new Surface();
      var crvs = cmd.parameters.curves.value;
      //srf.rep = nurbs.loft(crvs[0].rep,crvs[1].rep);
      //map
      var silliness = new Array(crvs.length);
      for(var i=0;i<crvs.length;++i) silliness[i] = crvs[i].rep;
      srf.rep = nurbs.loft(silliness);
      if(srf.rep) {
        modeler.objects.push(srf);
      }
    }
  }
  ];
  
  surface.transform = function(crv, mat) {
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

  surface.evaluate = function(srf,u,v, out) {
    nurbs.evaluateSrf(srf.rep, u, v, out);
  }
  
  
  surface.commands = commands;
});