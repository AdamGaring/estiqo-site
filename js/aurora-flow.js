/* ============================================================
   Estiqo — aurora
   ------------------------------------------------------------
   Northern-lights curtains hanging over the page's dark chapter,
   ported to dependency-free WebGL2 from react-bits' Aurora
   (reactbits.dev/backgrounds/aurora, MIT). The `ogl` library the
   component ships with is, like Three.js under LaserFlow, only a
   wrapper around one fragment shader — so the port drops it.

   Wiring: every section carrying `data-aurora` gets a canvas
   pinned across its upper portion, behind the content. Same
   contract as the laser: enhancement only (no WebGL2, reduced
   motion, or a lost context and the section keeps its existing
   liquid field), render loop gated on visibility, DPR capped.
   ============================================================ */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hosts = document.querySelectorAll("[data-aurora]");
  if (!hosts.length) return;

  var VERT = [
    "#version 300 es",
    "in vec2 position;",
    "void main(){gl_Position=vec4(position,0.0,1.0);}"
  ].join("\n");

  /* Verbatim from the component, minus the React/ogl scaffolding. */
  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "uniform float uTime;",
    "uniform float uAmplitude;",
    "uniform vec3 uColorStops[3];",
    "uniform vec2 uResolution;",
    "uniform float uBlend;",
    "out vec4 fragColor;",
    "vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}",
    "float snoise(vec2 v){",
    "  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);",
    "  vec2 i=floor(v+dot(v,C.yy));",
    "  vec2 x0=v-i+dot(i,C.xx);",
    "  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);",
    "  vec4 x12=x0.xyxy+C.xxzz;",
    "  x12.xy-=i1;",
    "  i=mod(i,289.0);",
    "  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));",
    "  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);",
    "  m=m*m; m=m*m;",
    "  vec3 x=2.0*fract(p*C.www)-1.0;",
    "  vec3 h=abs(x)-0.5;",
    "  vec3 ox=floor(x+0.5);",
    "  vec3 a0=x-ox;",
    "  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);",
    "  vec3 g;",
    "  g.x=a0.x*x0.x+h.x*x0.y;",
    "  g.yz=a0.yz*x12.xz+h.yz*x12.yw;",
    "  return 130.0*dot(m,g);",
    "}",
    "struct ColorStop { vec3 color; float position; };",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uResolution;",
    "  ColorStop colors[3];",
    "  colors[0]=ColorStop(uColorStops[0],0.0);",
    "  colors[1]=ColorStop(uColorStops[1],0.5);",
    "  colors[2]=ColorStop(uColorStops[2],1.0);",
    "  int index=0;",
    "  for(int i=0;i<2;i++){",
    "    bool isInBetween=colors[i].position<=uv.x;",
    "    index=int(mix(float(index),float(i),float(isInBetween)));",
    "  }",
    "  ColorStop currentColor=colors[index];",
    "  ColorStop nextColor=colors[index+1];",
    "  float range=nextColor.position-currentColor.position;",
    "  float lerpFactor=(uv.x-currentColor.position)/range;",
    "  vec3 rampColor=mix(currentColor.color,nextColor.color,lerpFactor);",
    "  float height=snoise(vec2(uv.x*2.0+uTime*0.1,uTime*0.25))*0.5*uAmplitude;",
    "  height=exp(height);",
    "  height=(uv.y*2.0-height+0.2);",
    "  float intensity=0.6*height;",
    "  float midPoint=0.20;",
    "  float auroraAlpha=smoothstep(midPoint-uBlend*0.5,midPoint+uBlend*0.5,intensity);",
    "  vec3 auroraColor=intensity*rampColor;",
    "  fragColor=vec4(auroraColor*auroraAlpha,auroraAlpha);",
    "}"
  ].join("\n");

  /* The brand on the night sky: bright leaf light through the accent
     down to the app's own green. */
  var STOPS = [
    [0.486, 1.0, 0.404],   // #7CFF67
    [0.149, 0.898, 0.651], // #26E5A6
    [0.122, 0.616, 0.388]  // #1F9D63
  ];
  var SPEED = 0.5, AMPLITUDE = 1.0, BLEND = 0.5;

  function setup(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "aurora-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power"
    });
    if (!gl) return; // the liquid field remains the section's sky

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var U = {
      uTime: gl.getUniformLocation(prog, "uTime"),
      uAmplitude: gl.getUniformLocation(prog, "uAmplitude"),
      uColorStops: gl.getUniformLocation(prog, "uColorStops[0]"),
      uResolution: gl.getUniformLocation(prog, "uResolution"),
      uBlend: gl.getUniformLocation(prog, "uBlend")
    };
    gl.uniform1f(U.uAmplitude, AMPLITUDE);
    gl.uniform1f(U.uBlend, BLEND);
    gl.uniform3fv(U.uColorStops, new Float32Array([].concat.apply([], STOPS)));

    host.appendChild(canvas);

    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 861 ? 1.25 : 1.5);
    function resize() {
      var w = Math.max(1, host.clientWidth);
      var h = Math.max(1, Math.round(Math.min(host.clientHeight * 0.62, 560)));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);

    var visible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { rootMargin: "80px 0px" }).observe(host);
    } else {
      visible = true;
    }

    var dead = false;
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      dead = true;
      canvas.remove();
    });

    var t0 = performance.now();
    function tick(now) {
      if (dead) return;
      requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      gl.uniform1f(U.uTime, ((now - t0) / 1000) * SPEED);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(tick);
  }

  hosts.forEach(setup);
})();
