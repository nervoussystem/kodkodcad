define(['gl-matrix-min'],function(glMatrix) {
  var vec3 = glMatrix.vec3;
  var vec4 = glMatrix.vec4;
  
  var intersect = {};
  
  intersect.lineLine = function(line1, line2) {
  
  }
  
  intersect.rayPlane = function(out, orig, dir, plane) {
    var t = (-plane[3]-vec3.dot(orig,plane))/(vec3.dot(dir, plane));
    vec3.scaleAndAdd(out, orig,dir,t);
  }
  
  intersect.rayTriangle = (function () {
    var edge1 = vec3.create(),
        edge2 = vec3.create(),
        tVec = vec3.create(),
        pVec = vec3.create(),
        qVec = vec3.create();
    var det=0.0, inv_det=0.0;
    var EPSILON = 1e-6;
    return function _rayTriIntersect(orig, dir, v0,v1,v2) {
        vec3.sub(edge1,v1,v0);
        vec3.sub(edge2,v2,v0);
        
        vec3.cross(pVec,dir,edge2);
        
        det = vec3.dot(edge1,pVec);
        //no backface culling
        
        //check for parallel ray
        if(det > -EPSILON && det <EPSILON)
            return 0;
        //could possibly defer this division until the end
        inv_det = 1.0/det;
        
        //do test for u
        vec3.sub(tVec, orig,v0);
        
        var u = vec3.dot(tVec, pVec)*inv_det;
        if(u < 0.0 || u > 1.0)
            return 0;
        
        //do test for v
        vec3.cross(qVec,tVec,edge1);
        var v = vec3.dot(dir,qVec)*inv_det;
        if(v < 0.0 || u+v > 1.0)
            return 0;
        
        //get depth t
        t = vec3.dot(edge2,qVec)*inv_det;
        
        return [t,u,v];
    };
  })();

  //do each axis separately
  intersect.rayAABB = (function() {
    return function _rayAABBIntersect(origin, dir, min,max) {
      //get z intercept
      var minT = 0;
      var maxT = 9e9; //max distance
      if(dir[2] == 0) {
        if(origin[2] < min[2] || origin[2] > max[2])
          return 0;
      } else {
        var invZ = 1.0/invZ;
        var tz1 = (min[2]-origin[2])*invZ;
        var tz2 = (max[2]-origin[2])*invZ;
        if(tz1 > tz2) {
          var temp = tz1;
          tz1 = tz2;
          tz2 = temp;
        }
        minT = Math.max(tz1,minT);
        maxT = Math.min(tz2,maxT);
      }
      if(minT > maxT) return 0;
      //y
      if(dir[1] == 0) {
        if(origin[1] < min[1] || origin[1] > max[1])
          return 0;
      } else {
        var invY = 1.0/invY;
        var ty1 = (min[1]-origin[1])*invY;
        var ty2 = (max[1]-origin[1])*invY;
        if(ty1 > ty2) {
          var temp = ty1;
          ty1 = ty2;
          ty2 = temp;
        }
        minT = Math.max(ty1,minT);
        maxT = Math.min(ty2,maxT);
      }
      if(minT > maxT) return 0;
      //x
      if(dir[0] == 0) {
        if(origin[0] < min[0] || origin[0] > max[0])
          return 0;
      } else {
        var invX = 1.0/invX;
        var tx1 = (min[0]-origin[0])*invX;
        var tx2 = (max[0]-origin[0])*invX;
        if(tx1 > tx2) {
          var temp = tx1;
          tx1 = tx2;
          tx2 = temp;
        }
        minT = Math.max(tx1,minT);
        maxT = Math.min(tx2,maxT);
      }
      if(minT > maxT) return 0;
      return minT;
    }
  })();
  
  return intersect;
});