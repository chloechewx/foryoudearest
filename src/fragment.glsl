//fragment controls color and appearance
varying vec3 vColor;

void main() {
  float strength = distance(gl_PointCoord, vec2(0.4));
  strength = 1.0 - strength;
  
  float sharpness = 4.0;
  strength = pow(strength, sharpness);
  
  if (strength < 0.03) discard;
  
  vec3 color = mix(vec3(0.0), vColor, vec3(strength));
  gl_FragColor = vec4(color, strength);
}

