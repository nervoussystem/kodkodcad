define(["gl-matrix-min"], function(glMatrix) {
  var vec3 = glMatrix.vec3;
  var vec4 = glMatrix.vec4;
  var mat4 = glMatrix.mat4;
  
  var ControlPt = function(obj, pt) {
    this.obj = obj;
    this.pt = pt;
    this.selected = false;
  }
  
  ControlPt.prototype.transform = function(mat) {
    vec4.projectDown(this.pt,this.pt);
    vec3.transformMat4(this.pt, this.pt, mat);
    vec4.unprojectDown(this.pt, this.pt);
    
    this.obj.needsUpdate = true;
  }
  
  ControlPt.prototype.draw = function() {
  }
  return ControlPt;
});