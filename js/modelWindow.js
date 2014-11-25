define(['camera'], function(Camera) {

  function Window() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    
    this.camera = new Camera();
  }
  
  Window.prototype.setPerspective = function(persp) {
    this.camera.isPerspective = persp;
  }
  
  Window.prototype.setOrtho = function(persp) {
    this.camera.isPerspective = !persp;
  }
  
  return Window;
});