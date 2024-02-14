const canvas = document.createElement("canvas")
const gl = canvas.getContext("webgl2")

document.title = "🤖"
document.body.innerHTML = ""
document.body.appendChild(canvas)
document.body.style = "margin:0;touch-action:none;overflow:hidden;"
canvas.style.width = "100%"
canvas.style.height = "auto"
canvas.style.userSelect = "none"

const dpr = Math.max(1, .5*window.devicePixelRatio)

function resize() {
  const {
    innerWidth: width,
    innerHeight: height
  } = window

  canvas.width = width * dpr
  canvas.height = height * dpr

  gl.viewport(0, 0, width * dpr, height * dpr)
}
window.onresize = resize

const vertexSource = `#version 300 es
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    in vec4 position;

    void main(void) {
        gl_Position = position;
    }
    `

const fragmentSource = `#version 300 es
    /*********
     * made by Matthias Hurrle (@atzedent) 
     * 
     * Adaptation of "Quasar" by @kishimisu 
     * Source: https://www.shadertoy.com/view/msGyzc
     */
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    out vec4 fragColor;

    uniform vec2 resolution;
    uniform float time;
    uniform vec2 touch;
    uniform int pointerCount;

    #define mouse (touch/resolution)
    #define P pointerCount
    #define T (10.+time*.5)
    #define S smoothstep

    #define hue(a) (.6+.6*cos(6.3*(a)+vec3(0,23,21)))

    mat2 rot(float a) {
        float c = cos(a), s = sin(a);

        return mat2(c, -s, s, c);
    }

    float orbit(vec2 p, float s) {
        return floor(atan(p.x, p.y)*s+.5)/s;
    }

    void cam(inout vec3 p) {
        if (P > 0) {
            p.yz *= rot(mouse.y*acos(-1.)+acos(.0));
            p.xz *= rot(-mouse.x*acos(-1.)*2.);
        }
    }

    void main(void) {
        vec2 uv = (
            gl_FragCoord.xy-.5*resolution
        )/min(resolution.x, resolution.y);

        vec3 col = vec3(0), p = vec3(0),
        rd = normalize(vec3(uv, 1));

        cam(p);
        cam(rd);

        const float steps = 30.;
        float dd = .0;

        for (float i=.0; i<steps; i++) {
            p.z  -= 4.;
            p.xz *= rot(T*.2);
            p.yz *= rot(sin(T*.2)*.5); 
            p.zx *= rot(orbit(p.zx, 12.));

            float a = p.x;

            p.yx *= rot(orbit(p.yx, 2.));

            float b = p.x-T;

            p.x = fract(b-.5)-.5;

            float d = length(p)-(a-S(b+.05,b,T)*30.)*(cos(T)*5e-2+1e-1)*1e-1;
            dd += d;

            col += (hue(dd)*.04)/(1.+abs(d)*40.);

            p = rd * dd;
        }
        fragColor = vec4(col, 1);
    }
    `

function compile(shader, source) {
  gl.shaderSource(shader, source)
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
  }
}

let program

function setup() {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  const fs = gl.createShader(gl.FRAGMENT_SHADER)

  compile(vs, vertexSource)
  compile(fs, fragmentSource)

  program = gl.createProgram()

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
  }
}

let vertices, buffer

function init() {
  vertices = [
    -1., -1., 1.,
    -1., -1., 1.,
    -1., 1., 1.,
    -1., 1., 1.,
  ]

  buffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, "position")

  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  program.resolution = gl.getUniformLocation(program, "resolution")
  program.time = gl.getUniformLocation(program, "time")
  program.touch = gl.getUniformLocation(program, "touch")
  program.pointerCount = gl.getUniformLocation(program, "pointerCount")
}

const mouse = {
  x: 0,
  y: 0,
  touches: new Set(),
  update: function(x, y, pointerId) {
    this.x = x * dpr;
    this.y = (innerHeight - y) * dpr;
    this.touches.add(pointerId)
  },
  remove: function(pointerId) { this.touches.delete(pointerId) }
}

function loop(now) {
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.uniform2f(program.resolution, canvas.width, canvas.height)
  gl.uniform1f(program.time, now * 1e-3)
  gl.uniform2f(program.touch, mouse.x, mouse.y)
  gl.uniform1i(program.pointerCount, mouse.touches.size)
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length * .5)
  requestAnimationFrame(loop)
}

setup()
init()
resize()
loop(0)

window.addEventListener("pointerdown", e => mouse.update(e.clientX, e.clientY, e.pointerId))
window.addEventListener("pointerup", e => mouse.remove(e.pointerId))
window.addEventListener("pointermove", e => {
  if (mouse.touches.has(e.pointerId))
    mouse.update(e.clientX, e.clientY, e.pointerId)
})