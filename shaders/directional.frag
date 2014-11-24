precision mediump float;

varying vec3 vTransformedNormal;
varying vec4 vPosition;
    
uniform vec3 uMaterialDiffuseColor;

//uniform vec3 uLightingDirection;
        
void main(void) {
  vec3 materialDiffuseColor = uMaterialDiffuseColor;
  vec3 ambientLightWeighting = vec3(.2,.2,.2);
  vec3 directionalColor = vec3(.8,.8,.8);
  vec3 normal = normalize(vTransformedNormal);
  vec3 uLightingDirection = vec3(-0.57,-0.57,-0.57);
  float diffuseLightBrightness = abs(dot(normal,uLightingDirection));
  vec3 diffuseLightWeighting = diffuseLightBrightness*directionalColor;
  vec3 r = -reflect(uLightingDirection, normal);
  r = normalize(r);
  vec3 v = -vPosition.xyz;
  v = normalize(v);
  vec4 spec = vec4(.5,.5,.5,1.0)*pow(max(0.0,dot(r, v)), 16.0);
  gl_FragColor = vec4(ambientLightWeighting * materialDiffuseColor
                      + materialDiffuseColor * diffuseLightWeighting,
                      1.0)+spec;
}
