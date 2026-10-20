// Orbit Sweep — Phaser 4 + game-feel skill. URL flags: ?juice=0 (no feedback), ?auto=1 (scripted autoplay), ?seed=N
const Q = new URLSearchParams(location.search);
const JUICE = Q.get('juice') !== '0', AUTO = Q.get('auto') === '1';
let seed = +(Q.get('seed') || 7);
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const W = 960, H = 540;
window.__stats = { gems: 0, kills: 0, hits: 0, dashes: 0, frames: 0, slowFrames: 0, over: false, score: 0 };

class Play extends Phaser.Scene {
  constructor() { super('play'); }
  init() { // reset run state here (phaser-core: scene instances are reused)
    this.score = 0; this.lives = 3; this.combo = 0; this.t = 0; this.trauma = 0; this.shakeT = 0;
    this.dashCd = 0; this.dashing = 0; this.inv = 0; this.over = false; this.spawnT = 0;
  }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0x7cf7ff); g.fillTriangle(0, 28, 14, 0, 28, 28); g.generateTexture('ship', 28, 28); g.clear();
    g.fillStyle(0xffd34d); g.fillCircle(9, 9, 9); g.fillStyle(0xfff4c2); g.fillCircle(6, 6, 3); g.generateTexture('gem', 18, 18); g.clear();
    g.fillStyle(0xff4d7a); g.fillCircle(13, 13, 13); g.fillStyle(0x2a0c18); g.fillCircle(13, 13, 6); g.generateTexture('drone', 26, 26); g.clear();
    g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); g.generateTexture('spark', 8, 8); g.destroy();
    for (let i = 0; i < 90; i++) this.add.circle(rnd() * W, rnd() * H, rnd() * 1.6 + .3, 0xffffff, rnd() * .6 + .1);
    this.player = this.physics.add.sprite(W / 2, H / 2, 'ship').setCollideWorldBounds(true).setDamping(true).setDrag(0.02).setMaxVelocity(340);
    this.gems = this.physics.add.group(); this.drones = this.physics.add.group();
    for (let i = 0; i < 5; i++) this.spawnGem();
    this.physics.add.overlap(this.player, this.gems, (p, gm) => this.onPickup(gm));
    this.physics.add.overlap(this.player, this.drones, (p, d) => this.onTouch(d));
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R');
    this.add.rectangle(W / 2, 20, W, 40, 0x000000, 0.45).setDepth(9.9); this.hud = this.add.text(16, 9, '', { fontFamily: 'monospace', fontSize: '20px', color: '#e8ecff' }).setDepth(10);
    this.msg = this.add.text(W / 2, H / 2, '', { fontFamily: 'monospace', fontSize: '40px', color: '#fff', align: 'center' }).setOrigin(.5).setDepth(10);
    if (JUICE) this.sparks = this.add.particles(0, 0, 'spark', { speed: { min: 80, max: 320 }, lifespan: 450, scale: { start: 1, end: 0 }, emitting: false });
    this.flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(9);
  }
  spawnGem() { this.gems.create(40 + rnd() * (W - 80), 40 + rnd() * (H - 80), 'gem'); }
  spawnDrone() {
    const side = Math.floor(rnd() * 4), x = side === 0 ? 0 : side === 1 ? W : rnd() * W, y = side === 2 ? 0 : side === 3 ? H : rnd() * H;
    this.drones.create(x, y, 'drone').setCircle(13);
  }
  // ---- game-feel skill: tiered feedback bundle ----
  feedback(x, y, tier, color) {
    if (!JUICE) return;
    const T = { small: [0.12, 0, 6], medium: [0.35, 50, 14], large: [0.75, 120, 32] }[tier];
    this.trauma = Math.min(1, this.trauma + T[0]);           // trauma adds, never resets
    if (T[1]) this.hitStop(T[1]);
    this.sparks.setParticleTint(color); this.sparks.explode(T[2], x, y);
    if (tier === 'large') { this.flash.setAlpha(0.35); this.tweens.add({ targets: this.flash, alpha: 0, duration: 120 }); }
  }
  hitStop(ms) { // real-time pause; physics only, so input and render keep running
    this.physics.pause(); clearTimeout(this._hs); this._hs = setTimeout(() => { if (!this.over) this.physics.resume(); }, ms);
  }
  pop(obj, sx = 1.4, sy = 0.65) {
    if (!JUICE) return; obj.setScale(sx, sy);
    this.tweens.add({ targets: obj, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' });
  }
  numberPop(x, y, txt, color) {
    if (!JUICE) return;
    const t = this.add.text(x, y, txt, { fontFamily: 'monospace', fontSize: '22px', color, stroke: '#000', strokeThickness: 4 }).setOrigin(.5).setScale(.4);
    this.tweens.add({ targets: t, scale: 1, y: y - 36, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 380, duration: 250, onComplete: () => t.destroy() });
  }
  // ---- events ----
  onPickup(gm) {
    const x = gm.x, y = gm.y; gm.destroy(); this.spawnGem();
    this.combo++; const pts = 10 * this.combo; this.score += pts; __stats.gems++;
    this.feedback(x, y, 'small', 0xffd34d); this.pop(this.player, 1.25, 0.8); this.numberPop(x, y, '+' + pts, '#ffd34d');
  }
  onTouch(d) {
    if (this.dashing > 0) {
      const x = d.x, y = d.y; d.destroy(); this.score += 50; __stats.kills++;
      this.feedback(x, y, 'medium', 0xff4d7a); this.numberPop(x, y, '+50', '#ff8fb0'); return;
    }
    if (this.inv > 0) return;
    this.lives--; this.combo = 0; this.inv = 1.2; __stats.hits++;
    const ang = Phaser.Math.Angle.Between(d.x, d.y, this.player.x, this.player.y);
    this.player.body.velocity.setToPolar(ang, 420);       // knockback
    d.destroy(); this.feedback(this.player.x, this.player.y, 'large', 0x7cf7ff);
    if (this.lives <= 0) this.gameOver();
  }
  gameOver() {
    this.over = true; this.physics.pause(); this.hud.setText(`SCORE ${this.score}   ${this.t.toFixed(1)}s`); this.add.rectangle(W/2,H/2,W,H,0x05060d,0.7).setDepth(9.5); __stats.over = true; __stats.score = this.score;
    this.msg.setText(`GAME OVER\nscore ${this.score}\nR to restart`); this.pop(this.msg, 1.5, 0.6);
  }
  update(time, delta) {
    __stats.frames++; if (delta > 25) __stats.slowFrames++;
    const dt = delta / 1000; const k = this.keys;
    if (this.over) { if (k.R.isDown) { __stats.over = false; this.scene.restart(); } return; }
    this.t += dt; this.dashCd -= dt; this.dashing -= dt; this.inv -= dt;
    let ix = 0, iy = 0, dash = false;
    if (AUTO) [ix, iy, dash] = this.autopilot();
    else { ix = (k.D.isDown || k.RIGHT.isDown) - (k.A.isDown || k.LEFT.isDown); iy = (k.S.isDown || k.DOWN.isDown) - (k.W.isDown || k.UP.isDown); dash = Phaser.Input.Keyboard.JustDown(k.SPACE); }
    const len = Math.hypot(ix, iy) || 1; this.player.setAcceleration(ix / len * 900, iy / len * 900);
    if (ix || iy) this.player.rotation = Math.atan2(iy, ix) + Math.PI / 2;
    if (dash && this.dashCd <= 0) {
      this.dashCd = 0.9; this.dashing = 0.25; __stats.dashes++;
      const r = this.player.rotation - Math.PI / 2; this.player.body.velocity.setToPolar(r, 640);
      this.pop(this.player, 0.6, 1.5); if (JUICE) this.trauma = Math.min(1, this.trauma + 0.08);
    }
    this.player.setMaxVelocity(this.dashing > 0 ? 640 : 340);
    this.player.setTint(this.dashing > 0 ? 0xffffff : 0x7cf7ff); this.player.setAlpha(this.inv > 0 && Math.floor(this.t * 20) % 2 ? .35 : 1);
    this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnDrone(); this.spawnT = Math.max(0.45, 2.2 - this.t * 0.04); }
    const sp = 70 + this.t * 2.5;
    this.drones.getChildren().forEach(d => d && this.physics.moveToObject(d, this.player, sp));
    // trauma shake: quadratic, smooth sin-driven, decays, moves the camera only
    if (JUICE && this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - 1.4 * dt); const s = this.trauma * this.trauma; this.shakeT += dt * 30;
      this.cameras.main.setScroll(14 * s * Math.sin(this.shakeT * 1.7), 9 * s * Math.sin(this.shakeT * 2.3)); this.cameras.main.setRotation(0.05 * s * Math.sin(this.shakeT * 1.1));
    } else { this.cameras.main.setScroll(0, 0); this.cameras.main.setRotation(0); }
    this.hud.setText(`SCORE ${this.score}   x${this.combo}   ${'♥'.repeat(this.lives)}   ${this.t.toFixed(1)}s   ${this.dashCd <= 0 ? 'DASH READY' : ''}`);
    __stats.score = this.score;
  }
  autopilot() { // scripted play for recording: chase nearest gem, steer from drones, dash when one is close ahead
    const p = this.player; let best = null, bd = 1e9;
    this.gems.getChildren().forEach(g => { if (g) { const d = Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y); if (d < bd) { bd = d; best = g; } } });
    let ix = best ? best.x - p.x : 0, iy = best ? best.y - p.y : 0; const n = Math.hypot(ix, iy) || 1; ix /= n; iy /= n;
    let dash = false;
    this.drones.getChildren().forEach(d => { if (!d) return; const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy);
      if (dist < 90) { if (this.dashCd <= 0 && dist < 80) { ix = -dx / dist; iy = -dy / dist; dash = true; } else { ix += dx / dist * 0.9; iy += dy / dist * 0.9; } } });
    const m = 90; if (p.x < m) ix += (m - p.x) / m * 2; if (p.x > W - m) ix -= (p.x - W + m) / m * 2; if (p.y < m) iy += (m - p.y) / m * 2; if (p.y > H - m) iy -= (p.y - H + m) / m * 2;
    return [ix, iy, dash];
  }
}
window.game = new Phaser.Game({ type: Phaser.AUTO, width: W, height: H, backgroundColor: '#0b0d1a', physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [Play] });
