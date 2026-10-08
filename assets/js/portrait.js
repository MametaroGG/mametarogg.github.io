/* Native click includes touch, mouse, Enter, Space, and assistive activation. */
(function () {
    'use strict';
    var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    document.querySelectorAll('.portrait-play').forEach(function (button) {
        var image = button.querySelector('img');
        if (!image) return;
        var canvas = null, renderer = null, loading = false, failed = false, visible = true, paused = false;
        var frame = 0, timer = 0, direction = 1, start = null, from = 0, target = 0, angle = 0;
        var observer = null, model = null;
        button.disabled = false;
        function draw(lift) {
            if (!renderer) return;
            try { renderer.draw(angle,lift || 0); } catch (error) { fallback(); }
        }
        function stop() {
            window.cancelAnimationFrame(frame);frame=0;start=null;angle=0;
            window.clearTimeout(timer);timer=0;
            button.removeAttribute('data-portrait-feedback');draw(0);
        }
        function fallback() {
            var previous = renderer; renderer=null;failed=true;
            stop();button.removeAttribute('data-portrait-ready');
            if (previous) previous.dispose();
            if (canvas) {canvas.remove();canvas=null;}
        }
        function initialize() {
            if (!model || renderer || failed || paused || !visible || document.visibilityState === 'hidden') return;
            try {
                canvas=document.createElement('canvas');canvas.className='portrait-canvas';canvas.setAttribute('aria-hidden','true');
                button.appendChild(canvas);
                renderer=window.createPortraitRenderer(canvas,model);
                draw(0);
                if (renderer) button.setAttribute('data-portrait-ready','');
            } catch (error) { fallback(); }
        }
        async function load() {
            // Fetch eagerly, including reduced motion. Only interaction animates the mesh.
            if (model) {initialize();return;}
            if (loading || failed) return;
            loading=true;
            var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var timeout = window.setTimeout(function () { if (controller) controller.abort(); },10000);
            try {
                var response = await fetch('assets/models/creator.json',controller ? {signal:controller.signal} : {});
                if (!response.ok) throw new Error('Model unavailable');
                model = await response.json();
                // Keep fetched data when hidden; resume without a second network request.
                initialize();
            } catch (error) { fallback(); }
            finally { window.clearTimeout(timeout);loading=false; }
        }
        function tick(now) {
            frame=0;
            if (!renderer || !visible || document.visibilityState === 'hidden' || !motion || motion.matches) {stop();return;}
            if (start === null) start=now;
            var t=Math.min(1,(now-start)/820), ease=1-Math.pow(1-t,3);
            angle=from+(target-from)*ease;
            draw(Math.sin(Math.PI*t)*.06);
            if (t < 1 && renderer) frame=window.requestAnimationFrame(tick);
            else stop();
        }
        button.addEventListener('click',function () {
            document.documentElement.removeAttribute('data-home-opening');
            if (!motion || motion.matches || !renderer) {
                stop();button.setAttribute('data-portrait-feedback','');
                timer=window.setTimeout(stop,500);load();return;
            }
            // Interrupt at the current 3D orientation. One frame chain, no queue.
            window.cancelAnimationFrame(frame);window.clearTimeout(timer);
            button.removeAttribute('data-portrait-feedback');
            from=angle;target=direction*2*Math.PI;direction*=-1;start=null;
            frame=window.requestAnimationFrame(tick);
        });
        window.addEventListener('pagehide',function () {paused=true;stop();});
        window.addEventListener('pageshow',function () {paused=false;draw(0);load();});
        document.addEventListener('visibilitychange',function () {if(document.visibilityState==='hidden') stop();else load();});
        window.addEventListener('resize',function () {draw(0);});
        button.addEventListener('webglcontextlost',fallback,true);
        if (motion && motion.addEventListener) motion.addEventListener('change',function () {stop();load();});
        if (window.IntersectionObserver) {
            observer=new window.IntersectionObserver(function (entries) {
                visible=entries[0].isIntersecting;
                if (visible) load();else stop();
            },{rootMargin:'80px'});
            observer.observe(button);
        }
        load();
    });
}());
