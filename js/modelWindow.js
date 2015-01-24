define(['camera', 'gl-matrix-min'], function(Camera, glMatrix) {
  var mat4 = glMatrix.mat4;
  
  function Window(div) {
    this.x = div.offsetLeft;
    this.y = div.offsetTop;
    this.width = div.offsetWidth;
    this.height = div.offsetHeight;
    this.div = div;
    this.mouseHandler;
    this.pMatrix = mat4.create();
    
    this.camera = new Camera();
    this.plane = [0,0,1,0];
  }
  
  Window.prototype.setPerspective = function(persp) {
    this.camera.isPerspective = persp;
  }
  
  Window.prototype.setOrtho = function(persp) {
    this.camera.isPerspective = !persp;
  }
  
  return Window;
});