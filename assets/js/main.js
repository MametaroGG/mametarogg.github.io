/* Runs synchronously in the head, before styles paint, on every route. */
(function () {
    'use strict';
    var root = document.documentElement;
    var key = 'mametaro-theme';
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var choice = null;
    var button;
    var transition;
    var motionTimer;
    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    function changeWithMotion() {
        if (transition) transition.skipTransition();
        window.clearTimeout(motionTimer);
        if (reducedMotion && reducedMotion.matches) {
            root.classList.remove('theme-changing');
            applyTheme();
            return;
        }
        root.classList.add('theme-changing');
        function finish() {
            motionTimer = window.setTimeout(function () { root.classList.remove('theme-changing'); }, 500);
        }
        if (!document.startViewTransition || !root.animate) {
            applyTheme();
            finish();
            return;
        }
        var box = button.getBoundingClientRect();
        var x = box.left + box.width / 2;
        var y = box.top + box.height / 2;
        var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        try {
            // Read the latest choice in the callback, even when clicks interrupt capture.
            var current = document.startViewTransition(applyTheme);
            transition = current;
            current.ready.then(function () {
                if (transition !== current) return;
                root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] }, {
                    duration:480, easing:'cubic-bezier(.22,1,.36,1)', pseudoElement:'::view-transition-new(root)'
                });
            }).catch(function () { /* Capture may be skipped on a rapid click or hidden tab. */ });
            current.finished.catch(function () {}).then(function () {
                if (transition !== current) return;
                transition = null;
                finish();
            });
        } catch (error) {
            transition = null;
            applyTheme();
            finish();
        }
    }

    function applyInstantly() {
        if (transition) transition.skipTransition();
        transition = null;
        window.clearTimeout(motionTimer);
        root.classList.remove('theme-changing');
        applyTheme();
    }

    function readChoice(fallback) {
        try {
            var value = window.localStorage.getItem(key);
            return value === 'dark' || value === 'light' ? value : null;
        } catch (error) {
            return fallback || null;
        }
    }

    function applyTheme() {
        var dark = choice ? choice === 'dark' : !!(media && media.matches);
        root.setAttribute('data-theme', dark ? 'dark' : 'light');
        if (button) {
            button.setAttribute('aria-pressed', String(dark));
            button.title = dark ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
        }
    }

    choice = readChoice();
    applyTheme();
    if (media) {
        if (media.addEventListener) media.addEventListener('change', applyInstantly);
        else if (media.addListener) media.addListener(applyInstantly);
    }
    window.addEventListener('storage', function (event) {
        if (event.key === key || event.key === null) {
            choice = readChoice();
            applyInstantly();
        }
    });
    window.addEventListener('pageshow', function () {
        choice = readChoice(choice);
        applyInstantly();
    });
    document.addEventListener('DOMContentLoaded', function () {
        button = document.querySelector('.theme-toggle');
        if (!button) return;
        applyTheme();
        button.hidden = false;
        button.addEventListener('click', function () {
            choice = (choice || root.getAttribute('data-theme')) === 'dark' ? 'light' : 'dark';
            try { window.localStorage.setItem(key, choice); } catch (error) { /* Session still works. */ }
            changeWithMotion();
        });
    });
}());
