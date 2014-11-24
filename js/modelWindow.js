define(['camera'], function(Camera) {

  function Window() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    
    this.camera = new Camera();
  }
  
  return Window;
});