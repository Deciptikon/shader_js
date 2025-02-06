const canvas = document.getElementById("canvas");
canvas.tabIndex = 1000;
canvas.focus();

let isMouseDown = false;
let offset = { x: 1500, y: 0 };
let prevPos = { x: 0, y: 0 };
let currPos = { x: 0, y: 0 };
let scale = 0.1;

canvas.addEventListener("wheel", (e) => {
  const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
  const newScale = scale * scaleFactor;

  offset.x -= (offset.x * (newScale - scale)) / newScale;
  offset.y -= (offset.y * (newScale - scale)) / newScale;

  scale = newScale;

  main();
});

canvas.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    scale = 0.5;
    offset = { x: 0, y: 0 };
    prevPos = { x: 0, y: 0 };
    currPos = { x: 0, y: 0 };
    isMouseDown = false;
    main();
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    prevPos.x = e.clientX - rect.left;
    prevPos.y = e.clientY - rect.top;
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    offset.x += mouseX - prevPos.x;
    offset.y += mouseY - prevPos.y;

    prevPos.x = mouseX;
    prevPos.y = mouseY;
    currPos = { x: 0, y: 0 };

    main();
  }
});

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("mouseleave", () => {
  isMouseDown = false;
});

const vertexShaderSource = `
    attribute vec4 a_position;
    void main() {
        gl_Position = a_position;
    }
`;

const fragmentShaderWave = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform vec4 u_data;       // chi, omega, A, s
    uniform vec2 u_geometryA;  // W, H
    uniform vec3 u_geometryB;  // x0, y0, scale
    uniform vec2 u_support;    // R, r
    uniform vec4 u_resez;      // alfa, betta, gamma, ro

    float f(float x, float alfa, float betta, float gamma, float ro) {
        alfa -= gamma;
        betta += gamma;
        if (x < -(ro * sin(betta))) {
            return -x * tan(betta) + ro * (1.0 - 1.0 / cos(betta));
        } else if (x < ro * sin(alfa)) {
            return ro * (1.0 - sqrt(1.0 - (x / ro) * (x / ro)));
        } else {
            return x * tan(alfa) + ro * (1.0 - 1.0 / cos(alfa));
        }
    }

    float dist(float x, float y, float x0, float y0) {
        return sqrt((x - x0) * (x - x0) + (y - y0) * (y - y0));
    }

    float lenQ(float x, float y, float x0, float y0, float R) {
        return R - dist(x, y, x0, y0);
    }

    float fiQ(float x, float y, float x0, float y0) {
        float L = dist(x, y, x0, y0);
        if (L == 0.0) return 0.0;
        return (y - y0 < 0.0) ? (2.0 * 3.141592653589793 - acos((x - x0) / L)) : acos((x - x0) / L);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;

        const float TWO_PI = 2.0 * 3.141592653589793;

        float W = u_geometryA.x;
        float H = u_geometryA.y;
        float x0 = u_geometryB.x;
        float y0 = u_geometryB.y;
        float scale = u_geometryB.z;

        float chi = u_data.x;
        float omega = u_data.y;
        float A = u_data.z;
        float s = u_data.w;

        float R = u_support.x;
        float r = u_support.y;
        const int mk = 10;

        float alfa = u_resez.x;
        float betta = u_resez.y;
        float gamma = u_resez.z;
        float ro = u_resez.w;

        float x = (uv.x * W - W / 2.0) * scale;
        float y = (uv.y * H - H / 2.0) * scale;

        float L = lenQ(x, y, x0, y0, R);
        float fi = fiQ(x, y, x0, y0);

        float lambda = L - (fi * s) / (TWO_PI);
        float Amin = 100.0;

        if (L >= 0.0 && L <= (R - r)) {
            float ns = floor(L / s);
            for (int k = -mk; k <= mk; k++) { 
                float kk = ns + float(k); 
                float K = A * sin(((fi + kk * TWO_PI) * chi) / omega);
                float Amp = f(lambda - kk * s + K * sin(gamma), alfa, betta, gamma, ro) + K * cos(gamma);
                if (Amp < Amin) Amin = Amp;
            }
        } else {
            Amin = 100.0;
        }

        float normalized = (Amin + 0.1) * 10.0; // Нормализация
        gl_FragColor = vec4(normalized, normalized, normalized, 1.0);
    }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function main() {
  const canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  data = [12.372, 1.0, 0.1, 0.1]; // chi, omega, A, s
  geometryA = [canvas.width, canvas.height]; // W, H
  geometryB = [offset.x * scale, -offset.y * scale, scale]; // x0, y0, scale
  support = [200, 100]; // R, r
  resez = [0.1, 0.15, 0.0, 0.001]; // alfa, betta, gamma, ro

  //console.log(`geometry[0] = ${geometry[0]}`);
  const gl = canvas.getContext("webgl");
  gl.clearColor(1, 0.5, 0.5, 1);

  const program = createProgram(gl, vertexShaderSource, fragmentShaderWave);
  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  function setUniforms() {
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, geometryA[0], geometryA[1]);

    const dataLocation = gl.getUniformLocation(program, "u_data");
    gl.uniform4f(dataLocation, data[0], data[1], data[2], data[3]);

    const geometryALocation = gl.getUniformLocation(program, "u_geometryA");
    gl.uniform2f(geometryALocation, geometryA[0], geometryA[1]);

    const geometryBLocation = gl.getUniformLocation(program, "u_geometryB");
    gl.uniform3f(geometryBLocation, geometryB[0], geometryB[1], geometryB[2]);

    const supportLocation = gl.getUniformLocation(program, "u_support");
    gl.uniform2f(supportLocation, support[0], support[1]);

    const resezLocation = gl.getUniformLocation(program, "u_resez");
    gl.uniform4f(resezLocation, resez[0], resez[1], resez[2], resez[3]);
  }

  setUniforms();

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  console.log("succes");
}

main();
