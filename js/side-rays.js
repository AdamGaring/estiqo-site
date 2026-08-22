/* ============================================================
   Estiqo — side rays
   ------------------------------------------------------------
   A fan of light raking in from the top-right corner of the
   "Getting started" band, ported to dependency-free WebGL1 from
   react-bits' SideRays (reactbits.dev, MIT). As with the other
   three shaders on this page, `ogl` was only ever a wrapper.

   The shader already writes luminance into alpha itself
   (`color.a = max(r,max(g,b)) * iOpacity`), so unlike LightPillar
   this one composites over either theme untouched — the only
   addition is a premultiply to match the page's blend setup.

   Same contract as its siblings: enhancement only, renders only
   while the section is on screen and the tab is visible, DPR
   capped, and reduced motion never boots it.
   ============================================================ */

(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hosts = document.querySelectorAll("[data-rays]");
  if (!hosts.length) return;

  var VERT = [
    "attribute vec2 position;",
    "void main(){ gl_Position = vec4(position, 0.0, 1.0); }"
  ].join("\n");

  /* Verbatim from the component, with the final line premultiplied. */
  var FRAG = [
    "precision highp float;",
    "uniform float iTime;",
    "uniform vec2 iResolution;",
    "uniform float iSpeed;",
    "uniform vec3 iRayColor1;",
    "uniform vec3 iRayColor2;",
    "uniform float iIntensity;",
    "uniform float iSpread;",
    "uniform float iFlipX;",
    "uniform float iFlipY;",
    "uniform float iTilt;",
    "uniform float iSaturation;",
    "uniform float iBlend;",
    "uniform float iFalloff;",
    "uniform float iOpacity;",
    "float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {",
    "  vec2 sourceToCoord = coord - raySource;",
    "  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);",
    "  return clamp(",
    "    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +",
    "    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),",
    "    0.0, 1.0) *",
    "    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);",
    "}",
    "void main() {",
    "  vec2 fragCoord = gl_FragCoord.xy;",
    "  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;",
    "  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;",
    "  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);",
    "  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);",
    "  float tiltRad = iTilt * 3.14159265 / 180.0;",
    "  float cs = cos(tiltRad);",
    "  float sn = sin(tiltRad);",
    "  vec2 rel = coord - rayPos;",
    "  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;",
    "  float halfSpread = iSpread * 0.275;",
    "  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));",
    "  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));",
    "  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);",
    "  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);",
    "  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;",
    "  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;",
    "  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);",
    "  color.rgb *= brightness;",
    "  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));",
    "  color.rgb = mix(vec3(gray), color.rgb, iSaturation);",
    "  color.a = max(color.r, max(color.g, color.b)) * iOpacity;",
    "  color.a = clamp(color.a, 0.0, 1.0);",
    "  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0) * color.a, color.a);",
    "}"
  ].join("\n");

  /* The supplied configuration. */
  var CFG = {
    speed: 2.6,
    rayColor1: [0.063, 0.725, 0.506], // #10B981
    rayColor2: [0.208, 0.675, 0.031], // #35AC08
    intensity: 2.4,
    spread: 2.5,
    origin: "top-right",  // flip [0, 0]
    tilt: -4,
    saturation: 0.85,
    blend: 0.8,
    falloff: 1.4,
    opacity: 0.65
  };
  var FLIP = { "top-right": [0, 0], "top-left": [1, 0], "bottom-right": [0, 1], "bottom-left": [1, 1] };

  function setup(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "rays-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var gl = canvas.getContext("webgl", {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: "low-power"
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
    var U = { iTime: u("iTime"), iResolution: u("iResolution") };
    var flip = FLIP[CFG.origin] || FLIP["top-right"];
    gl.uniform1f(u("iSpeed"), CFG.speed);
    gl.uniform3fv(u("iRayColor1"), new Float32Array(CFG.rayColor1));
    gl.uniform3fv(u("iRayColor2"), new Float32Array(CFG.rayColor2));
    gl.uniform1f(u("iIntensity"), CFG.intensity);
    gl.uniform1f(u("iSpread"), CFG.spread);
    gl.uniform1f(u("iFlipX"), flip[0]);
    gl.uniform1f(u("iFlipY"), flip[1]);
    gl.uniform1f(u("iTilt"), CFG.tilt);
    gl.uniform1f(u("iSaturation"), CFG.saturation);
    gl.uniform1f(u("iBlend"), CFG.blend);
    gl.uniform1f(u("iFalloff"), CFG.falloff);
    gl.uniform1f(u("iOpacity"), CFG.opacity);

    host.appendChild(canvas);
    host.classList.add("has-rays");

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
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; },
        { rootMargin: "80px 0px" }).observe(host);
    } else { visible = true; }

    var dead = false;
    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      dead = true;
      host.classList.remove("has-rays");
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
