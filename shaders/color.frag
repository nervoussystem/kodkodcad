precision mediump float;

uniform vec3 uMaterialColor;
        
void main(void) {
      
  gl_FragColor = vec4(uMaterialColor,
                      1.0);
}