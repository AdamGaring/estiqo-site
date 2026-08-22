/* ============================================================
   Estiqo — molten metal
   ------------------------------------------------------------
   Flowing caustic filaments behind the hero and the closing CTA,
   ported to dependency-free WebGL2 from react-bits' MoltenMetal
   (reactbits.dev, MIT). `ogl` is a wrapper around one fragment
   shader — as with Aurora, the port drops it and keeps the page
   free of a build step.

   Contract, the same one every effect on this page signs:
   - Enhancement only. No WebGL2, reduced motion, or a lost
     context and the hero keeps its CSS beam/bloom; sections
     carrying `data-molten` gain `.has-molten` only on success.
   - The render loop runs only while the host is on screen and
     the tab is visible.
   - DPR capped, harder on phones.
   ============================================================ */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hosts = document.querySelectorAll("[data-molten]");
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
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "uniform float uSpeed;",
    "uniform float uScale;",
    "uniform float uDetail;",
    "uniform float uGlow;",
    "uniform float uCoreSize;",
    "uniform float uSwirl;",
    "uniform float uFold;",
    "uniform float uBlackPoint;",
    "uniform float uBrightness;",
    "uniform float uColorMode;",
    "uniform float uGrain;",
    "uniform float uGrainIntensity;",
    "uniform float uOpacity;",
    "uniform vec2 uMouse;",
    "uniform float uMouseStrength;",
    "uniform bool uEnableMouse;",
    "uniform vec3 uColor1;",
    "uniform vec3 uColor2;",
    "uniform vec3 uColor3;",
    "out vec4 fragColor;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}",
    "void main(){",
    "  float time = iTime * uSpeed;",
    "  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;",
    "  vec2 drift = vec2(0.0);",
    "  if (uEnableMouse) { drift = (uMouse - 0.5) * uMouseStrength * 2.0; }",
    "  p += drift;",
    "  vec2 i = p;",
    "  float c = 0.0;",
    "  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);",
    "  float d = length(p);",
    "  float rot = d + time + p.x * uSwirl;",
    "  float cosRot = cos(rot);",
    "  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;",
    "  float glowCore = uGlow * uCoreSize;",
    "  for (float n = 0.0; n < 8.0; n++) {",
    "    if (n >= uDetail) break;",
    "    p *= warp;",
    "    float t = r - time / (n + 3.0);",
    "    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);",
    "    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));",
    "  }",
    "  c /= 6.0;",
    "  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;",
    "  float g = clamp(intensity, 0.0, 1.0);",
    "  float mid = 0.5;",
    "  if (uColorMode > 1.5) { mid = 0.65; } else if (uColorMode > 0.5) { mid = 0.35; }",
    "  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));",
    "  col = mix(col, uColor3, smoothstep(mid, 1.0, g));",
    "  float a = g;",
    "  if (uGrain > 0.5) { float gr = hash(gl_FragCoord.xy + iTime); a += (gr - 0.5) * uGrainIntensity; }",
    "  a = clamp(a, 0.0, 1.0) * uOpacity;",
    "  fragColor = vec4(col * a, a);",
    "}"
  ].join("\n");

  /* The configuration supplied for this page: brand green through a
     brighter leaf tone into the app's deep green core. */
  var CFG = {
    color1: [0.122, 0.616, 0.388], // #1F9D63
    color2: [0.047, 0.678, 0.173], // #0CAD2C
    color3: [0.000, 0.384, 0.255], // #006241
    speed: 0.2,
    scale: 4.3,
    detail: 4,
    glow: 2.05,
    coreSize: 0.1,
    swirl: 0.55,
    fold: -0.24,
    blackPoint: 0.08,
    brightness: 1.45,
    colorMode: 0,      // molten
    grain: 0,
    grainIntensity: 0,
    mouseInteraction: false,
    mouseStrength: 0.25,
    opacity: 1.0
  };

  function setup(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "molten-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power"
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
    var U = {
      iTime: u("iTime"), iResolution: u("iResolution"), uMouse: u("uMouse")
    };
    gl.uniform1f(u("uSpeed"), CFG.speed);
    gl.uniform1f(u("uScale"), CFG.scale);
    gl.uniform1f(u("uDetail"), CFG.detail);
    gl.uniform1f(u("uGlow"), CFG.glow);
    gl.uniform1f(u("uCoreSize"), Math.max(CFG.coreSize, 0.001));
    gl.uniform1f(u("uSwirl"), CFG.swirl);
    gl.uniform1f(u("uFold"), CFG.fold);
    gl.uniform1f(u("uBlackPoint"), CFG.blackPoint);
    gl.uniform1f(u("uBrightness"), CFG.brightness);
    gl.uniform1f(u("uColorMode"), CFG.colorMode);
    gl.uniform1f(u("uGrain"), CFG.grain);
    gl.uniform1f(u("uGrainIntensity"), CFG.grainIntensity);
    gl.uniform1f(u("uOpacity"), CFG.opacity);
    gl.uniform1f(u("uMouseStrength"), CFG.mouseStrength);
    gl.uniform1i(u("uEnableMouse"), CFG.mouseInteraction ? 1 : 0);
    gl.uniform3fv(u("uColor1"), new Float32Array(CFG.color1));
    gl.uniform3fv(u("uColor2"), new Float32Array(CFG.color2));
    gl.uniform3fv(u("uColor3"), new Float32Array(CFG.color3));
    gl.uniform2f(U.uMouse, 0.5, 0.5);

    host.appendChild(canvas);
    host.classList.add("has-molten");

    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 861 ? 1.25 : 1.5);
    function resize() {
      var w = Math.max(1, host.clientWidth);
      var h = Math.max(1, host.clientHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.iResolution, canvas.width, canvas.height);
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
      host.classList.remove("has-molten"); // CSS beam takes back over
      canvas.remove();
    });

    var t0 = performance.now();
    function tick(now) {
      if (dead) return;
      requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      gl.uniform1f(U.iTime, (now - t0) * 0.001);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(tick);
  }

  hosts.forEach(setup);
})();
