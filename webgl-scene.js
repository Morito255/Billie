(() => {
  const host = document.querySelector('.hero-art');
  const canvas = document.querySelector('.hero-webgl');
  if (!host || !canvas) return;

  let gl;
  let program;
  let buffer;
  let uniforms;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  let currentMobile = mobile.matches;
  let vertexCount = 0;
  let frame = 0;
  let visible = false;
  let width = 1;
  let height = 1;
  let scrollMix = 0;
  let targetPalette = 0;
  let smoothPalette = 0;
  let targetX = 0;
  let targetY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let startTime = 0;
  const vertexShader = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute float aTone;
    uniform float uRx;
    uniform float uRy;
    uniform float uRz;
    uniform float uAspect;
    uniform float uPalette;
    varying vec3 vNormal;
    varying float vTone;
    varying float vDepth;
    void main() {
      vec3 p = aPosition;
      vec3 n = aNormal;
      float cx = cos(uRx), sx = sin(uRx);
      float cy = cos(uRy), sy = sin(uRy);
      float cz = cos(uRz), sz = sin(uRz);
      p = vec3(p.x, cx*p.y - sx*p.z, sx*p.y + cx*p.z);
      n = vec3(n.x, cx*n.y - sx*n.z, sx*n.y + cx*n.z);
      p = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
      n = vec3(cy*n.x + sy*n.z, n.y, -sy*n.x + cy*n.z);
      p = vec3(cz*p.x - sz*p.y, sz*p.x + cz*p.y, p.z);
      n = vec3(cz*n.x - sz*n.y, sz*n.x + cz*n.y, n.z);
      float depth = 3.15 + p.z;
      float focal = 2.28;
      float nearPlane = .1;
      float farPlane = 9.0;
      float ndcZ = (farPlane + nearPlane)/(farPlane - nearPlane) - (2.0*farPlane*nearPlane)/((farPlane - nearPlane)*depth);
      gl_Position = vec4(p.x*focal/(depth*uAspect), p.y*focal/depth, ndcZ*depth, depth);
      vNormal = n;
      vTone = aTone;
      vDepth = depth;
    }
  `;
  const fragmentShader = `
    precision mediump float;
    varying vec3 vNormal;
    varying float vTone;
    varying float vDepth;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 L = normalize(vec3(-.48, .62, .78));
      float diffuse = max(dot(N, L), 0.0);
      float fresnel = pow(1.0 - abs(dot(N, vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 ocean = vec3(.27, .72, .78);
      vec3 accent = vec3(.72, .98, .46);
      if (uPalette > .5 && uPalette < 1.5) accent = vec3(.63, .86, .86);
      else if (uPalette > 1.5 && uPalette < 2.5) accent = vec3(.96, .77, .48);
      else if (uPalette > 2.5) accent = vec3(.52, .77, .95);
      float hue = clamp(vTone*.36 + diffuse*.35 + fresnel*.26, 0.0, 1.0);
      vec3 color = mix(ocean, accent, hue);
      float depthFade = 1.0 - smoothstep(2.25, 4.2, vDepth);
      float light = .40 + diffuse*.42 + fresnel*.34;
      gl_FragColor = vec4(color * light, (.36 + fresnel*.22) * depthFade);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function orient(point, angleX, angleY) {
    const cx = Math.cos(angleX), sx = Math.sin(angleX);
    const cy = Math.cos(angleY), sy = Math.sin(angleY);
    const y = point[1] * cx - point[2] * sx;
    const z = point[1] * sx + point[2] * cx;
    const x = point[0] * cy + z * sy;
    return [x, y, -point[0] * sy + z * cy];
  }

  function createRings() {
    const segments = mobile.matches ? 64 : 112;
    const sides = mobile.matches ? 5 : 7;
    const specs = mobile.matches
      ? [[.82, .007, .55, .12, 0], [.91, .005, -.82, .72, 1]]
      : [[.78, .006, .38, .18, 0], [.87, .005, 1.08, .36, 1], [.93, .0045, -.68, .92, .52]];
    const data = [];
    for (const [radius, tube, rx, ry, tone] of specs) {
      const rings = [];
      for (let i = 0; i <= segments; i++) {
        const u = i / segments * Math.PI * 2;
        const wave = Math.sin(u * 3 + tone * 4) * .012;
        const row = [];
        for (let j = 0; j <= sides; j++) {
          const v = j / sides * Math.PI * 2;
          const normal = [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)];
          const p = [(radius + wave + tube * Math.cos(v)) * Math.cos(u), (radius + wave + tube * Math.cos(v)) * Math.sin(u), tube * Math.sin(v)];
          row.push({ p: orient(p, rx, ry), n: orient(normal, rx, ry) });
        }
        rings.push(row);
      }
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < sides; j++) {
          const a = rings[i][j], b = rings[i + 1][j], c = rings[i + 1][j + 1], d = rings[i][j + 1];
          for (const vertex of [a, b, d, b, c, d]) data.push(...vertex.p, ...vertex.n, tone);
        }
      }
    }
    return new Float32Array(data);
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.45);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (buffer && currentMobile !== mobile.matches) {
      currentMobile = mobile.matches;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const geometry = createRings();
      vertexCount = geometry.length / 7;
      gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
    }
  }

  function render(now) {
    frame = 0;
    if (!gl || !visible || document.hidden) return;
    smoothX += (targetX - smoothX) * .055;
    smoothY += (targetY - smoothY) * .055;
    smoothPalette += (targetPalette - smoothPalette) * .035;
    const t = reducedMotion.matches ? 0 : (now - startTime) * .00022;
    const scrollTilt = reducedMotion.matches ? 0 : scrollMix * .18;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(uniforms.rx, .17 + smoothY * .17 + Math.sin(t * .7) * .018 + scrollTilt);
    gl.uniform1f(uniforms.ry, smoothX * .2 + Math.sin(t) * .025);
    gl.uniform1f(uniforms.rz, Math.sin(t * .55) * .035 + scrollTilt * .4);
    gl.uniform1f(uniforms.aspect, width / height);
    gl.uniform1f(uniforms.palette, smoothPalette);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    if (!reducedMotion.matches) frame = requestAnimationFrame(render);
  }

  function start() {
    if (visible && !document.hidden && !frame && !reducedMotion.matches) frame = requestAnimationFrame(render);
  }

  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: !mobile.matches, depth: true, powerPreference: 'low-power' });
    if (!gl) return;
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    uniforms = {
      rx: gl.getUniformLocation(program, 'uRx'),
      ry: gl.getUniformLocation(program, 'uRy'),
      rz: gl.getUniformLocation(program, 'uRz'),
      aspect: gl.getUniformLocation(program, 'uAspect'),
      palette: gl.getUniformLocation(program, 'uPalette')
    };
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const geometry = createRings();
    vertexCount = geometry.length / 7;
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;
    for (const [name, size, offset] of [['aPosition', 3, 0], ['aNormal', 3, 3], ['aTone', 1, 6]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * Float32Array.BYTES_PER_ELEMENT);
    }
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    resize();
    host.classList.add('has-webgl');
    startTime = performance.now();

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        if (!reducedMotion.matches && !frame) frame = requestAnimationFrame(render);
        else render(performance.now());
      } else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: .05 });
    observer.observe(host);
    new ResizeObserver(resize).observe(host);

    host.addEventListener('pointermove', (event) => {
      if (reducedMotion.matches || mobile.matches || event.pointerType !== 'mouse') return;
      const rect = host.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; }, { passive: true });
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      scrollMix = max > 0 ? Math.min(1, scrollY / max) : 0;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else start();
    });
    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        render(performance.now());
      } else start();
    });
    window.addEventListener('billie:palette', (event) => {
      targetPalette = ({ green: 0, ocean: 1, gold: 2, blue: 3 })[event.detail?.palette] ?? 0;
      if (reducedMotion.matches && visible) render(performance.now());
    });
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      visible = false;
      host.classList.remove('has-webgl');
    });
  } catch {
    if (gl && buffer) gl.deleteBuffer(buffer);
    host.classList.remove('has-webgl');
    canvas.hidden = true;
  }
})();
