void main(){
  vec2 frag = gl_FragCoord.xy + uJitter;
  vec2 ndc = (frag/uRes - 0.5)*vec2(uRes.x/uRes.y, 1.0);
  vec3 fwd = normalize(uCamTgt - uCamPos);
  vec3 right = normalize(cross(vec3(0.0,1.0,0.0), fwd));
  vec3 up = cross(fwd, right);
  float cr = cos(uRoll), sr = sin(uRoll);
  gRight = right*cr + up*sr; gUp = up*cr - right*sr; gFwd = fwd;
  gFocal = 0.5/tan(uFov*0.5);
  vec3 rd = normalize(fwd*gFocal + gRight*ndc.x + gUp*ndc.y);
  vec4 r = render(uCamPos, rd, frag/uRes);
  // depth along the view axis, so focus is flat across the frame
  float z = r.w*dot(rd, fwd);
  fragColor = vec4(max(r.rgb, 0.0)/uK, min(z, 3000.0)/uK);
}
