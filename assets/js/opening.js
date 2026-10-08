/* Home only; opt in before CSS paints. The static page never depends on this. */
(function () {
    'use strict';
    var root = document.documentElement;
    var motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var key = 'mametaro-home-opened';
    var navigation = window.performance && window.performance.getEntriesByType ? window.performance.getEntriesByType('navigation')[0] : null;
    if (!motion || motion.matches || document.visibilityState === 'hidden' ||
        window.location.hash || (navigation && navigation.type === 'back_forward')) return;
    try {
        // If storage is unavailable, stay still rather than replay on every visit.
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, '1');
    } catch (error) { return; }

    function finish() { root.removeAttribute('data-home-opening'); }
    root.setAttribute('data-home-opening', '');
    // CSS ends on its own even if a later script fails; this only clears the flag.
    document.addEventListener('DOMContentLoaded', function () {
        window.setTimeout(finish, 1200);
    }, { once:true });
    window.addEventListener('pagehide', finish);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') finish();
    });
    // Keyboard focus and an early theme click get the settled, interactive page.
    document.addEventListener('focusin', finish, { once:true });
    document.addEventListener('pointerdown', finish, { once:true });
    if (motion.addEventListener) motion.addEventListener('change', function () {
        if (motion.matches) finish();
    });
}());
