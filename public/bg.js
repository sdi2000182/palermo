// Balatro-style swirling paint background, rendered small and scaled up for a pixel look.
(function () {
  'use strict';
  const canvas = document.getElementById('bg');
  const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
  window.bgMood = 0; // 0 = day (red/blue), 1 = night (deep blue)
  if (!gl) { canvas.classList.add('fallback'); return; }
  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
uniform float t; uniform vec2 res; uniform float mood;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*res)/min(res.x,res.y);
  float r=length(uv), a=atan(uv.y,uv.x);
  a+=t*.12+r*2.4-.35*sin(t*.17);
  vec2 q=vec2(cos(a),sin(a))*r*3.2;
  for(int i=0;i<5;i++){ q+=vec2(sin(q.y*1.25+t*.27),cos(q.x*1.1-t*.21))*.42; }
  float v=sin(q.x+q.y)*.5+.5, w=sin(length(q)*1.6-t*.35)*.5+.5;
  vec3 red=mix(vec3(.87,.27,.23),vec3(.20,.18,.45),mood);
  vec3 blue=mix(vec3(0.,.42,.71),vec3(.05,.20,.40),mood);
  vec3 dark=vec3(.09,.13,.14);
  vec3 col=mix(red,blue,smoothstep(.3,.7,v));
  col=mix(col,dark,smoothstep(.42,.86,w)*.88);
  col=floor(col*7.)/7.;
  gl_FragColor=vec4(col*(.78-.25*mood),1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.classList.add('fallback'); return; }
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(pr, 't'), uRes = gl.getUniformLocation(pr, 'res'), uMood = gl.getUniformLocation(pr, 'mood');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mood = 0, last = 0;
  function size() {
    const s = 5; // render at 1/5 size, CSS scales it up pixelated
    canvas.width = Math.max(1, Math.ceil(innerWidth / s)); canvas.height = Math.max(1, Math.ceil(innerHeight / s));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  addEventListener('resize', size); size();
  function frame(now) {
    if (now - last > 33 || still) {
      last = now;
      mood += (window.bgMood - mood) * 0.04;
      gl.uniform1f(uT, now / 1000); gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uMood, mood);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (!still || Math.abs(window.bgMood - mood) > 0.01) requestAnimationFrame(frame);
    else setTimeout(() => requestAnimationFrame(frame), 1000);
  }
  requestAnimationFrame(frame);
})();
