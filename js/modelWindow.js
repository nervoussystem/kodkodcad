define(['camera'], function(Camera) {

  function Window(div) {
    this.x = div.offsetLeft;
    this.y = div.offsetTop;
    this.width = div.offsetWidth;
    this.height = div.offsetHeight;
    this.div = div;
    div.addEventListener("hover", function() {}, false);
    div.addEventListener("click", function() {}, false);
    
    console.log(this.x + " " + this.y);
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