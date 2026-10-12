// WebKit cannot displace the DOM backdrop. This lens samples our local Hero
// media instead; the rest of the page keeps the CSS backdrop/reflection layers.
const vertexSource = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const fragmentSource = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D image;
  uniform vec2 size;
  uniform float padding;
  uniform float distortion;
  void main() {
    vec2 p = (uv - 0.5) * size;
    float radius = size.y * 0.5;
    vec2 q = abs(p) - size * 0.5 + radius;
    vec2 outside = max(q, 0.0);
    float distance = length(outside) + min(max(q.x, q.y), 0.0) - radius;
    vec2 normal = length(outside) > 0.001 ? normalize(outside) * sign(p)
      : (q.x > q.y ? vec2(sign(p.x), 0.0) : vec2(0.0, sign(p.y)));
    float edge = clamp(1.0 + distance / min(18.0, size.y * 0.26), 0.0, 1.0);
    float bend = edge * edge * (3.0 - 2.0 * edge) * 17.0;
    vec2 shift = -normal * bend;
    shift += vec2(sin(p.x / size.x * 6.283) * 1.8, sin(p.y / size.y * 3.142) * 2.5) * (1.0 - edge);
    vec2 sampleUV = (uv * size + padding + shift * distortion) / (size + padding * 2.0);
    vec3 color = texture2D(image, sampleUV).rgb;
    // Two small samples soften aliasing without hiding the refracted edge.
    vec2 blur = vec2(0.45) / (size + padding * 2.0);
    color = color * 0.6 + texture2D(image, sampleUV + blur).rgb * 0.2
      + texture2D(image, sampleUV - blur).rgb * 0.2;
    gl_FragColor = vec4(color * 1.2, 1.0);
  }
`;

export function createMediaGlassRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const shaders = [];
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertexSource],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    shaders.push(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      for (const created of shaders) gl.deleteShader(created);
      gl.deleteProgram(program);
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteProgram(program);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const sizeUniform = gl.getUniformLocation(program, 'size');
  gl.uniform1f(gl.getUniformLocation(program, 'padding'), 24);
  gl.uniform1f(gl.getUniformLocation(program, 'distortion'), 1);
  const staging = document.createElement('canvas');
  const context = staging.getContext('2d', { alpha: false });
  if (!context) return null;

  return {
    draw(source, bounds, overlay) {
      if (gl.isContextLost()) return false;
      const sourceWidth = source.videoWidth || source.naturalWidth;
      const sourceHeight = source.videoHeight || source.naturalHeight;
      if (!sourceWidth || !sourceHeight) return false;
      // Only upload the small strip behind the header, never a full video texture.
      const density = Math.min(window.devicePixelRatio || 1, 1.5, 900 / bounds.width);
      const width = Math.round(bounds.width * density),
        height = Math.round(bounds.height * density);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        staging.width = Math.round((bounds.width + 48) * density);
        staging.height = Math.round((bounds.height + 48) * density);
      }
      const rect = source.getBoundingClientRect();
      const factor = Math.max(rect.width / sourceWidth, rect.height / sourceHeight);
      const [xPosition, yPosition] = getComputedStyle(source).objectPosition.split(' ');
      const fraction = (value) => (value?.endsWith('%') ? parseFloat(value) / 100 : 0.5);
      const originX = rect.left + (rect.width - sourceWidth * factor) * fraction(xPosition);
      const originY = rect.top + (rect.height - sourceHeight * factor) * fraction(yPosition);
      context.fillStyle = '#050505';
      context.fillRect(0, 0, staging.width, staging.height);
      context.drawImage(
        source,
        (originX - bounds.left + 24) * density,
        (originY - bounds.top + 24) * density,
        sourceWidth * factor * density,
        sourceHeight * factor * density,
      );
      // Reuse the actual Hero overlay, including responsive gradients.
      if (overlay) {
        const style = getComputedStyle(overlay);
        context.fillStyle = style.backgroundColor;
        context.fillRect(0, 0, staging.width, staging.height);
        if (style.backgroundImage !== 'none') {
          // The mobile overlay is a dark horizontal gradient plus top/bottom shading.
          const heroBounds = overlay.getBoundingClientRect();
          const gradient = context.createLinearGradient(
            (heroBounds.left - bounds.left + 24) * density,
            0,
            (heroBounds.right - bounds.left + 24) * density,
            0,
          );
          gradient.addColorStop(0, '#050505b8');
          gradient.addColorStop(1, '#05050544');
          context.fillStyle = gradient;
          context.fillRect(0, 0, staging.width, staging.height);
          const topShade = context.createLinearGradient(
            0,
            (heroBounds.top - bounds.top + 24) * density,
            0,
            (heroBounds.top + heroBounds.height * 0.65 - bounds.top + 24) * density,
          );
          topShade.addColorStop(0, '#05050533');
          topShade.addColorStop(1, '#05050500');
          context.fillStyle = topShade;
          context.fillRect(0, 0, staging.width, staging.height);
        }
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(sizeUniform, bounds.width, bounds.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, staging);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      for (const shader of shaders) gl.deleteShader(shader);
      gl.deleteProgram(program);
      // Deliberately do not lose the context: React StrictMode reuses this canvas.
    },
  };
}
