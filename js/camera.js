/*
	Based on PeasyCam by Jonathan Feinberg
	which is distributed under the Apache Public License, version 2.0 http://www.apache.org/licenses/LICENSE-2.0.html
	which there is a good chance I am not following
	http://mrfeinberg.com/peasycam/
*/
define(["gl-matrix-min"],function(glMatrix) {
  var vec3 = glMatrix.vec3;
  var mat4 = glMatrix.mat4;
  var mat3 = glMatrix.mat3;
  var quat = glMatrix.quat;
  
  function Camera() {
    this.rot = quat.create();
    this.center = vec3.create();
    this.cameraMatrix = mat4.create();
    this.nMatrix = mat3.create();
    mat4.identity(this.cameraMatrix);
    this.distance = 10;
    this.velocityX = 0;
    this.velocityY = 0;
    this.velocityZ = 0;
    this.dampening = 0.84;
    this.startDistance = 10;
    this.minDistance = 5;
    this.fixX = false;
    this.fixY = false;
    this.fixZ = false;
    this.isPerspective = false;
  }
  vec3.angle = function(v1,v2) {
    return Math.acos(vec3.dot(v1,v2)/(vec3.length(v1)*vec3.length(v2)));
  }

  Camera.prototype.feed = (function() {
    var pos = vec3.create();
    var up = vec3.create();
    return function() {
      vec3.set(pos,0,0,1);
      vec3.set(up,0,1,0);
      vec3.transformQuat(pos,pos,this.rot);
      vec3.scale(pos,pos,this.distance);
      vec3.add(pos,pos, this.center);
      vec3.transformQuat(up,up,this.rot);
     // mat4.lookAt(pos,this.center,up,mat);
      mat4.lookAt(this.cameraMatrix,pos,this.center,up);
      mat3.normalFromMat4(this.nMatrix, this.cameraMatrix);
    };
  })();
  
  Camera.prototype.lookAt = (function() {
    var rotMat = mat3.create();
    var dir = vec3.create();
    var perp = vec3.create();
    var trueUp = vec3.create();
    return function(eye, center, up) {
      vec3.copy(this.center, center);
      this.distance = vec3.dist(eye, center);
      vec3.sub(dir,center, eye);
      vec3.normalize(dir,dir);
      vec3.cross(perp,up,dir);
      vec3.normalize(perp,perp);
      vec3.cross(trueUp, dir,perp);
      
      rotMat[0] = perp[0]; rotMat[3] = perp[1]; rotMat[6] = perp[2];
      rotMat[1] = trueUp[0]; rotMat[4] = trueUp[1]; rotMat[7] = trueUp[2];
      rotMat[2] = dir[0]; rotMat[5] = dir[1]; rotMat[8] = dir[2];
      
      quat.fromMat3(this.rot, rotMat);
      console.log(dir);
      console.log(trueUp);
      console.log(this.rot);
    }
  })();

  Camera.prototype.eyeDir = function(dir) {
    vec3.set(dir,0,0,1);
    vec3.transformQuat(dir,dir,this.rot);
    vec3.scale(dir, dir, -1);
  }

  Camera.prototype.eyePos = function(pos) {
    vec3.set(pos,0,0,1);
    vec3.transformQuat(pos,pos,this.rot);
    vec3.scale(pos, pos, this.distance);
    vec3.add(pos,pos, this.center);
  }

  Camera.prototype.mouseDragged = function(dx,dy,mx,my,button) {
     if(button == 1) {
       this.mouseRotate(dx,dy,mx,my);
     } else if(button == 2) {
     this.mousePan(dx,dy);
     } else if(button == 3) {
       this.mouseZoom(dy);
     }
  }

  Camera.prototype.mousePan = function(dx,dy) {
    var panScale = this.distance*0.005;
    this.pan(-dx*panScale, -dy*panScale);
  }

  Camera.prototype.pan = function(dx,dy) {
    var temp = [dx,dy,0];
    vec3.transformQuat(temp,temp,this.rot);
    vec3.add(this.center,this.center,temp);
  }

  Camera.prototype.mouseRotate = function(dx,dy,rx,ry) {
    var u = [0,0,-100*.6*this.startDistance]; //this.distance?

    var rho = Math.abs(rx);
    var adz = Math.abs(dy) * rho;
    var ady = Math.abs(dy) * (1 - rho);
    var ySign = dy < 0 ? -1 : 1;
    var vy = vec3.create(); //avoid
    vec3.add(vy,u,[0,ady,0]);
    this.velocityX += vec3.angle(u,vy)*ySign;
    var vz = vec3.create(); //avoid
    vec3.add(vz,u,[0,adz,0]);
    this.velocityZ += vec3.angle(u, vz) * -ySign
        * (rx < 0 ? -1 : 1);


    var eccentricity = Math.abs(ry);
    var xSign = dx > 0 ? -1 : 1;
    adz = Math.abs(dx) * eccentricity;
    var adx = Math.abs(dx) * (1 - eccentricity);
    var vx = vec3.create();
    vec3.add(vx,u,[adx, 0, 0]);
    this.velocityY += vec3.angle(u,vx)*xSign;
    vec3.add(vz,u,[0,adz,0]);
    this.velocityZ += vec3.angle(u,vz)*xSign
      * (ry > 0 ? -1 : 1);
    
  }

  Camera.prototype.mouseZoom = function(delta) {
    this.distance = Math.max(this.minDistance, this.distance - delta * Math.sqrt(this.distance)*.1);
  }
  
  Camera.prototype.step = function() {
    this.velocityX *= this.dampening;
    this.velocityY *= this.dampening;
    this.velocityZ *= this.dampening;
    if(Math.abs(this.velocityX) < 0.001) this.velocityX = 0;
    if(Math.abs(this.velocityY) < 0.001) this.velocityY = 0;
    if(Math.abs(this.velocityZ) < 0.001) this.velocityZ = 0;
    //is create necessary? Also is w first or last
    //do not create quat every time
    if(this.velocityX != 0 && !this.fixX) quat.multiply(this.rot,this.rot,[Math.sin(this.velocityX/2.0),0,0,Math.cos(this.velocityX/2.0)]);
    if(this.velocityY != 0 && !this.fixY) quat.multiply(this.rot,this.rot,[0,Math.sin(this.velocityY/2.0),0,Math.cos(this.velocityY/2.0)]);
    if(this.velocityZ != 0 && !this.fixZ) quat.multiply(this.rot,this.rot,[0,0,Math.sin(this.velocityZ/2.0),Math.cos(this.velocityZ/2.0)]);
    
    this.feed();
  }
  
  return Camera;
});