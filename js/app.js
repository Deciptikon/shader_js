const canvas = document.getElementById("canvas");
canvas.tabIndex = 1000;
canvas.focus();

const gl = canvas.getContext("webgl");

let isMouseDown = false;
let offset = { x: 0, y: 0 };
let prevPos = { x: 0, y: 0 };
let currPos = { x: 0, y: 0 };
let scale = 0.5;
let needUpdate = true;

canvas.addEventListener("wheel", (e) => {
  const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
  const newScale = scale * scaleFactor;

  offset.x -= (offset.x * (newScale - scale)) / newScale;
  offset.y -= (offset.y * (newScale - scale)) / newScale;

  scale = newScale;

  console.log(`scale = ${scale}  | x,y = ${offset.x},${offset.y}`);
  needUpdate = true;
});

canvas.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    scale = 0.5;
    offset = { x: 0, y: 0 };
    prevPos = { x: 0, y: 0 };
    currPos = { x: 0, y: 0 };
    isMouseDown = false;
    needUpdate = true;
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    prevPos.x = e.clientX - rect.left;
    prevPos.y = e.clientY - rect.top;
    needUpdate = true;
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

    needUpdate = true;
  }
});

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("mouseleave", () => {
  isMouseDown = false;
});

// Функция обновления uniform-переменных
function updateUniforms(gl, program) {
  const geometryB = [offset.x * scale, -offset.y * scale, scale];

  gl.uniform3f(
    gl.getUniformLocation(program, "u_geometryB"),
    geometryB[0],
    geometryB[1],
    geometryB[2]
  );
}

// Функция рендеринга
function render(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

async function loadShader(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Error loading shader:", error);
    return null;
  }
}

async function createShaderProgram(gl, vertUrl, fragUrl) {
  const [vertSource, fragSource] = await Promise.all([
    loadShader(vertUrl),
    loadShader(fragUrl),
  ]);

  // Создание и компиляция шейдеров
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertSource);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragSource);
  gl.compileShader(fragmentShader);

  // Проверка ошибок компиляции
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
    return null;
  }

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(
      "Fragment shader error:",
      gl.getShaderInfoLog(fragmentShader)
    );
    return null;
  }

  // Создание программы
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Проверка ошибок линковки
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

async function main() {
  //const canvas = document.getElementById("canvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Инициализация переменных
  let offset = { x: 0, y: 0 };
  let scale = 1.0;
  const data = [1.0, 1.0, 0.001, 0.001];
  const geometryA = [canvas.width, canvas.height];
  const geometryB = [offset.x * scale, -offset.y * scale, scale];
  const support = [200, 20];
  const resez = [0.1, 0.15, 0.0, 0.001];

  // Инициализация WebGL

  if (!gl) {
    alert("WebGL не поддерживается!");
    return;
  }

  try {
    const program = await createShaderProgram(
      gl,
      "shaders/vert.glsl",
      "shaders/frag.glsl"
    );
    if (!program) {
      console.error("Failed to create shader program");
      return;
    }

    // Настройка буферов
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Настройка атрибутов
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Использование программы
    gl.useProgram(program);

    // Функция обновления uniform-переменных
    function setUniforms() {
      gl.uniform2f(
        gl.getUniformLocation(program, "u_resolution"),
        ...geometryA
      );
      gl.uniform4f(gl.getUniformLocation(program, "u_data"), ...data);
      gl.uniform2f(gl.getUniformLocation(program, "u_geometryA"), ...geometryA);
      gl.uniform3f(gl.getUniformLocation(program, "u_geometryB"), ...geometryB);
      gl.uniform2f(gl.getUniformLocation(program, "u_support"), ...support);
      gl.uniform4f(gl.getUniformLocation(program, "u_resez"), ...resez);
    }
    setUniforms();

    //addEventListeners(canvas, gl, program);
    updateUniforms(gl, program);
    render(gl);

    function animate() {
      requestAnimationFrame(animate);
      if (needUpdate) {
        needUpdate = false;
        updateUniforms(gl, program);
        render(gl);
      }
    }
    animate();
  } catch (error) {
    console.error("Ошибка при инициализации:", error);
  }
}

// Запуск
main();
