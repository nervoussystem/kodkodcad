var HEMESH_NULLFACE = null;

var hemesh = function() {
  this.vertices = [];
  this.edges = [];
  this.faces = [];
}

var hedge = function() {
  this.face = HEMESH_NULLFACE;
  this.next = null;
  this.pair = null;
  this.v = null;
  this.index = 0;
}

var heface = function() {
  this.e = null;
  this.index = 0;
}

var hevertex = function() {
  this.e = null;
  this.pos = vec3.create();
  this.index = 0;
  this.b = 0;
  this.tagged = 0;
  
}

hemesh.prototype.addEdge = function() {
  var newEdge = new hedge();
  newEdge.index = this.edges.length;
  this.edges.push(newEdge);
  return newEdge;
}

hemesh.prototype.addVertex = function(pos) {
  var newVertex = new hevertex();
  vec3.copy(newVertex.pos,pos);
  newVertex.index = this.vertices.length;
  this.vertices.push(newVertex);
  return newVertex;
}

hemesh.prototype.addFace = function() {
  var newFace = new heface();
  newFace.index = this.faces.length;
  this.faces.push(newFace);
  return newFace;
}

hemesh.prototype.removeEdge = function(e) {
  e.next = null;
  e.pair = null;
  e.face = null;
  e.v = null;
  if(e.index == this.edges.length-1) {
    this.edges.pop();
  } else if(e.index >= this.edges.length) {
    
  } else {
    var temp = this.edges.pop();
    temp.index = e.index;
    this.edges[e.index] = temp;
  }
}

hemesh.prototype.removeFace = function(f) {
  f.e = null;
  if(f.index == this.faces.length-1) {
    this.faces.pop();
  } else if (f.index >= this.faces.length) {
    
  }else {
    var temp = this.faces.pop();
    temp.index = f.index;
    this.faces[f.index] = temp;
  }
}

hemesh.prototype.removeVertex = function(v) {
  v.e = null;
  if(v.index == this.vertices.length-1) {
    this.vertices.pop();
  } else if(v.index >= this.vertices.length) {
    
  } else {
    var temp = this.vertices.pop();
    temp.index = v.index;
    this.vertices[v.index] = temp;
  }
}

hemesh.prototype.isBoundary = function(e) {
  return (e.face == HEMESH_NULLFACE || e.pair.face == HEMESH_NULLFACE);
}

hemesh.prototype.isCollapsable = function(e) {
  //should I test if the edges,vertices, or faces have been deleted yet?
  var epair = e.pair;
  var p1 = e.v;
  var p2 = epair.v;
  
  //get opposite points, if boundary edge opposite is null
  var opp1 = e.face == HEMESH_NULLFACE ? null : e.next.v;
  var opp2 = epair.face == HEMESH_NULLFACE ? null : epair.next.v;
  
  //if end points are on the boundary but the edge is not
  if(p1.b && p2.b && e.face != HEMESH_NULLFACE && epair.face != HEMESH_NULLFACE) {
    return false;
  }
  
  if(opp1 == opp2) {
    return false;
  }
  //might need a check to see if opposite edges are both boundary but that seems covered by the previous check
  
  
  //test to see if end points share any neighbors beside opp1 and opp2
  //mark all neighbors of p1 as 0
  var currE = e;
  do {
    currE = currE.next;
    currE.v.tagged = 0;
    currE = currE.pair;
  } while(currE != e);
  //mark all neighbors of p2 as 1
  currE = epair;
  do {
    currE = currE.next;
    currE.v.tagged = 1;
    currE = currE.pair;
  } while(currE != epair);
  //untag opposite
  if(opp1 != null) {opp1.tagged = 0;}
  if(opp2 != null) {opp2.tagged = 0;}
  
  //check neighbors of p1, if any are marked as 1 return false
  currE = e;
  do {
    currE = currE.next;
    if(currE.v.tagged == 1) {
      return false;
    }
    currE = currE.pair;
  } while(currE != e);
   
  //test for a face on the backside/other side that might degenerate
  if(e.face != HEMESH_NULLFACE) {
    var enext, enext2;
    enext = e.next;
    enext2 = enext.next;
    
    enext = enext.pair;
    enext2 = enext2.pair;
    if(enext.face == enext2.face) {
      return false;
    }
  }
  if(epair.face != HEMESH_NULLFACE) {
    var enext, enext2;
    enext = epair.next;
    enext2 = enext.next;
    
    enext = enext.pair;
    enext2 = enext2.pair;
    if(enext.face == enext2.face) {
      return false;
    }
  }
  
  return true;
  /*
  if (v0v1_triangle)
  {
    HalfedgeHandle one, two;
    one = next_halfedge_handle(v0v1);
    two = next_halfedge_handle(one);
    
    one = opposite_halfedge_handle(one);
    two = opposite_halfedge_handle(two);
    
    if (face_handle(one) == face_handle(two) && valence(face_handle(one)) != 3)
    {
      return false;
    }
  
  */
  
}

