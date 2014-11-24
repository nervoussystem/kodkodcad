precision mediump float;

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
    
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;
uniform vec3 uAmbientLightingColor;
uniform vec3 uDirectionalDiffuseColor;

varying vec3 vTransformedNormal;
varying vec4 vPosition;

void main(void) {
   gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
   vPosition = uMVMatrix * vec4(aVertexPosition, 1.0);
   vTransformedNormal =  aVertexNormal;//uNMatrix *
}