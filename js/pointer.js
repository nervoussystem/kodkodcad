define(function() {
  function pointer(el) {
    var self = this;
    self.pmouseX = 0;
    self.pmouseY = 0;
    self.mouseX = 0;
    self.mouseY = 0;
    self.startMouseX = 0;
    self.startMouseY = 0
    self.mouseButton = 0;
    self.startMouseTime = 0;
    self.isMouseDown = false;
    self.mouseDragging = false;
    var mouseUp,mouseDown,mouseMoved,mouseDragged,mouseClicked;

    setupMouseEvents(el);
    
    function setupMouseEvents(canvas) {
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('contextmenu', function(event){event.preventDefault();});
        document.addEventListener('mouseup', onMouseUpDoc);
        
        setupTouchEvents(canvas);
    }

    function setupTouchEvents(canvas) {
        if(isTouchDevice()) {
            canvas.addEventListener('touchmove', onTouchMove);
            canvas.addEventListener('touchstart', onTouchStart);
            canvas.addEventListener('touchend', onTouchEnd);
            document.addEventListener('touchend', onMouseUpDoc);
        }
    }

    function isTouchDevice() {
      return 'ontouchstart' in window // works on most browsers 
          || 'onmsgesturechange' in window; // works on ie10
    };

    function onMouseDown(event) {
        // Cancel the default event handler
        event.preventDefault();

        self.mouseDragging = false;
        var rect = event.target.getBoundingClientRect();

        var currentX = event.clientX-rect.left;
        var currentY = event.clientY-rect.top;
        
        self.pmouseX = self.mouseX = self.startMouseX = currentX;
        self.pmouseY = self.mouseY = self.startMouseY = currentY;
        self.isMouseDown = true;
        self.mouseButton = event.which;
        self.startMouseTime = performance.now();
        if(typeof self.mouseDown !== 'undefined') {
            self.mouseDown(event);
        }
    }

    function onMouseMove(event) {
        // Cancel the default event handler
        event.preventDefault();
        
        var rect = event.target.getBoundingClientRect();

        var currentX = event.clientX-rect.left;
        var currentY = event.clientY-rect.top;
        
        self.pmouseX = self.mouseX;
        self.pmouseY = self.mouseY;
        
        self.mouseX = currentX;
        self.mouseY = currentY;
        if(self.mouseX != self.pmouseX || self.mouseY != self.pmouseY) {
            if(typeof self.mouseMoved !== 'undefined') {
                self.mouseMoved(event);
            }
            if(self.isMouseDown) {
              if(!self.mouseDragging) {
                if(typeof self.mouseDragStart !== 'undefined') {
                  self.mouseDragStart();
                }
              }
              self.mouseDragging = true;
              if(typeof self.mouseDragged !== 'undefined') {
                  self.mouseDragged(event);
              }
            }
        }
    }

    function onMouseUp(event) {
        // Cancel the default event handler
        event.preventDefault();
        self.isMouseDown = false;
        if(typeof self.mouseUp !== 'undefined') {
            self.mouseUp(event);
        }
        if(!self.mouseDragging && (typeof self.mouseClicked !== 'undefined')) {
            self.mouseClicked(event);
        }
        self.mouseDragging = false;
    }

    function onMouseUpDoc(event) {
        self.isMouseDown = false;
    }

    function onTouchStart(event) {
        // Cancel the default event handler
        event.preventDefault();

        mouseDragging = false;
        var rect = event.targetTouches[0].target.getBoundingClientRect();

        var currentX = event.targetTouches[0].clientX-rect.left;
        var currentY = event.targetTouches[0].clientY-rect.top;
        
        self.pmouseX = self.mouseX = self.startMouseX = self.currentX;
        self.pmouseY = self.mouseY = self.startMouseY = self.currentY;
        console.log("touch start");
        self.isMouseDown = true;
        //mouseButton = event.button;
        self.mouseButton = 0;
        self.startMouseTime = performance.now();
        if(typeof mouseDown !== 'undefined') {
            mouseDown();
        }
    }

    function onTouchMove(event) {
        // Cancel the default event handler
        event.preventDefault();
        
        var rect = event.targetTouches[0].target.getBoundingClientRect();

        var currentX = event.targetTouches[0].clientX-rect.left;
        var currentY = event.targetTouches[0].clientY-rect.top;
        
        pmouseX = mouseX;
        pmouseY = mouseY;
        
        mouseX = currentX;
        mouseY = currentY;
        if(typeof mouseMoved !== 'undefined') {
            mouseMoved();
        }
        if(isMouseDown) {
            mouseDragging = true;
            if(typeof mouseDragged !== 'undefined') {
                mouseDragged();
            }
        }
    }

    function onTouchEnd(event) {
        // Cancel the default event handler
        event.preventDefault();
        self.isMouseDown = false;
        if(typeof self.mouseUp !== 'undefined') {
            self.mouseUp();
        }
        if(!self.mouseDragging && (typeof self.mouseClicked !== 'undefined')) {
            self.mouseClicked();
        }
        self.mouseDragging = false;
    }
  }
  return pointer;
});