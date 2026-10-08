/* Small self-hosted WebGL 1 renderer for the original, baked Blender mesh.
   No dependencies, textures, telemetry, external requests, or idle render loop. */
(function () {
    'use strict';
    var vertex = 'attribute vec3 aPosition;attribute vec3 aNormal;uniform vec3 uCenter;uniform float uScale;uniform vec2 uTurn;uniform float uHop;varying vec3 vNormal;void main(){vec3 p=(aPosition-uCenter)*uScale;vec3 n=aNormal;float c=cos(uTurn.x),s=sin(uTurn.x);mat3 ry=mat3(c,0.,-s,0.,1.,0.,s,0.,c);c=cos(uTurn.y);s=sin(uTurn.y);mat3 rx=mat3(1.,0.,0.,0.,c,s,0.,-s,c);p=rx*ry*p;n=rx*ry*n;p.y+=uHop;p.z-=4.2;float f=3.1715948;gl_Position=vec4(p.x*f,p.y*f,-1.020202*p.z-.2020202,-p.z);vNormal=n;}';
    var fragment = 'precision mediump float;varying vec3 vNormal;uniform vec3 uDark;uniform vec3 uMid;uniform vec3 uLight;uniform vec3 uDirection;uniform vec2 uThresholds;void main(){float light=dot(normalize(vNormal),uDirection);float edge=EDGE_WIDTH;vec3 rgb=mix(uDark,uMid,smoothstep(uThresholds.x-edge,uThresholds.x+edge,light));rgb=mix(rgb,uLight,smoothstep(uThresholds.y-edge,uThresholds.y+edge,light));gl_FragColor=vec4(rgb,1.);}';
    window.createPortraitRenderer = function (canvas, data) {
        var gl = canvas.getContext('webgl', {alpha:true, antialias:true, powerPreference:'low-power'});
        if (!gl) throw new Error('WebGL unavailable');
        var buffers = [], shaders = [], program, meshes = [];
        function dispose() {
            buffers.forEach(function (b) { gl.deleteBuffer(b); });
            shaders.forEach(function (s) { gl.deleteShader(s); });
            if (program) gl.deleteProgram(program);
        }
        try {
            function compile(type, source) {
                var shader = gl.createShader(type); shaders.push(shader);
                gl.shaderSource(shader, source); gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader unavailable');
                return shader;
            }
            program = gl.createProgram();
            gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
            // Pixel-width smoothing only at toon boundaries; silhouettes keep MSAA.
            var derivatives = gl.getExtension('OES_standard_derivatives');
            var edgeHeader = derivatives ? '#extension GL_OES_standard_derivatives : enable\n#define EDGE_WIDTH max(fwidth(light)*0.75,0.0001)\n' : '#define EDGE_WIDTH 0.006\n';
            gl.attachShader(program, compile(gl.FRAGMENT_SHADER, edgeHeader + fragment));
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link unavailable');
            gl.useProgram(program);
            function upload(target, array) {
                var buffer = gl.createBuffer(); buffers.push(buffer);
                gl.bindBuffer(target, buffer); gl.bufferData(target, array, gl.STATIC_DRAW); return buffer;
            }
            if (!data.meshes || !data.meshes.length || !data.bounds) throw new Error('Invalid mesh');
            var min = data.bounds.min, max = data.bounds.max;
            var extent = Math.max(max[0]-min[0],max[1]-min[1],max[2]-min[2]);
            if (!Number.isFinite(extent) || extent <= 0) throw new Error('Invalid bounds');
            data.meshes.forEach(function (mesh) {
                if (!mesh.positions || !mesh.normals || mesh.positions.length !== mesh.normals.length || mesh.positions.length%3) throw new Error('Invalid vertices');
                if (!mesh.indices || mesh.indices.some(function (i) {return i < 0 || i > 65535 || i >= mesh.positions.length/3;})) throw new Error('Invalid indices');
                meshes.push({ position:upload(gl.ARRAY_BUFFER,new Float32Array(mesh.positions)), normal:upload(gl.ARRAY_BUFFER,new Float32Array(mesh.normals)), index:upload(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(mesh.indices)), count:mesh.indices.length, palette:mesh.paletteLinear.map(function (rgb) { return rgb.map(function (v) { return v <= .0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-.055; }); }), thresholds:mesh.thresholds });
            });
            var pos = gl.getAttribLocation(program,'aPosition'), normal = gl.getAttribLocation(program,'aNormal');
            var turn = gl.getUniformLocation(program,'uTurn'), hop = gl.getUniformLocation(program,'uHop');
            var dark = gl.getUniformLocation(program,'uDark'), mid = gl.getUniformLocation(program,'uMid'), light = gl.getUniformLocation(program,'uLight');
            var thresholds = gl.getUniformLocation(program,'uThresholds');
            gl.uniform3fv(gl.getUniformLocation(program,'uDirection'),data.lightDirection);
            gl.uniform3fv(gl.getUniformLocation(program,'uCenter'),min.map(function (v,i) {return (v+max[i])/2;}));
            // Larger resting portrait; all yaw angles retain a circular-frame margin at a 0.06 hop.
            gl.uniform1f(gl.getUniformLocation(program,'uScale'),2.12/extent);
            gl.enable(gl.DEPTH_TEST); // Two-sided leaves and real depth testing, never a rotating plane.
            gl.clearColor(0,0,0,0);
            return {
                draw:function (yaw, lift) {
                    var size = Math.max(1,Math.min(512,Math.round(canvas.clientWidth*Math.min(window.devicePixelRatio || 1,2))));
                    if (canvas.width !== size || canvas.height !== size) { canvas.width=size; canvas.height=size; }
                    gl.viewport(0,0,size,size);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
                    gl.uniform2f(turn,yaw + (data.yaw || 0),data.pitch || 0);gl.uniform1f(hop,lift);
                    meshes.forEach(function (mesh) {
                        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
                        gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,0,0);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.uniform3fv(dark,mesh.palette[0]);gl.uniform3fv(mid,mesh.palette[1]);gl.uniform3fv(light,mesh.palette[2]);gl.uniform2fv(thresholds,mesh.thresholds);
                        gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
                    });
                    if (gl.isContextLost()) throw new Error('WebGL context lost');
                },
                dispose:dispose
            };
        } catch (error) { dispose(); throw error; }
    };
}());
