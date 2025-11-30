'use client'

import { useEffect, useRef } from 'react'

interface ShaderBackgroundProps {
  className?: string
  introDuration?: number
}

export function ShaderBackground({ className = '', introDuration = 2.5 }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.warn('WebGL not supported in this browser.')
      return
    }

    const createShader = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to create shader.')
      
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(`Could not compile shader:\n${info || ''}`)
      }
      
      return shader
    }

    const fragmentShaderSource = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform float iIntro;

// Manual tanh implementation for WebGL 1.0
vec3 tanh(vec3 x) {
    vec3 e2x = exp(2.0 * x);
    return (e2x - 1.0) / (e2x + 1.0);
}

// Smooth easing functions
float easeOutCubic(float x) {
    return 1.0 - pow(1.0 - x, 3.0);
}

float easeInOutQuart(float x) {
    return x < 0.5 ? 8.0 * x * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 4.0) / 2.0;
}

/*================================
=            SnakeGem            =
=         Author: Jaenam         =
================================*/
// Date:    2025-11-10
// License: Creative Commons (CC BY-NC-SA 4.0)
// Modified with intro animation

void mainImage(out vec4 O, vec2 I) {
    // Intro animation progress with easing
    float introEase = easeInOutQuart(iIntro);
    float prelude = 1.0 - introEase;

    vec3 p, c = vec3(0.0);
    vec3 r = iResolution;

    // Start with faster rotation, slow down to slower speed
    float rotSpeed = mix(1.5, 0.8, introEase);
    mat2 R = mat2(cos(iTime / rotSpeed + vec4(0.0, 33.0, 11.0, 0.0)));

    float d = 0.0;
    float s = 0.0;

    // Zoom in effect during intro
    float zoom = mix(0.3, 1.0, easeOutCubic(introEase));

    // Spiral effect at start
    float spiral = sin(iTime * 1.5) * prelude * 0.5;

    for (float i = 0.0; i < 100.0; i += 1.0) {
        // Add spiral offset during intro
        vec2 spiralOffset = vec2(
            cos(spiral + i * 0.1) * prelude * 3.0,
            sin(spiral + i * 0.1) * prelude * 3.0
        );

        p = vec3(d * ((I + spiralOffset) + (I + spiralOffset) - r.xy) / r.y * R * zoom, d - 9.0);
        p.xz *= R;

        // Add wobble during intro
        float wobble = sin(iTime * 2.0 + i * 0.05) * prelude * 0.3;

        s = 0.012 + 0.07 * abs(
            max(
                sin(length(floor(p * 3.0) + dot(sin(p), cos(p.yzx)) / 0.4) + wobble),
                length(p) - 4.0
            ) - i / 100.0
        );
        d += s;

        // Enhanced color during intro
        vec3 colorShift = vec3(1.0, 2.0, 3.0) + prelude * vec3(0.5, 1.0, 1.5);
        c += max(1.3 * sin(i * 0.5 + colorShift) / s, -length(p * p));
    }

    // Brighter during intro, normal after
    float brightness = mix(1200000.0, 800000.0, introEase);
    vec3 finalColor = tanh(c * c / brightness);

    // Fade in with color shift
    float fadeIn = smoothstep(0.0, 0.3, introEase);
    O.rgb = finalColor * fadeIn;
    O.a = 1.0;
}

void main() {
    vec4 color = vec4(0.0);
    mainImage(color, gl_FragCoord.xy);
    gl_FragColor = color;
}
`

    const vertexShaderSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

    const program = gl.createProgram()
    if (!program) return

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Unable to initialize shader program:', gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return
    }

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Unable to create buffer.')

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, 'position')
    const timeLocation = gl.getUniformLocation(program, 'iTime')
    const resolutionLocation = gl.getUniformLocation(program, 'iResolution')
    const introLocation = gl.getUniformLocation(program, 'iIntro')

    const duration = Math.max(0.1, introDuration)

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const width = Math.floor(canvas.clientWidth * dpr)
      const height = Math.floor(canvas.clientHeight * dpr)

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    let resizeTimeout: NodeJS.Timeout | null = null
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(resize, 0)
    }

    let resizeObserver: ResizeObserver | null = null
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(canvas)
    } else {
      window.addEventListener('resize', handleResize)
    }

    resize()

    const startTime = performance.now()
    let animationFrameId: number

    const animate = (currentTime: number) => {
      if (!program) return

      const elapsed = (currentTime - startTime) / 1000

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      if (timeLocation) gl.uniform1f(timeLocation, elapsed)
      if (resolutionLocation) gl.uniform3f(resolutionLocation, canvas.width, canvas.height, 1)
      if (introLocation) gl.uniform1f(introLocation, Math.min(1, elapsed / duration))

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', handleResize)
      }
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [introDuration])

  const classNames = ['shader-canvas', className].filter(Boolean).join(' ')

  return (
    <canvas
      ref={canvasRef}
      className={classNames}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

