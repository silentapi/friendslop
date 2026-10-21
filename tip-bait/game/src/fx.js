// Gameplay VFX: pooled particle bursts, ground shockwaves, the boost's wheel energy trails and wind streaks.
import { THREE, V, canvasTex } from './core.js';

const dot = () => canvasTex('fxdot', 64, 64, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });

export function createFX(scene) {
  const g = new THREE.Group(); g.name = 'fx'; scene.add(g);
  // ---- particle pool (additive points, per-particle colour + size)
  const N = 600, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const pm = new THREE.PointsMaterial({ map: dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, size: 1 });
  pm.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('uniform float size;', 'attribute float size;'); };
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; g.add(pts);
  const parts = Array.from({ length: N }, () => ({ p: V(), v: V(), c: new THREE.Color(), life: 0, max: 1, s: 0.3, grav: 0 }));
  let cursor = 0;
  function burst(at, { color = 0xffd34a, n = 14, speed = 4, up = 2, life = 0.6, size = 0.35, grav = 6, spread = 0.2 } = {}) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const q = parts[cursor = (cursor + 1) % N];
      q.p.copy(at).add(V((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1;
      q.v.set(Math.cos(a) * speed * e, up * (0.4 + Math.random()), Math.sin(a) * speed * e);
      q.c.copy(c).lerp(new THREE.Color(0xffffff), Math.random() * 0.4); q.max = q.life = life * (0.6 + Math.random() * 0.6); q.s = size * (0.6 + Math.random() * 0.8); q.grav = grav;
    }
  }
  // ---- ground shockwave rings
  const ringT = canvasTex('fxring', 128, 128, (c, w) => { const g2 = c.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.75, 'rgba(255,255,255,.9)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(0, 0, w, w); });
  const rings = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ringT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.visible = false; g.add(m); return { m, t: 9, max: 0.5, r: 6 }; });
  function shock(at, { color = 0x46ff8f, radius = 7, dur = 0.5 } = {}) { const r = rings.find((q) => q.t > q.max) || rings[0]; r.t = 0; r.max = dur; r.r = radius; r.m.material.color.set(color); r.m.position.copy(at).setY(0.12); r.m.visible = true; }
  // ---- boost: energy trails off both wheels + wind streaks rushing past the camera
  const trailMat = new THREE.MeshBasicMaterial({ color: 0x46ff8f, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  const trails = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), trailMat); m.frustumCulled = false; g.add(m); return { m, pts: [] }; });
  const WN = 70, wgeo = new THREE.BufferGeometry(), wpos = new Float32Array(WN * 6), wcol = new Float32Array(WN * 6);
  wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3)); wgeo.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
  const wind = new THREE.LineSegments(wgeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); wind.frustumCulled = false; g.add(wind);
  const streaks = Array.from({ length: WN }, () => ({ o: V(), z: 0 }));
  const seedStreak = (q) => { const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 3.2; q.o.set(Math.cos(a) * r, 0.4 + Math.abs(Math.sin(a)) * r * 0.8, 0); q.z = 6 + Math.random() * 30; };
  streaks.forEach(seedStreak);
  let boostK = 0;
  function ribbon(mesh, list, half) {
    if (list.length < 2) { mesh.visible = false; return; } mesh.visible = true;
    const P = [], C = [], I = [];
    list.forEach((p, i) => { const a = (i / (list.length - 1)) * boostK; P.push(p.x, p.y - half, p.z, p.x, p.y + half, p.z); C.push(a, a, a, a, a, a); if (i) { const k = (i - 1) * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
    const gg = mesh.geometry; gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); gg.setIndex(I);
  }
  function update(dt, { rider, boosting, speed, fwd, right, cruise = 0 }) {
    // particles
    for (let i = 0; i < N; i++) {
      const q = parts[i];
      if (q.life > 0) { q.life -= dt; q.v.y -= q.grav * dt; q.v.multiplyScalar(1 - dt * 1.5); q.p.addScaledVector(q.v, dt); if (q.p.y < 0.03) { q.p.y = 0.03; q.v.y *= -0.3; } }
      const a = Math.max(0, q.life / q.max);
      pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z;
      col[i * 3] = q.c.r * a; col[i * 3 + 1] = q.c.g * a; col[i * 3 + 2] = q.c.b * a; size[i] = q.life > 0 ? q.s * (0.5 + a * 0.5) : 0;
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = true;
    for (const r of rings) { if (r.t > r.max) { r.m.visible = false; continue; } r.t += dt; const u = Math.min(1, r.t / r.max); r.m.scale.setScalar(0.5 + u * r.r * 2); r.m.material.opacity = 1 - u; }
    // boost: trails + wind
    boostK += ((boosting ? 1 : 0) - boostK) * (1 - Math.exp(-(boosting ? 10 : 3) * dt));
    if (rider) {
      [V(0, 0.32, -0.6), V(0, 0.32, 0.6)].forEach((local, k) => { const t = trails[k]; if (boostK > 0.02) { t.pts.push(rider.localToWorld(local.clone())); if (t.pts.length > 26) t.pts.shift(); } else t.pts.length = 0; ribbon(t.m, t.pts, 0.14 - k * 0.04); });
      const base = rider.position;
      streaks.forEach((q, i) => {
        q.z -= dt * (speed * 1.8 + 20);
        if (q.z < -14) seedStreak(q);
        const p = base.clone().addScaledVector(fwd, q.z).addScaledVector(right, q.o.x).add(V(0, q.o.y, 0));
        const tail = p.clone().addScaledVector(fwd, 2.2 + speed * 0.12), lvl = Math.max(boostK * 0.95, cruise * 0.38 * (i % 3 ? 1 : 0)), a = lvl * Math.min(1, (q.z + 14) / 6);
        wpos.set([p.x, p.y, p.z, tail.x, tail.y, tail.z], i * 6); wcol.set([(0.85 - 0.25 * boostK) * a, a, (0.85 - 0.1 * boostK) * a, 0, 0, 0], i * 6);
      });
      wgeo.attributes.position.needsUpdate = wgeo.attributes.color.needsUpdate = true; wind.visible = boostK > 0.02 || cruise > 0.05;
    }
  }
  return { burst, shock, update, dispose: () => g.removeFromParent(), group: g };
}