hemesh.prototype.edgeCollapse = function(e) {
  if(!this.isCollapsable(e)) return;
  
  var epair = e.pair;
  var enext, enext2, enextp, enextp2;
  var p1 = e.v;
  var p2 = epair.v;
  p2.e = null;
  //need to check for edge vertices either through marking or checking edges
  if(p1.b) {
    if(!p2.b) {
    
    } else {    
      vec3.add(p1.pos,p1.pos,p2.pos);
      vec3.scale(p1.pos,p1.pos,0.5);
      p1.b = p2.b;
    }
  } else if(p2.b) {
    vec3.copy(p1.pos,p2.pos);
    p1.b = p2.b;
  } else {
    vec3.add(p1.pos,p1.pos,p2.pos);
    vec3.scale(p1.pos,p1.pos,0.5);
  }
  //remove p2
  var startE = epair;
  //slight inefficiency, no need to repoint edges that are about to be removed
  enext = epair;
  do {
    enext.v = p1;
    enext = enext.next.pair;
  } while(enext != startE);

  this.removeVertex(p2);
  
  var prevE, prevEP;
  if(e.face == null) {
    var currE = epair;
    while(currE.next != e) {
      currE = currE.next.pair;
    }
    prevE = currE;
  }
  if(epair.face == null) {
    var currE = e;
    while(currE.next != epair) {
      currE = currE.next.pair;
    }
    prevEP = currE;
  }
  //remove face
  if(e.face != null) {
    enext = e.next;
    enext2 = enext.next;
    
    //remove enext and enext2;
    enextp = enext.pair;
    enextp2 = enext2.pair;
    
    /*
    if(enextp.face == null && enextp2.face == null) {
      //pinched off, remove enextp and enextp2, connect across
      var currE = enext2;
      while(currE.next != enextp2) {
        currE = currE.next.pair;
      }
      currE.next = enextp.next;
      p1.e = currE;
      
      this.removeVertex(enext.v);
      this.removeEdge(enextp);
      this.removeEdge(enextp2);
    } else {
    */
      enextp.pair = enextp2;
      enextp2.pair = enextp;    
      //p1.e = enextp;
      enextp.v.e = enextp;
      enextp2.v.e = enextp2;   
    //}
    
    this.removeEdge(enext);
    this.removeEdge(enext2);

 
    
    this.removeFace(e.face);
  } else {
    
    prevE.next = e.next;
    p1.e = prevE;
  }
  
  if(epair.face != null) {
    enext = epair.next;
    enext2 = enext.next;
    
    //remove enext and enext2;

    enextp = enext.pair;
    enextp2 = enext2.pair;
    /*
    if(enextp.face == null && enextp2.face == null) {
      //pinched off, remove enextp and enextp2, connect across
      //inefficiently get previous edge
      var currE;
      for(var i=0;i<this.edges.length;++i) {
        currE = this.edges[i];
        if(currE.next == enextp2) {
          break;
        }
      }
      currE.next = enextp.next;
      p1.e = currE;
      
      this.removeVertex(enext.v);
      this.removeEdge(enextp);
      this.removeEdge(enextp2);
    } else {
    */
      enextp.pair = enextp2;
      enextp2.pair = enextp;    
      enextp.v.e = enextp;
      enextp2.v.e = enextp2;   
    //}
    this.removeEdge(enext);
    this.removeEdge(enext2);

    this.removeFace(epair.face);
  } else {
    prevEP.next = epair.next;
    p1.e = prevEP;
  }
  
  //remove e and epair
  this.removeEdge(e);
  this.removeEdge(epair);

  return p1;
}

