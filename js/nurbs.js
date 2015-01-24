define(["gl-matrix-min"], function(glMatrix) {
"use strict";
var vec4 = glMatrix.vec4;
var vec3 = glMatrix.vec3;
var vec2 = glMatrix.vec2;
//check for 0
vec4.projectDown=function(a,b){var d=1.0/a[3];if(!b) {b=vec3.create();} b[0]=a[0]*d;b[1]=a[1]*d;b[2]=a[2]*d;return b;};
vec4.unprojectDown=function(a,b){var d=a[3];if(!b) {b=vec3.create();} b[0]=a[0]*d;b[1]=a[1]*d;b[2]=a[2]*d;return b;};
//optimize to avoid multiplications with no b
//vec4.fromVec3=function(a,b){if(!b) b=1;var c=new Float32Array(4);c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;c[3]=b;return c;};
vec4.fromVec3=function(out,a){out = out || vec4.create();out[0]=a[0];out[1]=a[1];out[2]=a[2];out[3]=1;return out;};
vec4.zero=function(a){a[0]=0;a[1]=0;a[2]=0;a[3]=0};

//NURBS CURVE
//a nurbs object has control pts,knots, degree
var nurbs = {};
//used locally
nurbs.MAX_DEGREE = 5;
nurbs.basisFuncs = new Float32Array(10);
nurbs.basisFuncsU = new Float32Array(10);
nurbs.basisFuncsV = new Float32Array(10);
nurbs.deriveBasisFuncs = new Array(11);
for(var i=0;i<nurbs.MAX_DEGREE+1;++i) nurbs.deriveBasisFuncs[i] = new Float32Array(nurbs.MAX_DEGREE+1);
nurbs.ndu = new Array(nurbs.MAX_DEGREE+1);
for(var i=0;i<nurbs.MAX_DEGREE+1;++i) nurbs.ndu[i] = new Float32Array(nurbs.MAX_DEGREE+1);

nurbs.bang = function(a) {
	var val=1;
	for(;a>1;a--) {
		val*=a;
	}
	return val;
};

//I am an idiot
nurbs.B = [new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10),new Float32Array(10)];
for(var i=0;i<10;++i) {
	for(var j=0;j<10;++j) {
		nurbs.B[i][j] = nurbs.bang(i)/(nurbs.bang(j)*nurbs.bang(i-j));
	}
}

//make a nurbs crv object
//initialize with points??
nurbs.createCrv = function(pts,degree) {
	var crv = {};
	crv.degree = degree || 3;
	crv.knots = new Array(crv.degree+1+pts.length);
  var i=0;
	var knot = 0;
  for(i=0;i<crv.degree+1;i++) crv.knots[i] = knot;
  for(;i<crv.knots.length-crv.degree-1;++i) {
    crv.knots[i] = ++knot;
  }
  knot++;
  for(;i<crv.knots.length;++i) {
    crv.knots[i] = knot;
  }
	crv.controlPts = [];
  for(var i=0;i<pts.length;++i) {
    var newPt = vec4.create();
    vec4.fromVec3(newPt, pts[i]);
    crv.controlPts.push(newPt);
  }
	return crv;
}

nurbs.createRawCrv = function(pts,knots,degree) {
	var crv = {};
	crv.degree = degree || 3;
	crv.knots = new Array(knots.length);
	for(var i=0;i<knots.length;i++) crv.knots[i] = knots[i];
	crv.controlPts = [];
	for(var i=0;i<pts.length;++i) {
		crv.controlPts.push(vec4.fromVec3(null,pts[i]));
	}
	return crv;
}

nurbs.createClosedCrv = function(pts, degree) {
	var crv = {};
	crv.degree = degree || 3;
	crv.knots = new Array(pts.length+crv.degree+crv.degree+1);
	for(var i=0;i<crv.knots.length;i++) crv.knots[i] = i-crv.degree;
	crv.controlPts = [];
	for(var i=0;i<pts.length;++i) {
		crv.controlPts.push(vec4.fromVec3(null,pts[i]));
	}
	for(var i=0;i<crv.degree;++i) {
		crv.controlPts.push(crv.controlPts[i]);
	}
	return crv;
}

nurbs.copyCrv = function(crv) {
	var newCrv = {};
	newCrv.degree = crv.degree;
	newCrv.knots = crv.knots.slice(0);
	//newCrv.controlPts = crv.controlPts.slice(0);
	newCrv.controlPts = new Array(crv.controlPts.length);
  for(var i=0;i<crv.controlPts.length;++i) newCrv.controlPts[i] = vec4.clone(crv.controlPts[i]);
  return newCrv;
}

//binary search
nurbs.findKnot = function(knots,u,degree) {
	if (u>=knots[knots.length-degree-1]) return knots.length-degree-2;
	//check for bad input
	if(u <= knots[degree]) return degree;
	var low = degree;
	var high = knots.length-degree;
	var mid = Math.floor((high+low)/2);
	while(knots[mid]>u || u >= knots[mid+1]) {
	  if(u<knots[mid]) {
		high = mid;
	  } else {
		low = mid;
	  }
	  mid = Math.floor((high+low)/2);
	}
	return mid;
}

 
//implement degree elevation and reduction, needed to loft curve of different degrees as well
nurbs.setDegree = function(deg) {
}
	
nurbs.evaluateCrv = (function() {
  var evalPt = vec4.create();
	var tempPt = vec4.create();
  return function evaluateCrv(crv,u,pt) {
    	var currKnot = nurbs.findKnot(crv.knots,u,crv.degree);
    	vec4.zero(evalPt);
    	nurbs.basisFunctions(crv.knots,crv.degree,currKnot, u,nurbs.basisFuncs);
    	
    	for(var i = 0;i<=crv.degree;++i) {
    	  vec4.scaleAndAdd(evalPt, evalPt,crv.controlPts[currKnot-crv.degree+i], nurbs.basisFuncs[i]);
    	}
    	return vec4.projectDown(evalPt,pt);
    };
})();

nurbs.crvDerivatives = (function() {
	var hPts = new Array(nurbs.MAX_DEGREE+1);
	var derivesW = new Array(nurbs.MAX_DEGREE+1);
	var i,j,der, currPt = vec3.create();
	//for(i=0;i<hPts.length;++i) hPts[i] = vec4.create();
	for(i=0;i<derivesW.length;++i) derivesW[i] = vec4.create();
  
  var basFunc = new Array(nurbs.MAX_DEGREE+1);
	for(i=0;i<nurbs.MAX_DEGREE+1;++i) basFunc[i] = new Float32Array(nurbs.MAX_DEGREE+1);

	return function(crv,u,k,out) {
		if(out === undefined) {
			out = new Array(k+1);
			for(i=0;i<out.length;++i) out[i] = vec3.create();
		}
		var currKnot = nurbs.findKnot(crv.knots,u,crv.degree);
		//for(i=0;i<=crv.degree;++i) {
		//	vec4.copy(hPts[i], crv.controlPts[currKnot-crv.degree+i]);
		//}
		nurbs.deriveBasisFunctions(crv.knots,crv.degree,currKnot, u, k, basFunc);
		for(i=0;i<=k;++i) {
			der = derivesW[i];
			vec4.zero(der);
			for(j=0;j<=crv.degree;++j) {
				vec4.scaleAndAdd(der,der,crv.controlPts[currKnot-crv.degree+j],basFunc[i][j]);
			}
		}
		vec3.set(out[0],0,0,0);
		for(i=0;i<=k;++i) {
			vec3.copy(currPt, derivesW[i]);
			for(j=1;j<=i;++j) {
				vec3.scaleAndAdd(currPt,currPt, out[i-j],-nurbs.B[i][j]*derivesW[j][3]);
			}
			//projectDown
			vec3.set(out[i], currPt[0]/derivesW[0][3],currPt[1]/derivesW[0][3],currPt[2]/derivesW[0][3]);
		}
		return out;
	};
})();	 
	  
	  //approximate length, unimplemented
nurbs.crvLength=function(crv) {
	return 1;
}	
	  
nurbs.domain = function(c,b) {
	b = b || new Array(2);
	b[0]=c.knots[c.degree];
	b[1]=c.knots[c.knots.length-(c.degree)-1];
	return b;
}

nurbs.domainSrf = function(c,b) {
	b = b || new Array(2);
	b[0]= [c.knotsU[c.degreeU], c.knotsU[c.knotsU.length-(c.degreeU)-1]];
	b[1]= [c.knotsV[c.degreeV], c.knotsV[c.knotsV.length-(c.degreeV)-1]];
	return b;
}


nurbs.knotMultiplicity = function(i, knots,degree) {
	var knot = knots[i];
	var multi = 1;
	for(var k=i-1;k>i-degree;--k) {
		if(knots[k] != knot) return multi;
		multi++;
	}
	return multi;
}

nurbs.crvPtKnotMultiplicity = function(crv,i) {
	return nurbs.knotMultiplicity(i+crv.degree, crv.knots, crv.degree);
}

nurbs.addPoint = function(crv, pt) {
	crv.controlPts.push(vec4.fromVec3(null,pt));
	var inc = 1;
	var start = crv.knots[crv.degree];
	var end = crv.knots[crv.knots.length-1];
	if(crv.controlPts.length<=crv.degree+1) {
	  crv.knots.push(1);
	} else {
	  var i;
	  for( i=crv.degree+1;i<crv.knots.length-crv.degree;++i) {
		  if(crv.knots[i] != start) {
			  inc = crv.knots[i]-start;
			  i = crv.knots.length; //break?
		  }
	  }
	  crv.knots.push(end+inc);
	  for( i=crv.knots.length-2;i>crv.knots.length-crv.degree-2;--i) {
      crv.knots[i] = end+inc;			  
    }
	  for( i=0;i<crv.knots.length;++i) {
      crv.knots[i] /= end+inc;
    }
	}
}

//insert a knot a u some times
//this should use native array methods not this weird copying
//does this need checks for legal inserts
nurbs.insertKnot = function(crv,u,times) {
  var degree = crv.degree;
  var knots = crv.knots;
  
	if(!times) times = 1;
	var currKnot = nurbs.findKnot(crv.knots,u,crv.degree);
	var multiplicity = nurbs.findMultiplicity(crv.knots,currKnot);
	times = Math.min(degree-times-multiplicity,times);
	if(times <= 0) return;
  //times = Math.max(0,times);
	var newKnots = new Float32Array(crv.knots.length+times);
	var newPoints = new Array(crv.controlPts.length+times);

	var i;
	for(i=0;i<=currKnot;++i) newKnots[i] = crv.knots[i];
	for(i=1;i<=times;++i) newKnots[currKnot+i] = u;
	for(i=currKnot+1;i<crv.knots.length;++i) newKnots[i+times] = crv.knots[i];
	for(i=0;i<=currKnot-crv.degree;++i) newPoints[i] = crv.controlPts[i];
	for(i=currKnot-multiplicity; i<crv.controlPts.length;++i) newPoints[i+times] = crv.controlPts[i];
	var temp = new Array(degree+1);
	for(i=0;i<= crv.degree-multiplicity;++i) temp[i] = crv.controlPts[currKnot-crv.degree+i];
	var j, L,alpha;
	for(j=1;j<=times;++j) {
	 L = currKnot-crv.degree+j;
	 for(i=0;i<=crv.degree-j-multiplicity;++i) {
		 alpha = (u-crv.knots[L+i])/(crv.knots[i+currKnot+1]-crv.knots[L+i]);
		 vec4.scale(temp[i],temp[i],1.0-alpha);
		 vec4.scaleAndAdd(temp[i],temp[i],temp[i+1],alpha);
	 }
	 
	 newPoints[L] = temp[0];
	 newPoints[currKnot+times-j-multiplicity] = temp[crv.degree-j-multiplicity];
	}
	for(i=L+1;i<currKnot-multiplicity;++i) {
	 newPoints[i] = temp[i-L];
	}
	crv.controlPts = newPoints;
	crv.knots = newKnots;
}	  

nurbs.insertKnotArray = function(crv,us) {
   if(us.length == 0) return;
   var startKnot = nurbs.findKnot(crv.knots,us[0],crv.degree);
   var endKnot =nurbs.findKnot(crv.knots,us[us.length-1],crv.degree);
   var newKnots = new Float32Array(crv.knots.length+us.length);
   var newPoints = new Array(crv.controlPts.length+us.length);
   for(var j=0;j<newPoints.length;++j) newPoints[j] = vec4.create();
   for(var j=0;j<=startKnot-crv.degree;++j) vec4.copy(newPoints[j],crv.controlPts[j]);
   for(var j=endKnot-1;j<crv.controlPts.length;++j) vec4.copy(newPoints[j+us.length],crv.controlPts[j]);
   for(var j=0;j<=startKnot;++j) newKnots[j] = crv.knots[j];
   for(var j=endKnot+crv.degree;j<crv.knots.length;++j) newKnots[j+us.length] = crv.knots[j];
   var i=endKnot+crv.degree-1;
   var k= endKnot+crv.degree+us.length-1;
   var j,l;
   for(j=us.length-1;j>=0;--j) {
     while(us[j] <= crv.knots[i] && i>startKnot) {
      vec4.copy(newPoints[k-crv.degree-1],crv.controlPts[i-crv.degree-1]);
       newKnots[k] = crv.knots[i];
       --k;
       --i;
     }
     vec4.copy(newPoints[k-crv.degree-1],newPoints[k-crv.degree]);
     for(l=1;l<=crv.degree;++l) {
       var ind = k-crv.degree+l;
       var alpha = newKnots[k+l]-us[j];
       if(Math.abs(alpha) == 0) vec4.copy(newPoints[ind-1], newPoints[ind]);
       else {
         alpha = alpha/(newKnots[k+l]-crv.knots[i-crv.degree+l]);
         vec4.scale(newPoints[ind-1],newPoints[ind-1],alpha);
         vec4.scaleAndAdd(newPoints[ind-1],newPoints[ind-1],newPoints[ind],1-alpha);
         //newPoints[ind-1] = Vector4D.add(Vector4D.multiply(newPoints[ind-1],alpha), Vector4D.multiply(newPoints[ind],1-alpha));
       }
     }
     newKnots[k] = us[j];
     --k;
   }
   crv.knots = newKnots;
   crv.controlPts = newPoints;
}
	  /*	 
	 public void insertKnots(float[] insertKnots) {
	 }
*/
//make knot values between 0 and 1 aka evaluate(0) = start and evaluate(1) = end
nurbs.normalizeKnots=function(knots) {
	var start = knots[0];
	var end = knots[knots.length-1];
	for(var i=0;i<knots.length;++i) {
		knots[i] = (knots[i]-start)/(end-start);
	}
}

//how many times does a knot appear
nurbs.findMultiplicity = function(knots,knot) {
	var mult = 1;
	var i;
	for(i=knot+1;i<knots.length && knots[i] == knots[knot];++i) ++mult;
	for(i=knot-1;i>=0 && knots[i] == knots[knot];--i) ++mult;

	return mult-1;
}
	 
nurbs.basisFunctions = (function() {
    var left = new Float32Array(10);
    var right = new Float32Array(10);
    return function basisFunctions(knots,degree,knot,u,funcs) {

    	funcs[0] = 1;
    	var j, r, saved, temp;
    	for( j=1;j<=degree;++j) {
    	  left[j] = u-knots[knot+1-j];
    	  right[j] = knots[knot+j]-u;
    	  saved = 0;
    	  for( r = 0;r<j;++r) {
    		temp = funcs[r]/(right[r+1]+left[j-r]);
    		funcs[r] = saved+right[r+1]*temp;
    		saved = left[j-r]*temp;
    	  }
    	  funcs[j] = saved;
    	}
    	return funcs;
    };
})();
	  
	  
nurbs.deriveBasisFunctions = (function() {
	var i,j,r, left, right;
	var s1, s2, k,d,rk,pk,j1,j2;
	
	left = new Float32Array(nurbs.MAX_DEGREE+1);
	right = new Float32Array(nurbs.MAX_DEGREE+1);
	var a = new Array(nurbs.MAX_DEGREE+1);
	var ndu = new Array(nurbs.MAX_DEGREE+1);
	for(i=0;i<nurbs.MAX_DEGREE+1;++i) a[i] = new Float32Array(nurbs.MAX_DEGREE+1);
	for(i=0;i<nurbs.MAX_DEGREE+1;++i) ndu[i] = new Float32Array(nurbs.MAX_DEGREE+1);
	//var basisFuncs = new Array(nurbs.MAX_DEGREE+1);
	//for(i=0;i<nurbs.MAX_DEGREE+1;++i) basisFuncs[i] = new Float32Array(nurbs.MAX_DEGREE+1);
	return function deriveBasisFunctions_(knots,degree,knot, u, der, basisFuncs) {
		ndu[0][0] = 1;
		var saved,temp;
		for(j=1;j<=degree;++j) {
		 left[j] = u-knots[knot+1-j];
		 right[j] = knots[knot+j]-u;
		 saved = 0;
		 for(r=0;r<j;++r) {
			 ndu[j][r] = right[r+1]+left[j-r];
			 temp = ndu[r][j-1]/ndu[j][r];
			 ndu[r][j] = saved+right[r+1]*temp;
			 saved = left[j-r]*temp;
		 }
		 ndu[j][j] = saved;
		}
		for(j=0;j<=degree;++j)
			basisFuncs[0][j] = ndu[j][degree];
		
		for(r=0;r<=degree;++r) {
		 s1 = 0;
		 s2 = 1;
		 a[0][0] = 1;
		 for( k=1;k<=der;++k) {
			 d = 0;
			 rk = r-k;
			 pk = degree-k;
			 if(r>=k) {
				 a[s2][0] = a[s1][0]/ndu[pk+1][rk];
				 d = a[s2][0]*ndu[rk][pk];
			 }
			 j1 = -rk;
			 if(rk>=-1) j1 = 1;
			 j2=degree-r;
			 if(r-1 <=pk) j2 = k-1;
			 
			 for(j=j1;j<=j2;++j) {
				 a[s2][j] = (a[s1][j]-a[s1][j-1])/ndu[pk+1][rk+j];
				 d += a[s2][j]*ndu[rk+j][pk];
			 }
			 if(r<=pk) {
				 a[s2][k] = -a[s1][k-1]/ndu[pk+1][r];
				 d += a[s2][k]*ndu[r][pk];
			 }
			 basisFuncs[k][r] = d;
			 temp =s1;
			 s1 = s2;
			 s2 = temp;	 
		 }
		}
		r = degree;
		for(k=1;k<=der;++k) {
		 for(j=0;j<=degree;++j) basisFuncs[k][j] *= r; 
		 r *= (degree-k);
		}
		return basisFuncs;
	};
})();

nurbs.projectToCurve = function(crv,pt) {
	var estimateU = projectEstimate(crv,pt);
	var nextU = estimateU;
	var domain = nurbs.domain(crv);
	do {
		estimateU = nextU;
		nextU = projectCrvNewton(crv,estimateU,pt);
	} while(Math.abs(estimateU-nextU > 0.001))
	return nextU;
}

var projectCrvNewton = (function() {
	var ptDerivatives = new Array(3);
	var tanEstimate = vec3.create();
	for(var i=0;i<ptDerivatives.length;++i) ptDerivatives[i] = vec3.create();
	return function projectCrvNewton_(crv,u,pt) {
		nurbs.crvDerivatives(crv,u,2,ptDerivatives);
		vec3.sub(tanEstimate, ptDerivatives[0], pt);
		var term1 = vec3.dot(tanEstimate, ptDerivatives[1]);
		var term2 = vec3.dot(tanEstimate,ptDerivatives[2])+vec3.sqrLen(ptDerivatives[1]);
		
		return u-term1/term2;
	}
})();

//this should use convex hull condition to narrow down results
var projectEstimate = (function() {
	var pt2 = vec3.create();
	return function projectEstimate_(crv,pt) { 
		var u;
		var minDist = 9e9;
		var minU = 0;
		var dist;
		for(var i=crv.degree;i<crv.knots.length-crv.degree;++i) {
			var currU = crv.knots[i];
			var nextU = crv.knots[i+1];
			if(currU != nextU) {
				u = currU;
				nurbs.evaluateCrv(crv,u,pt2);
				dist = vec3.sqrDist(pt,pt2);
				if(dist < minDist) {
					minDist = dist;
					minU = u;
				}
				u = (currU+nextU)*0.5;
				nurbs.evaluateCrv(crv,u,pt2);
				dist = vec3.sqrDist(pt,pt2);
				if(dist < minDist) {
					minDist = dist;
					minU = u;
				}

			}
		}
		return minU;
	}
})();


nurbs.projectToCurve2D = function(crv,pt) {
	var estimateU = projectEstimate2D(crv,pt);
	var nextU = estimateU;
	var domain = nurbs.domain(crv);
	do {
		estimateU = nextU;
		nextU = projectCrvNewton2D(crv,estimateU,pt);
    //constrain value
    nextU = Math.clamp(nextU, domain[0], domain[1]);
    
	} while(Math.abs(estimateU-nextU > 0.001))
	return nextU;
}


var projectCrvNewton2D = (function() {
	var ptDerivatives = new Array(3);
	var tanEstimate = vec2.create();
	for(var i=0;i<ptDerivatives.length;++i) ptDerivatives[i] = vec2.create();
	return function projectCrvNewton2D(crv,u,pt) {
		nurbs.crvDerivatives(crv,u,2,ptDerivatives);
		vec2.sub(tanEstimate, ptDerivatives[0], pt);
		var term1 = vec2.dot(tanEstimate, ptDerivatives[1]);
		var term2 = vec2.dot(tanEstimate,ptDerivatives[2])+vec2.sqrLen(ptDerivatives[1]);
     
    var newU = u-term1/term2;
    
		return u-term1/term2;
	}
})();

//this should use convex hull condition to narrow down results
var projectEstimate2D = (function() {
	var pt2 = vec2.create();
	return function projectEstimate2D(crv,pt) { 
		var u;
		var minDist = 9e9;
		var minU = 0;
		var dist;
    var domain = nurbs.domain(crv);
    var samples = crv.controlPts.length*5;
    var domainSpan = domain[1]-domain[0];
    
		for(var i=0;i<samples;++i) {
      u = domain[0]+i/samples*domainSpan;
      nurbs.evaluateCrv(crv,u,pt2);
      dist = vec2.sqrDist(pt,pt2);
      if(dist < minDist) {
        minDist = dist;
        minU = u;
      }
		}
		return minU;
	}
})();

nurbs.circlePt = function(cen,radius) {

	var crv = nurbs.createCrv();
	crv.controlPts = [];
	crv.degree = 2;
	crv.knots = [0,0,0,Math.PI*0.5,Math.PI*0.5, Math.PI, Math.PI, Math.PI*1.5, Math.PI*1.5, Math.PI*2, Math.PI*2,Math.PI*2];
	var SQRT2 = Math.sqrt(2.0)*0.5;
	crv.controlPts = [ vec4.clone([cen[0]+radius,cen[1],cen[2],1]),
		vec4.clone([(cen[0]+radius)*SQRT2,(cen[1]+radius)*SQRT2,cen[2]*SQRT2,SQRT2]),
		vec4.clone([cen[0],cen[1]+radius,cen[2],1]),
		vec4.clone([(cen[0]-radius)*SQRT2,(cen[1]+radius)*SQRT2,cen[2]*SQRT2,SQRT2]),
		vec4.clone([cen[0]-radius,cen[1],cen[2],1]),
		vec4.clone([(cen[0]-radius)*SQRT2,(cen[1]-radius)*SQRT2,cen[2]*SQRT2,SQRT2]),
		vec4.clone([cen[0],cen[1]-radius,cen[2],1]),
		vec4.clone([(cen[0]+radius)*SQRT2,(cen[1]-radius)*SQRT2,cen[2]*SQRT2,SQRT2]),
		vec4.clone([cen[0]+radius,cen[1],cen[2],1]) ];
	return crv;
}	


//--------------------------------------------------------------------------------------
//NURBS SURFACES
//
nurbs.createSrf = function() {
	var srf = {};
	srf.knotsU = [];
	srf.knotsV = [];
	srf.controlPts = [];
	srf.degreeU = [];
	srf.degreeV = [];
	return srf;
}



nurbs.evaluateSrf = function(srf,u,v,pt) {
	pt = pt || vec3.create();
	//if(controlPts.length == 0) return new PVector();
	var uKnot = nurbs.findKnot(srf.knotsU,u,srf.degreeU);
	var vKnot = nurbs.findKnot(srf.knotsV,v,srf.degreeV);
	nurbs.basisFunctions(srf.knotsU, srf.degreeU, uKnot,u,nurbs.basisFuncsU);
	nurbs.basisFunctions(srf.knotsV, srf.degreeV, vKnot,v,nurbs.basisFuncsV);
	
	var evalPt = vec4.create();
	var temp = [];
	var i,j;
	//avoid create commands
	for(i=0;i<=srf.degreeV;++i) {
		temp[i] = vec4.create();
		for(j=0;j<=srf.degreeU;++j) {
			vec4.scaleAndAdd(temp[i], temp[i], srf.controlPts[uKnot-srf.degreeU+j][vKnot-srf.degreeV+i], nurbs.basisFuncsU[j]);
		}
	}
	
	vec4.zero(evalPt);
	for(i=0;i<=srf.degreeV;++i) {
		vec4.scaleAndAdd(evalPt,evalPt, temp[i],nurbs.basisFuncsV[i]);
	}
	return vec4.projectDown(evalPt,pt);
}
    
nurbs.evaluateSrfDerivatives = (function() {
  var tempU = Array(nurbs.MAX_DEGREE+1);
  var tempV = Array(nurbs.MAX_DEGREE+1);
  for(var i=0;i<nurbs.MAX_DEGREE+1;++i) {
    tempU[i] = vec4.create();
    tempV[i] = vec4.create();
  }
  
  var uVec = vec4.create();
  var duVec = vec4.create();
  var dvVec = vec4.create();

	var basFuncU = new Array(nurbs.MAX_DEGREE+1);
	for(i=0;i<nurbs.MAX_DEGREE+1;++i) basFuncU[i] = new Float32Array(nurbs.MAX_DEGREE+1);
  var basFuncV = new Array(nurbs.MAX_DEGREE+1);
	for(i=0;i<nurbs.MAX_DEGREE+1;++i) basFuncV[i] = new Float32Array(nurbs.MAX_DEGREE+1);

  return function(srf,u,v,pt, du, dv) {
    pt = pt || vec3.create();
    //if(controlPts.length == 0) return new PVector();
    var uKnot = nurbs.findKnot(srf.knotsU,u,srf.degreeU);
    var vKnot = nurbs.findKnot(srf.knotsV,v,srf.degreeV);
    //nurbs.basisFunctions(srf.knotsU, srf.degreeU, uKnot,u,nurbs.basisFuncsU);
    //nurbs.basisFunctions(srf.knotsV, srf.degreeV, vKnot,v,nurbs.basisFuncsV);
    nurbs.deriveBasisFunctions(srf.knotsU,srf.degreeU,uKnot, u, 1, basFuncU);
    nurbs.deriveBasisFunctions(srf.knotsV,srf.degreeV,vKnot, v, 1, basFuncV);

    var evalPt = vec4.create();
    var i,j;

    //v
    for(i=0;i<=srf.degreeV;++i) {
      vec4.zero(tempV[i]);
      for(j=0;j<=srf.degreeU;++j) {
        vec4.scaleAndAdd(tempV[i], tempV[i], srf.controlPts[uKnot-srf.degreeU+j][vKnot-srf.degreeV+i], basFuncU[0][j]);
      }
    }
    
    //u side
    for(i=0;i<=srf.degreeU;++i) {
      vec4.zero(tempU[i]);
      for(j=0;j<=srf.degreeV;++j) {
        vec4.scaleAndAdd(tempU[i], tempU[i], srf.controlPts[uKnot-srf.degreeU+i][vKnot-srf.degreeV+j], basFuncV[0][j]);
      }
    }
    
    //do u and v derivatives
    vec4.zero(uVec);
    for(j=0;j<=srf.degreeU;++j) {
      vec4.scaleAndAdd(uVec,uVec,tempU[j],basFuncU[0][j]);
    }
    vec4.zero(duVec);
    for(j=0;j<=srf.degreeU;++j) {
      vec4.scaleAndAdd(duVec,duVec,tempU[j],basFuncU[1][j]);
    }

    vec4.zero(dvVec);
    for(j=0;j<=srf.degreeV;++j) {
      vec4.scaleAndAdd(dvVec,dvVec,tempV[j],basFuncV[1][j]);
    }
    
    vec3.copy(pt, uVec);
    //project down
    vec3.set(pt, pt[0]/uVec[3], pt[1]/uVec[3], pt[2]/uVec[3]);
    
    vec3.copy(du, duVec);
    vec3.scaleAndAdd(du,du, pt, -nurbs.B[1][1]*duVec[3]);
    vec3.set(du, du[0]/uVec[3], du[1]/uVec[3], du[2]/uVec[3]);
    
    vec3.copy(dv, dvVec);
    vec3.scaleAndAdd(dv,dv, pt, -nurbs.B[1][1]*dvVec[3]);
    vec3.set(dv, dv[0]/uVec[3], dv[1]/uVec[3], dv[2]/uVec[3]);
    
    return pt;
  };
})();
	/*

	NurbsCurve isocurve(float u, boolean dir) {
		int uKnot = findKnot(u,knotsU,degreeU);
		float[] basFunc = basisFunctions(uKnot,u,knotsU,degreeU);
		Vector4D[][] hPts = new Vector4D[degreeU+1][degreeV+1];
		for(int i=0;i<controlPts.length;++i) {
			for(int j=0;j<controlPts[0].length;++j) {
				PVector ctrlPt = controlPts[i][j];
				float w = weights[i][j];
				hPts[i][j] = new Vector4D(ctrlPt.x*w, ctrlPt.y*w,ctrlPt.z*w,w);
			}
		}
		Vector4D[] newPts = new Vector4D[controlPts[0].length];
		for(int i=0;i<controlPts[0].length;++i) {
			for(int j=0;j<=degreeU;++j) {
				newPts[i] = Vector4D.add(newPts[i],Vector4D.multiply(hPts[uKnot-degreeU+j][i], basFunc[j]));
			}
		}
		
		PVector[] newCPts = new PVector[newPts.length];
		float[] newWeights = new float[newPts.length];
		for(int i=0;i<newPts.length;++i) {
			newCPts[i] = new PVector(newPts[i].x*newPts[i].w,newPts[i].y*newPts[i].w,newPts[i].z*newPts[i].w);
			newWeights[i] = newPts[i].w;
		}
		return new NurbsCurve(newCPts, knotsV, newWeights, degreeV);
	}
	
	*/
	
  //THIS SHOULD TAKE AN ARRAY OF CURVES THIS IS STUPID WHAT THE HELL IS WRONG WITH ME
nurbs.loft = function(crv1,crv2) {
	//do degree elevation
	if(crv1.degree != crv2.degree) return null;
	var temp1 = nurbs.copyCrv(crv1);
	var temp2 = nurbs.copyCrv(crv2);
	nurbs.normalizeKnots(temp1.knots);
	nurbs.normalizeKnots(temp2.knots);
	//find difference
	var k = 0,i;
	var insertTemp1 = [];
	var insertTemp2 = [];
	for(i=0;i<temp1.knots.length;++i) {
		while(k < temp2.knots.length && temp2.knots[k] < temp1.knots[i] ) {
			insertTemp1.push(temp2.knots[k]);
			++k;
		}
		if(temp2.knots[k] > temp1.knots[i]) insertTemp2.push(temp1.knots[i]);
		if(temp2.knots[k] == temp1.knots[i]) ++k;
	}
	while(k<temp2.knots.length) {
		insertTemp1.push(temp2.knots[k]);
		++k;
	}
	if(insertTemp1.length > 0) nurbs.insertKnotArray(temp1,insertTemp1);
	if(insertTemp2.length > 0) nurbs.insertKnotArray(temp2,insertTemp2);
	
	var pts = new Array(temp1.controlPts.length);
	for(i=0;i<pts.length;++i) {
		pts[i] = [temp1.controlPts[i], temp2.controlPts[i]];
	}
	
	var toReturn = nurbs.createSrf();
	toReturn.controlPts = pts;
	toReturn.degreeU = temp1.degree;
	toReturn.degreeV = 1;
	toReturn.knotsV = [0,0,1,1]; //this might be wrong
	for(i=0;i<temp1.knots.length;++i) {
		toReturn.knotsU[i] = temp1.knots[i];
	}
	return toReturn;
}

//watch for rounding errors
nurbs.loft = function(crvs) {
  //sanity check
  if(crvs.length < 2) return;
  //CHANGE: check if all closed or all open
  
	//do degree elevation
  var maxDegree = 1;
  var i,j,k;
  for(i=0;i<crvs.length;++i) {
    maxDegree = Math.max(maxDegree, crvs[i].degree);
  }
  //no degree elevation yet
  
  var tempCrvs = new Array(crvs.length);
  for(i=0;i<crvs.length;++i) {
    tempCrvs[i] = nurbs.copyCrv(crvs[i]);
    nurbs.normalizeKnots(tempCrvs[i].knots);
  }
  
  //get master knot list, should be an efficient way to merge sorted lists
  //might need to do something for closed curves?
  var allKnots = tempCrvs[0].knots.slice(0);
  for(i=1;i<crvs.length;++i) {
    var curKnots = tempCrvs[i].knots;
    //splicing not very efficient
    var k=0;
    for(j=0;j<allKnots.length;++j) {
      while(curKnots[k] < allKnots[j]) {
        allKnots.splice(j,0,curKnots[k]);
        k++;
      }
      if(allKnots[j] == curKnots[k]) {
        k++;
      } 
    }
  }
  
  //insert knots in all curves to normalize knot vectors
  var insertArr = [];
  for(i=0;i<tempCrvs.length;++i) {
    var crv = tempCrvs[i];
    insertArr.length = 0;
    var curKnots = crv.knots;
    
    //get missing knots
    k=0;
    for(j=0;j<curKnots.length;++j) {
      while(allKnots[k] < curKnots[j]) {
        insertArr.push(allKnots[k]);
        k++;
      }
      if(allKnots[k] == curKnots[j]) {
        k++;
      }
    }
    
    nurbs.insertKnotArray(crv, insertArr);
    
  }
  
  var pts = new Array(tempCrvs[0].controlPts.length);
  for(i=0;i<pts.length;++i) {
    pts[i] = new Array(tempCrvs.length);
    for(j=0;j<tempCrvs.length;++j) {
      pts[i][j] = tempCrvs[j].controlPts[i];
    }
  }
  
  var vDegree =  Math.min(tempCrvs.length-1,3);
	var toReturn = nurbs.createSrf();
	toReturn.controlPts = pts;
	toReturn.degreeU = maxDegree;
	toReturn.degreeV = vDegree;
  
  for(i=0;i<vDegree+1;++i) {
    toReturn.knotsV.push(0);
  }
  k = 1;
  for(i=0;i<tempCrvs.length-vDegree-1;++i) {
    toReturn.knotsV.push(k++);
  }
  for(i=0;i<vDegree+1;++i) {
    toReturn.knotsV.push(k);
  }
	//toReturn.knotsV = [0,0,1,1]; 
  toReturn.knotsU = allKnots;
	return toReturn;
  
	
 }

//revolve
nurbs.revolve = function(crv, axis) {

}

nurbs.sweep = function(crv1,crv2) {

}

return nurbs;
});