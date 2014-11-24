define(["gl-matrix-min"], function(glMatrix) {
var vec3 = glMatrix.vec3;
var mat4 = glMatrix.mat4;

var aabb = {};


function Bbox() {
  this.max = vec3.create();
  this.min = vec3.create();
  vec3.set(this.max,-Number.MAX_VALUE,-Number.MAX_VALUE,-Number.MAX_VALUE);
  vec3.set(this.min,Number.MAX_VALUE,Number.MAX_VALUE,Number.MAX_VALUE);
}

aabb.create = function() {
  return new Bbox();
}

aabb.clone = function(box) {
  var newBox = aabb.create();
  vec3.copy(newBox.min,box.min);
  vec3.copy(newBox.max,box.max);
  return newBox;
}

aabb.copy = function(a,b) {
  vec3.copy(a.max,b.max);
  vec3.copy(a.min,b.min);
}

aabb.setFromVec3 = function(a,b) {
  vec3.copy(a.max,b);
  vec3.copy(a.min,b);
}

aabb.add = function(a,b,c) {
  vec3.max(a.max,b.max,c.max);
  vec3.min(a.min,b.min,c.min);
}

aabb.addVec3 = function(a,b,c) {
  vec3.max(a.max,b.max,c);
  vec3.min(a.min,b.min,c);
}



var AABBNode = function() {
  this.geom = null;
  this.children = [];
  this.bbox = aabb.create();
}

aabb.AABBNode = AABBNode;

var projectionDelta = 10;

var buildAABBtree = function(vbo) {
  var i1,i2,i3;
  var p1 = vec3.create();
  var p2 = vec3.create();
  var p3 = vec3.create();
  var root = new AABBNode();
  for(var i=0;i<vbo.numIndices;) {
    i1 = vbo.indexData[i++];
    i2 = vbo.indexData[i++];
    i3 = vbo.indexData[i++];
    vboMesh.getVertex(p1,vbo,i1);
    vboMesh.getVertex(p2,vbo,i2);
    vboMesh.getVertex(p3,vbo,i3);
    var leaf = new AABBNode();
    aabb.setFromVec3(leaf.bbox, p1);
    aabb.addVec3(leaf.bbox,leaf.bbox, p2);
    aabb.addVec3(leaf.bbox,leaf.bbox, p3);
    leaf.bbox.max[0] += projectionDelta;
    leaf.bbox.max[1] += projectionDelta;
    leaf.bbox.max[2] += projectionDelta;
    
    
    leaf.bbox.min[0] -= projectionDelta;
    leaf.bbox.min[1] -= projectionDelta;
    leaf.bbox.min[2] -= projectionDelta;
    leaf.geom = i/3-1;
    root.children.push(leaf);
    aabb.add(root.bbox,root.bbox,leaf.bbox);
  }
  
  splitTree(root);
  
  return root;
}

var splitTree = function(tree) {
  //split on longest axis
  var axis = 0;
  var len = tree.bbox.max[0]-tree.bbox.min[0];
  if(tree.bbox.max[1]-tree.bbox.min[1] > len) {
    len = tree.bbox.max[1]-tree.bbox.min[1];
    axis = 1;
  }
  if(tree.bbox.max[2]-tree.bbox.min[2] > len) {
    len = tree.bbox.max[2]-tree.bbox.min[2];
    axis = 2;
  }
  var mid = tree.bbox.min[axis]+len*0.5;
  var leaf1 = new AABBNode();
  var leaf2 = new AABBNode();
  while(tree.children.length > 0) {
    var child = tree.children.pop();
    if(child.bbox.min[axis] > mid) {
      leaf1.children.push(child);
      aabb.add(leaf1.bbox,leaf1.bbox,child.bbox);
    } else {
      leaf2.children.push(child);
      aabb.add(leaf2.bbox,leaf2.bbox,child.bbox);
    }
  }
  if(leaf1.children.length == 0) {
    tree.children.push.apply(tree.children,leaf2.children);
  } else if(leaf2.children.length == 0) {
    tree.children.push.apply(tree.children,leaf1.children);
  } else {
    tree.children.push(leaf1);
    tree.children.push(leaf2);
    if(leaf1.children.length > 2) {
      splitTree(leaf1);
    }
    if(leaf2.children.length > 2) {
      splitTree(leaf2);
    }
  }
  
}

aabb.isIn = function(bbox, pt) {
  if(pt[0] >= bbox.min[0] && pt[0] <= bbox.max[0] &&
    pt[1] >= bbox.min[1] && pt[1] <= bbox.max[1] &&
    pt[2] >= bbox.min[2] && pt[2] <= bbox.max[2]) {
    return true;
  }
  return false;
}

aabb.projectAABB = function(out, tree, pt, projectFunc) {
  if(tree.geom == null) {
    var child;
    for(var i=0;i<tree.children.length;++i) {
      child = tree.children[i];
      if(aabb.isIn(child.bbox, pt)) {
        aabb.projectAABB(out,child,pt,projectFunc);
      }
    }
  } else {
    projectFunc(out, pt, tree.geom);
  }
}

/*
  intersect a ray with a AABB tree
  out is a custom object for the intersection function (maybe it shouldn't exist)
  intersectFunc is a custom function for performing the intersection with whatever primitive is stored in the tree
*/
aabb.intersectTreeRay = function(out, tree, pt, dir, intersectFunc) {
  if(tree.geom == null) {
    var child;
    var hit = false;
    for(var i=0;i<tree.children.length;++i) {
      child = tree.children[i];
      if(aabb.intersectRay(child.bbox, pt,dir)) {
        hit = hit || aabb.intersectTreeRay(out,child,pt,dir, intersectFunc);
      }
    }
    return hit;
  } else {
    return intersectFunc(out, pt, dir, tree.geom);
  }
}

aabb.intersectRay = function(bbox, pt, dir) {
  var min = bbox.min;
  var max = bbox.max;
  var invx = 1.0/dir[0];
  var tmin, tmax, tymin, tymax, tzmin, tzmax;
  if (invx >= 0) {
    tmin = (min[0] - pt[0]) * invx;
    tmax = (max[0] - pt[0]) * invx;
  } else {
      tmin = (max[0] - pt[0]) * invx;
      tmax = (min[0] - pt[0]) * invx;
  }
  
  var invy = 1.0/dir[1];
  if (invy >= 0) {
    tymin = (min[1] - pt[1]) * invy;
    tymax = (max[1] - pt[1]) * invy;
  } else {
    tymin = (max[1] - pt[1]) * invy;
    tymax = (min[1] - pt[1]) * invy;
  }
  if ((tmin > tymax) || (tymin > tmax)) {
    return false;
  }
  if (tymin > tmin) {
    tmin = tymin;
  }
  if (tymax < tmax) {
    tmax = tymax;
  }
  var invz = 1.0/dir[2];
  if (invz >= 0) {
    tzmin = (min[2] - pt[2]) * invz;
    tzmax = (max[2] - pt[2]) * invz;
  } else {
    tzmin = (max[2] - pt[2]) * invz;
    tzmax = (min[2] - pt[2]) * invz;
  }
  if ((tmin > tzmax) || (tzmin > tmax)) {
    return false;
  }
  
  return true;
}

var refitTree = (function() {
  var bbox = aabb.create();
  return function refitTree(tree, bboxFunc) {
    if(tree.geom == null) {
      //maybe I should assume just two children
      var child;
      for(var i=0;i<tree.children.length;++i) {
        child = tree.children[i];
        refitTree(child,bboxFunc);
        if(i==0) {
          aabb.copy(tree.bbox, child.bbox);
        } else {
          aabb.add(tree.bbox,tree.bbox, child.bbox);
        }
      }
    } else {
      bboxFunc(tree.bbox, tree.geom);
    }
  }
})();

return aabb;
});