hemesh.prototype.edgeSplit = (function() { 
  var pos = vec3.create();
  //assumes e.face != null but epair.face can == null
  return function(e) {
    //need to check for boundary edge
    //not done
    
    //new pt
    var epair = e.pair;
    var p1 = e.v;    
    var p2 = epair.v;
    var enext = e.next;
    var epnext = epair.next;
    
    vec3.add(pos,p1.pos,p2.pos);
    vec3.scale(pos,pos,0.5);
    var newVertex = this.addVertex(pos);
    
    var newEdge, newEdgePair, newFace, splitEdge1, splitEdge2;
    
    //do e first
    newEdge = this.addEdge();
    newEdge.v = p1;
    p1.e = newEdge;
    e.v = newVertex;
    newEdge.next = enext;
    newEdge.pair = epair;
    epair.pair = newEdge;
    
    newEdgePair = this.addEdge();
    newEdgePair.v = p2;
    newEdgePair.e = p2;
    epair.v = newVertex;
    newEdgePair.next = epnext;
    newEdgePair.pair = e;
    e.pair = newEdgePair;
    newVertex.e = e;
    
    //set b to neighboring b, it p1.b should equal p2.b
    if(e.face == null || epair.face == null) { newVertex.b = p1.b;}
    
    if(e.face != null) {
      //face 1
      newFace = this.addFace();
      splitEdge1 = this.addEdge();
      splitEdge2 = this.addEdge();
      splitEdge1.pair = splitEdge2;
      splitEdge2.pair = splitEdge1;
      splitEdge1.v = enext.v;
      splitEdge2.v = newVertex;
      
      //e.f
      e.next = splitEdge1;
      splitEdge1.next = enext.next;
      e.face.e = e;
      splitEdge1.face = e.face;
      //newFace
      newEdge.face = newFace;
      splitEdge2.face = newFace;
      enext.face = newFace;
      newFace.e = newEdge;
      enext.next = splitEdge2;
      splitEdge2.next = newEdge;
    } else {
      e.next = newEdge;
    }
    
    if(epair.face != null) {
      newFace = this.addFace();
      splitEdge1 = this.addEdge();
      splitEdge2 = this.addEdge();
      splitEdge1.pair = splitEdge2;
      splitEdge2.pair = splitEdge1;
      splitEdge1.v = epnext.v;
      splitEdge2.v = newVertex;
      
      //epair.f
      epair.next = splitEdge1;
      splitEdge1.next = epnext.next;
      epair.face.e = epair;
      splitEdge1.face = epair.face;
      
      //newFace
      newEdgePair.face = newFace;
      splitEdge2.face = newFace;
      epnext.face = newFace;
      newFace.e = newEdgePair;
      epnext.next = splitEdge2;
      splitEdge2.next = newEdgePair;
    } else {
      epair.next = newEdgePair;
    }
    
    return newVertex;
  }
})();

hemesh.prototype.splitLargest = function(e) {
  var largestEdge = this.longestEdge(e);
  while(largestEdge != e) {
    this.splitLargest(largestEdge);
    largestEdge = this.longestEdge(e);
  }
  var pair = e.pair;
  
  largestEdge = this.longestEdge(pair);
  while(largestEdge != pair) {
    this.splitLargest(largestEdge);
    largestEdge = this.longestEdge(pair);
  }
  this.edgeSplit(e);
}

hemesh.prototype.longestEdge = function(e) {
  if(e.face == null) {
    return e;
  } else {
    var longestLen = this.sqrLen(e);
    var longEdge = e;
    var startE = e;
    e = e.next;
    do {      
      var len = this.sqrLen(e);
      if(len > longestLen) {
        longestLen = len;
        longEdge = e;
      }
      e = e.next;
    } while(e != startE);
    return longEdge;
  }
}

hemesh.prototype.sqrLen = function(e) {
  return vec3.sqrDist(e.v.pos,e.pair.v.pos);
}

hemesh.prototype.edgeFlip = function(e) {
  var epair = e.pair;
  
  if(epair.face != null && e.face != null) {
    var enext = e.next;
    var enext2 = enext.next;
    var epnext = epair.next;
    var epnext2 = epnext.next;
    var p1 = e.v;
    var p2 = epair.v;
    e.v = enext.v;
    enext.face = epair.face;
    epair.v = epnext.v;
    epnext.face = e.face;
    //new faces
    e.next = enext2;
    enext2.next = epnext;
    epnext.next = e;
    
    epair.next = epnext2;
    epnext2.next = enext;
    enext.next = epair;
    
    //just in case face points to e.next, not that it strictly matters
    e.face.e = e;
    epair.face.e = epair;
    
    //deal with vertex pointers
    p2.e = e.next;
    p1.e = epair.next;
  }
}

hemesh.prototype.getValence = function(p) {
  var e = p.e;
  var count = 0;
  do {
    count++;
    e = e.next.pair;
  } while(e != p.e);
  return count;
}

hemesh.prototype.getValenceE = function(e) {
  var startE = e;
  var count = 0;
  do {
    count++;
    e = e.next.pair;
  } while(e != startE);
  return count;
}

