precision mediump float;

attribute vec3 aVertexPosition;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uNMatrix;

void main(void) {
   gl_PointSize = 3.0;
   
   gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}