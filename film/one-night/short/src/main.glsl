void main(){
  vec2 uv = vUV;
  vec2 ndc = (uv-0.5)*vec2(uRes.x/uRes.y, 1.0);
  vec3 fwd = normalize(uCamTgt - uCamPos);
  vec3 right = normalize(cross(vec3(0.0,1.0,0.0), fwd));
  vec3 up = cross(fwd, right);
  float cr = cos(uRoll), sr = sin(uRoll);
  gRight = right*cr + up*sr; gUp = up*cr - right*sr; gFwd = fwd;
  gFocal = 0.5/tan(uFov*0.5);
  vec3 rd = normalize(fwd*gFocal + gRight*ndc.x + gUp*ndc.y);
  vec3 col = render(uCamPos, rd, uv);
  gl_FragColor = vec4(grade(col, uv), 1.0);
}
