// Shot list goes here once the chapter 235 pages are in pages/ (see PLAN.md).
(function (J) {
  J.shot('waiting-for-pages', 2, (ctx, t) => {
    ctx.fillStyle = J.PAPER; ctx.fillRect(0, 0, J.W, J.H);
    J.sfx(ctx, '待機', J.W / 2, J.H / 2 - 30, 120, { pop: 1 + Math.sin(t * 4) * 0.03 });
    J.caption(ctx, ['Drop ch.235 pages into jjk-235/pages/'], J.W / 2, J.H / 2 + 70, { align: 'center', size: 24 });
  });
})(window.J);
