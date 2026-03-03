(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselPresentation = Object.assign(root.VesselPresentation || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const ANIMATION_CHECKLIST = {
    player: ["idle", "move", "attack-telegraph", "hit"],
    enemy: ["idle", "move", "attack-telegraph", "hit", "death", "spawn"],
    item: ["idle", "spawn", "pickup"],
    boss: ["idle", "move", "attack-telegraph", "hit", "death", "spawn"],
  };

  const ENEMY_STYLE = {
    penitent: { body: "#8d2f39", accent: "#e3c5be", silhouette: "stalker" },
    hollowed: { body: "#b5a390", accent: "#2f1f1b", silhouette: "hulk" },
    wisp: { body: "#8761a3", accent: "#d5bbeb", silhouette: "orb" },
    bonecrawler: { body: "#b4b1a0", accent: "#2f2420", silhouette: "stalker" },
    revenant: { body: "#7d7d82", accent: "#190d12", silhouette: "hulk" },
    plague: { body: "#597f50", accent: "#10250e", silhouette: "stalker" },
    seraph: { body: "#c98556", accent: "#fff2d8", silhouette: "orb" },
    choir: { body: "#9362ad", accent: "#271523", silhouette: "stalker" },
    tendril: { body: "#190816", accent: "#7f4b65", silhouette: "pillar" },
    shepherd: { body: "#6a3a2b", accent: "#f0c9ab", silhouette: "boss-bulk" },
    pit: { body: "#1d0812", accent: "#9a2f49", silhouette: "boss-bulk" },
  };

  function evaluateEnemyAnimationState(enemy, nowMs) {
    if (enemy.hp <= 0) return "death";
    if (enemy.spawnT > 0) return "spawn";
    if (enemy.slowT > 0 || enemy.invulnHit > 0) return "hit";
    if (enemy.charge > 0 || enemy.cd <= 0.2) return "attack-telegraph";
    const wobble = Math.sin(nowMs * 0.006 + enemy.x * 0.01 + enemy.y * 0.01);
    return wobble > 0.4 ? "move" : "idle";
  }

  function summarizeReadability(enemies) {
    const bySilhouette = {};
    const byType = {};
    for (const enemy of enemies) {
      const style = ENEMY_STYLE[enemy.type] || { silhouette: "unknown" };
      bySilhouette[style.silhouette] = (bySilhouette[style.silhouette] || 0) + 1;
      byType[enemy.type] = (byType[enemy.type] || 0) + 1;
    }
    return {
      total: enemies.length,
      silhouettes: bySilhouette,
      enemyTypes: byType,
      distinctSilhouettes: Object.keys(bySilhouette).length,
      distinctTypes: Object.keys(byType).length,
    };
  }

  function drawPixelBody(ctx, x, y, w, h, body, accent) {
    ctx.fillStyle = body; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = accent; ctx.fillRect(x - w / 2 + 2, y - h / 2 + 2, Math.max(2, w - 4), Math.max(2, h / 3));
  }

  function renderPlayer(ctx, player, nowMs) {
    const moving = Math.hypot(player.vx, player.vy) > 28;
    const state = player.inv > 0 ? "hit" : moving ? "move" : "idle";
    const bob = state === "move" ? Math.sin(nowMs * 0.014) * 1.4 : 0;
    const tone = player.corruption > 50 ? "#d2b090" : "#ead9c2";
    drawPixelBody(ctx, player.x, player.y + bob, 16, 24, tone, "#171213");
    if (state === "hit") {
      ctx.strokeStyle = "rgba(214,103,110,0.8)";
      ctx.strokeRect(player.x - 10, player.y - 14, 20, 28);
    }
    if (player.corruption > 50) {
      ctx.strokeStyle = "rgba(16,0,18,0.7)";
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15 + Math.sin(nowMs * 0.01), 0, Math.PI * 2);
      ctx.stroke();
    }
    return state;
  }

  function renderEnemy(ctx, enemy, nowMs) {
    const style = ENEMY_STYLE[enemy.type] || { body: enemy.color || "#836070", accent: "#1a0e14", silhouette: "stalker" };
    const state = evaluateEnemyAnimationState(enemy, nowMs);
    const pulse = state === "attack-telegraph" ? (Math.sin(nowMs * 0.03) > 0 ? 2 : 0) : 0;
    if (style.silhouette === "orb") {
      ctx.fillStyle = style.body;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r + pulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = style.accent;
      ctx.fillRect(enemy.x - 4, enemy.y - 2, 8, 4);
    } else if (style.silhouette === "pillar") {
      drawPixelBody(ctx, enemy.x, enemy.y, 14 + pulse, 40, style.body, style.accent);
    } else if (style.silhouette === "boss-bulk") {
      drawPixelBody(ctx, enemy.x, enemy.y, enemy.r * 1.4 + pulse, enemy.r * 1.5 + pulse, style.body, style.accent);
    } else if (style.silhouette === "hulk") {
      drawPixelBody(ctx, enemy.x, enemy.y, enemy.r * 1.3 + pulse, enemy.r * 1.3 + pulse, style.body, style.accent);
    } else {
      drawPixelBody(ctx, enemy.x, enemy.y, enemy.r * 1.2 + pulse, enemy.r * 1.4 + pulse, style.body, style.accent);
    }
    if (state === "hit") {
      ctx.strokeStyle = "rgba(245,166,166,0.8)";
      ctx.strokeRect(enemy.x - enemy.r * 0.8, enemy.y - enemy.r * 0.9, enemy.r * 1.6, enemy.r * 1.8);
    }
    return state;
  }

  function renderPickup(ctx, pickup, nowMs) {
    const glow = 1 + Math.sin(nowMs * 0.01) * 0.08;
    ctx.fillStyle = "#2d1f12"; ctx.fillRect(pickup.x - 14, pickup.y + 8, 28, 8);
    ctx.fillStyle = "#f2e4bf"; ctx.fillRect(pickup.x - 10 * glow, pickup.y - 18, 20 * glow, 28);
  }

  function renderProjectile(ctx, shot) {
    ctx.fillStyle = shot.color || "#a33";
    ctx.fillRect(shot.x - 4, shot.y - 4, 8, 8);
    ctx.strokeStyle = "rgba(255,236,218,0.22)";
    ctx.strokeRect(shot.x - 4, shot.y - 4, 8, 8);
  }

  return {
    ANIMATION_CHECKLIST,
    ENEMY_STYLE,
    evaluateEnemyAnimationState,
    summarizeReadability,
    renderPlayer,
    renderEnemy,
    renderPickup,
    renderProjectile,
  };
});
