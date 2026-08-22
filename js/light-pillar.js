/* ============================================================
   Estiqo — light pillar
   ------------------------------------------------------------
   A raymarched column of light standing behind the pinned hub,
   ported to dependency-free WebGL1 from react-bits' LightPillar
   (reactbits.dev, MIT). Three.js was, once again, a wrapper
   around a single fragment shader.

   Two deliberate departures from the source, both forced:

   1. `tanh()` doesn't exist in GLSL ES 1.00 — Three.js was
      silently compiling the shader as GLSL 3.00. Polyfilled
      below, with the input clamped because exp(2x) overflows to
      inf at large x and inf/inf is NaN (a black screen).

   2. The component writes alpha 1.0 and relies on CSS
      `mix-blend-mode` to drop its black background. This page is
      light in one theme and dark in the other, where `screen`
      would erase the pillar and `normal` would paint a black
      box over the section. So luminance becomes coverage —
      the same premultiplied approach the other shaders here
      use — and the effect composites correctly over both.

   Standard contract: enhancement only, renders solely while on
   screen and the tab is visible, resolution scaled well below
   device pixel ratio (this is a raymarcher — the source does
   the same), and reduced motion never boots it.
   ============================================================ */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hosts = document.querySelectorAll("[data-pillar]");
  if (!hosts.length) return;

  /* The source's own quality ladder. A raymarch loop is priced per
     iteration per pixel, so both the count and the buffer scale drop
     together on weaker hardware. */
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isLowEnd = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  var Q = isMobile
    ? { iterations: 24, waveIterations: 1, pixelRatio: 0.5, precision: "mediump", stepMultiplier: 1.5, fps: 30 }
    : isLowEnd
      ? { iterations: 40, waveIterations: 2, pixelRatio: 0.65, precision: "mediump", stepMultiplier: 1.2, fps: 60 }
      : { iterations: 56, waveIterations: 3, pixelRatio: 0.75, precision: "highp", stepMultiplier: 1.1, fps: 60 };

  /* The supplied configuration. */
  var CFG = {
    topColor: [0.0, 0.455, 0.161],     // #007429
    bottomColor: [0.031, 0.604, 0.102], // #089A1A
    intensity: 0.5,
    rotationSpeed: 0.3,
    glowAmount: 0.003,
    pillarWidth: 4.4,
    pillarHeight: 0.2,
    noiseIntensity: 0.5,
    pillarRotation: 50,
    interactive: false
  };

  var VERT = [
    "attribute vec2 position;",
    "varying vec2 vUv;",
    "void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision " + Q.precision + " float;",
    "uniform float uTime;",
    "uniform vec2 uResolution;",
    "uniform vec3 uTopColor;",
    "uniform vec3 uBottomColor;",
    "uniform float uIntensity;",
    "uniform float uGlowAmount;",
    "uniform float uPillarWidth;",
    "uniform float uPillarHeight;",
    "uniform float uNoiseIntensity;",
    "uniform float uRotCos;",
    "uniform float uRotSin;",
    "uniform float uPillarRotCos;",
    "uniform float uPillarRotSin;",
    "uniform float uWaveSin;",
    "uniform float uWaveCos;",
    "uniform float uAlphaGain;",
    "varying vec2 vUv;",
    "const float STEP_MULT = " + Q.stepMultiplier.toFixed(1) + ";",
    "const int MAX_ITER = " + Q.iterations + ";",
    "const int WAVE_ITER = " + Q.waveIterations + ";",
    /* GLSL ES 1.00 has no tanh; clamped to keep exp() finite. */
    "vec3 tanh3(vec3 x){ x = clamp(x, -8.0, 8.0); vec3 e = exp(2.0 * x); return (e - 1.0) / (e + 1.0); }",
    "void main() {",
    "  vec2 uv = (vUv * 2.0 - 1.0) * vec2(uResolution.x / uResolution.y, 1.0);",
    "  uv = vec2(uPillarRotCos * uv.x - uPillarRotSin * uv.y, uPillarRotSin * uv.x + uPillarRotCos * uv.y);",
    "  vec3 ro = vec3(0.0, 0.0, -10.0);",
    "  vec3 rd = normalize(vec3(uv, 1.0));",
    "  float rotC = uRotCos;",
    "  float rotS = uRotSin;",
    "  vec3 col = vec3(0.0);",
    "  float t = 0.1;",
    "  for(int i = 0; i < MAX_ITER; i++) {",
    "    vec3 p = ro + rd * t;",
    "    p.xz = vec2(rotC * p.x - rotS * p.z, rotS * p.x + rotC * p.z);",
    "    vec3 q = p;",
    "    q.y = p.y * uPillarHeight + uTime;",
    "    float freq = 1.0;",
    "    float amp = 1.0;",
    "    for(int j = 0; j < WAVE_ITER; j++) {",
    "      q.xz = vec2(uWaveCos * q.x - uWaveSin * q.z, uWaveSin * q.x + uWaveCos * q.z);",
    "      q += cos(q.zxy * freq - uTime * float(j) * 2.0) * amp;",
    "      freq *= 2.0;",
    "      amp *= 0.5;",
    "    }",
    "    float d = length(cos(q.xz)) - 0.2;",
    "    float bound = length(p.xz) - uPillarWidth;",
    "    float k = 4.0;",
    "    float h = max(k - abs(d - bound), 0.0);",
    "    d = max(d, bound) + h * h * 0.0625 / k;",
    "    d = abs(d) * 0.15 + 0.01;",
    "    float grad = clamp((15.0 - p.y) / 30.0, 0.0, 1.0);",
    "    col += mix(uBottomColor, uTopColor, grad) / d;",
    "    t += d * STEP_MULT;",
    "    if(t > 50.0) break;",
    "  }",
    "  float widthNorm = uPillarWidth / 3.0;",
    "  col = tanh3(col * uGlowAmount / widthNorm);",
    "  col -= fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 15.0 * uNoiseIntensity;",
    "  col = max(col, 0.0) * uIntensity;",
    /* Luminance becomes coverage, so the pillar composites over either
       theme instead of needing a blend mode that only suits one. */
    "  float a = clamp(max(col.r, max(col.g, col.b)) * uAlphaGain, 0.0, 1.0);",
    "  gl_FragColor = vec4(col * a, a);",
    "}"
  ].join("\n");

  function setup(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "pillar-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl", {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true,
      powerPreference: isLowEnd ? "low-power" : "high-performance"
    });
    if (!gl) return;

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

    function u(n) { return gl.getUniformLocation(prog, n); }
    var U = { uTime: u("uTime"), uResolution: u("uResolution"), uRotCos: u("uRotCos"), uRotSin: u("uRotSin"), uAlphaGain: u("uAlphaGain") };

    var rad = CFG.pillarRotation * Math.PI / 180;
    gl.uniform3fv(u("uTopColor"), new Float32Array(CFG.topColor));
    gl.uniform3fv(u("uBottomColor"), new Float32Array(CFG.bottomColor));
    gl.uniform1f(u("uIntensity"), CFG.intensity);
    gl.uniform1f(u("uGlowAmount"), CFG.glowAmount);
    gl.uniform1f(u("uPillarWidth"), CFG.pillarWidth);
    gl.uniform1f(u("uPillarHeight"), CFG.pillarHeight);
    gl.uniform1f(u("uNoiseIntensity"), CFG.noiseIntensity);
    gl.uniform1f(u("uPillarRotCos"), Math.cos(rad));
    gl.uniform1f(u("uPillarRotSin"), Math.sin(rad));
    gl.uniform1f(u("uWaveSin"), Math.sin(0.4));
    gl.uniform1f(u("uWaveCos"), Math.cos(0.4));

    var dark = window.matchMedia("(prefers-color-scheme: dark)");
    function applyTheme() { gl.uniform1f(U.uAlphaGain, dark.matches ? 1.35 : 1.7); }
    applyTheme();
    if (dark.addEventListener) dark.addEventListener("change", applyTheme);

    host.appendChild(canvas);
    host.classList.add("has-pillar");

    function resize() {
      var w = Math.max(1, host.clientWidth);
      var h = Math.max(1, host.clientHeight);
      canvas.width = Math.max(1, Math.round(w * Q.pixelRatio));
      canvas.height = Math.max(1, Math.round(h * Q.pixelRatio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uResolution, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);

    var visible = false;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; },
        { rootMargin: "80px 0px" }).observe(host);
    } else { visible = true; }

    var dead = false;
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      dead = true;
      host.classList.remove("has-pillar");
      canvas.remove();
    });

    var time = 0, last = performance.now(), frameTime = 1000 / Q.fps;
    function tick(now) {
      if (dead) return;
      requestAnimationFrame(tick);
      if (!visible || document.hidden) { last = now; return; }
      var dt = now - last;
      if (dt < frameTime) return;
      last = now - (dt % frameTime);
      time += 0.016 * CFG.rotationSpeed;
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uRotCos, Math.cos(time * 0.3));
      gl.uniform1f(U.uRotSin, Math.sin(time * 0.3));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(tick);
  }

  hosts.forEach(setup);
})();
