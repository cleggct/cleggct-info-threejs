import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main()	{
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform vec2 bot_left;
uniform vec2 top_right;

void main() {
    vec2 dims = top_right.xy - bot_left.xy;
    vec2 coord = bot_left.xy + vUv.xy * dims.xy;

    int iteration = 0;
    int max = 1000;

    float x = 0.0;
    float y = 0.0;

    float val = 0.0;

    vec3 black = vec3(0.0, 0.0, 0.0);
    vec3 blue = vec3(0.0, 0.1, 1.0);
    vec3 orange = vec3(0.9, 0.5, 0.1);
    vec3 white = vec3(1.0, 1.0, 1.0);

    while ((x * x + y * y < float(1 << 16)) && (iteration < max)) {
        float xtemp = x * x - y * y + coord.x;
        y = 2.0 * x * y + coord.y;
        x = xtemp;
        iteration = iteration + 1;
    }

    if (iteration < max) {
        float logz_n = log(x * x + y * y) / 2.0;
        float nu = log(logz_n / log(2.0)) / log(2.0);
        val = float(iteration) + 1.0 - nu;
    }

    val = val / 10.0;

    float t1 = mod(floor(val), 4.0);
    
    float l2 = fract(val);
    float l1 = 1.0 - fract(val);

    vec3 color = vec3(1.0, 1.0, 1.0);

    if (t1 < 1.0) {
        color =  l1 * black + l2 * blue;
    }
    else if (t1 < 2.0) {
        color =  l1 * blue + l2 * white;
    }
    else if (t1 < 3.0) {
        color =  l1 * white + l2 * orange;
    }
    else {
        color = l1 * orange + l2 * black;
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

const Mandelbrot = () => {
    const mountRef = useRef(null);
    const mousePos = useRef(null);
    const mouseDownPos = useRef(null);
    const mouseUpPos = useRef(null);
    const selectionRect = useRef(null);
    const stateRef = useRef(null);

    useEffect(() => {
        // Scene setup
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
        }

        const selectionCanvas = document.createElement("canvas");
        selectionCanvas.width = window.innerWidth;
        selectionCanvas.height = window.innerHeight;
        selectionCanvas.style.position = "absolute";
        selectionCanvas.style.left = "0";
        selectionCanvas.style.top = "0";
        selectionCanvas.style.pointerEvents = "none";
        selectionCanvas.style.zIndex = "10";
        const selectionCtx = selectionCanvas.getContext("2d");
        selectionRect.current = { canvas: selectionCanvas, ctx: selectionCtx };
        if (mountRef.current) {
            mountRef.current.appendChild(selectionCanvas);
        }

        let width = window.innerWidth;
        let height = window.innerHeight;

        const aspect = height / width;

        renderer.debug.onShaderError = ( gl, program, vertexShader, fragmentShader ) => {
  
            const vertexShaderSource = gl.getShaderSource( vertexShader );
            const fragmentShaderSource = gl.getShaderSource( fragmentShader );
            
            console.groupCollapsed( "vertexShader" )
            console.log( vertexShaderSource )
            console.groupEnd()
            
            console.groupCollapsed( "fragmentShader" )
            console.log( fragmentShaderSource )
            console.groupEnd()
        
        };

        const bl_coords = [-2.5, -1.4];
        const w_start = 5.0;
        const h_start = aspect * w_start;
        const uniforms = {
            bot_left: {value: bl_coords},
            top_right: {value: [bl_coords[0] + w_start, bl_coords[1] + h_start]}
        };
        
        const state = {
            bot_left: bl_coords,
            top_right: [bl_coords[0] + w_start, bl_coords[1] + h_start],
            prev: null
        }

        stateRef.current = state;

        // Geometry
        const planeGeometry = new THREE.PlaneGeometry(2, 2);
        const shaderMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
        });
        //shaderMaterial.needsUpdate = true;

        const plane = new THREE.Mesh(planeGeometry, shaderMaterial);

        scene.add(plane);

        // Resize handling
        const onResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const newAspect = height / width;
            camera.aspect = newAspect;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            if (selectionRect.current) {
                selectionRect.current.canvas.width = window.innerWidth;
                selectionRect.current.canvas.height = window.innerHeight;
            }
        };

        window.addEventListener("resize", onResize);

        const getLocalCoords = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                width: rect.width,
                height: rect.height
            };
        };

        const computeSelection = (start, current, dims) => {
            const ratio = dims.height / dims.width;
            const rawWidth = current.x - start.x;
            const rawHeight = current.y - start.y;
            if (Math.abs(rawWidth) < 1) {
                return null;
            }

            const signX = rawWidth === 0 ? 1 : Math.sign(rawWidth);
            const signY = rawHeight === 0 ? 1 : Math.sign(rawHeight);
            const widthMag = Math.abs(rawWidth);
            const heightMag = Math.abs(rawHeight);
            const adjustedHeight = widthMag * ratio;


            let rectWidth;
            let rectHeight;
            if (heightMag > adjustedHeight) {
                rectWidth = signX * widthMag;
                rectHeight = signY * adjustedHeight;
            } else {
                const adjustedWidth = heightMag / ratio;
                rectWidth = signX * adjustedWidth;
                rectHeight = signY * heightMag;
            }

            const endX = start.x + rectWidth;
            const endY = start.y + rectHeight;

            return {
                rectWidth,
                rectHeight,
                minX: Math.min(start.x, endX),
                maxX: Math.max(start.x, endX),
                minY: Math.min(start.y, endY),
                maxY: Math.max(start.y, endY),
                width: Math.abs(endX - start.x),
                height: Math.abs(endY - start.y)
            };
        };

        const handleMouseDown = (event) => {
            if (event.button !== 0) {
                return;
            }
            const local = getLocalCoords(event);
            mouseDownPos.current = { x: local.x, y: local.y };
            if (selectionRect.current) {
                const { ctx, canvas } = selectionRect.current;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    
        const handleMouseUp = (event) => {

            if (event.button !== 0) {
                return;
            }

            const local = getLocalCoords(event);
            mouseUpPos.current = { x: local.x, y: local.y };

            if (selectionRect.current) {
                const { ctx, canvas } = selectionRect.current;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (mouseDownPos.current && mouseUpPos.current) {
                const rect = computeSelection(mouseDownPos.current, mouseUpPos.current, { width, height });
                if (!rect) {
                    mouseDownPos.current = null;
                    mouseUpPos.current = null;
                    return;
                }

                if (rect.width < 5) {
                    mouseDownPos.current = null;
                    mouseUpPos.current = null;
                    return;
                }

                const currentWidth = uniforms.top_right.value[0] - uniforms.bot_left.value[0];
                const currentHeight = uniforms.top_right.value[1] - uniforms.bot_left.value[1];
                const scaleX = currentWidth / width;
                const scaleY = currentHeight / height;

                const new_bot_left = [
                    uniforms.bot_left.value[0] + rect.minX * scaleX,
                    uniforms.bot_left.value[1] + (height - rect.maxY) * scaleY
                ];
                const new_top_right = [
                    uniforms.bot_left.value[0] + rect.maxX * scaleX,
                    uniforms.bot_left.value[1] + (height - rect.minY) * scaleY
                ];

                uniforms.bot_left.value = new_bot_left;
                uniforms.top_right.value = new_top_right;

                const newState = {
                    bot_left: new_bot_left,
                    top_right: new_top_right,
                    prev: stateRef.current
                }

                stateRef.current = newState;
                
                renderer.render(scene, camera);

            }
            mouseDownPos.current = null;
            mouseUpPos.current = null;

        };

        const handleMouseMove = (event) => {
            const local = getLocalCoords(event);
            mousePos.current = {
                x: local.x,
                y: local.y
            };

            if (mouseDownPos.current && selectionRect.current) {
                const { canvas, ctx } = selectionRect.current;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const rect = computeSelection(mouseDownPos.current, { x: local.x, y: local.y }, { width, height });
                if (rect) {
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 5]);
                    ctx.strokeRect(rect.minX, rect.minY, rect.width, rect.height);
                    ctx.setLineDash([]);
                }
            }
        };

        const handleRightClick = (event) => {
            event.preventDefault();
            if (stateRef.current.prev) {
                const prevState = stateRef.current.prev;
                const prev_bot_left = prevState.bot_left;
                const prev_top_right = prevState.top_right;

                console.log('(',prev_bot_left,', ', prev_top_right,')');

                uniforms.bot_left.value = prev_bot_left;
                uniforms.top_right.value = prev_top_right;

                stateRef.current = prevState;

                renderer.render(scene, camera);
            }
            return false;
        };
    
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("contextmenu", handleRightClick);

        renderer.render(scene, camera);
      

        return () => {
            window.removeEventListener("contextmenu", handleRightClick);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("resize", onResize);
            renderer.dispose();
            scene.remove(plane);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
                if (selectionRect.current) {
                    mountRef.current.removeChild(selectionRect.current.canvas);
                }
            }
            };
    }, []);

    return (<div>
                <div id="canvas" ref={mountRef} />
            </div>);
};

export default Mandelbrot;
