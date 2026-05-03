const VERT_SRC = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform mat3 u_homography;
  varying vec2 v_texCoord;
  void main() {
    vec3 t = u_homography * vec3(v_texCoord, 1.0);
    vec2 src = t.xy / t.z;
    if (src.x < 0.0 || src.x > 1.0 || src.y < 0.0 || src.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
      gl_FragColor = texture2D(u_image, src);
    }
  }
`;

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function linkProgram(gl, vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Program link: ' + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) throw new Error('Sistema singolare');
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let k = col; k <= n; k++) M[r][k] -= factor * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// Risolve l'omografia 3x3 H tale che H * (sx, sy, 1)ᵀ ∝ (dx, dy, 1)ᵀ.
// Output: array di 9 elementi in formato column-major (pronto per WebGL mat3).
function solveHomography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = src[i];
    const [dx, dy] = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dx);
    b.push(dy);
  }
  const h = solveLinear(A, b);
  // h = [h11, h12, h13, h21, h22, h23, h31, h32], h33 = 1
  // Matrice 3x3:  [h11 h12 h13]
  //               [h21 h22 h23]
  //               [h31 h32  1 ]
  // Column-major:
  return [
    h[0], h[3], h[6],   // colonna 0
    h[1], h[4], h[7],   // colonna 1
    h[2], h[5], 1.0,    // colonna 2
  ];
}

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

// Stima output ideale dai lati medi del quadrilatero selezionato.
// corners ordine: TL, TR, BR, BL.
export function estimateOutputSize(corners) {
  const wTop = dist(corners[0], corners[1]);
  const wBot = dist(corners[3], corners[2]);
  const hLft = dist(corners[0], corners[3]);
  const hRgt = dist(corners[1], corners[2]);
  return {
    width: Math.max(1, Math.round((wTop + wBot) / 2)),
    height: Math.max(1, Math.round((hLft + hRgt) / 2)),
  };
}

export function createPipeline(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL non disponibile');

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const prog = linkProgram(gl, vs, fs);

  // Quad fullscreen. v_texCoord (0,0) = TL del preview, (1,1) = BR.
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   1, -1,  -1,  1,
    -1,  1,   1, -1,   1,  1,
  ]), gl.STATIC_DRAW);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 1,   1, 1,   0, 0,
    0, 0,   1, 1,   1, 0,
  ]), gl.STATIC_DRAW);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let currentImage = null;

  function uploadImage(image) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    currentImage = image;
  }

  function render(corners, outWidth, outHeight) {
    if (!currentImage) return;

    canvas.width = outWidth;
    canvas.height = outHeight;
    gl.viewport(0, 0, outWidth, outHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const w = currentImage.width;
    const h = currentImage.height;

    // dst (preview UV): TL=(0,0), TR=(1,0), BR=(1,1), BL=(0,1) — Y giù
    const dstQuad = [[0, 0], [1, 0], [1, 1], [0, 1]];
    // src (image UV non-flippate, Y giù): per ogni corner, (x/w, y/h)
    const srcQuad = corners.map(([x, y]) => [x / w, y / h]);

    // Vogliamo H tale che H * dst = src (lo shader dato un pixel destination
    // calcola la coordinata sorgente da campionare).
    const H = solveHomography(dstQuad, srcQuad);

    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uvLoc = gl.getAttribLocation(prog, 'a_texCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.enableVertexAttribArray(uvLoc);
    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'u_homography'), false, H);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { uploadImage, render };
}
