(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VesselUI = Object.assign(root.VesselUI || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  var CORRUPTION_PALETTES = {
    pure: { bg: "#0a0908", vignette: "rgba(0,0,0,0)", hud: "#c8bfaa", tear: "#e8e0d0", glow: "rgba(200,191,170,0.08)" },
    tainted: { bg: "#0c0a06", vignette: "rgba(30,20,0,0.15)", hud: "#d4b870", tear: "#d4b870", glow: "rgba(180,150,60,0.12)" },
    corrupt: { bg: "#0e0508", vignette: "rgba(60,0,10,0.25)", hud: "#c44030", tear: "#c44030", glow: "rgba(180,40,30,0.18)" },
    consumed: { bg: "#06010a", vignette: "rgba(20,0,30,0.40)", hud: "#6a2080", tear: "#1a0a1e", glow: "rgba(100,20,120,0.25)" },
  };

  function getTierForLevel(corruption) {
    if (corruption >= 75) return "consumed";
    if (corruption >= 50) return "corrupt";
    if (corruption >= 25) return "tainted";
    return "pure";
  }

  function getCorruptionPalette(tierId) {
    return CORRUPTION_PALETTES[tierId] || CORRUPTION_PALETTES.pure;
  }

  function renderCorruptionVignette(ctx, tierId, canvasW, canvasH) {
    var palette = getCorruptionPalette(tierId);
    if (palette.vignette === "rgba(0,0,0,0)") return;

    var gradient = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, canvasW * 0.25,
      canvasW / 2, canvasH / 2, canvasW * 0.65
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, palette.vignette);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  function renderCorruptionMeter(ctx, corruption, x, y, width, height) {
    var tier = getTierForLevel(corruption);
    var palette = getCorruptionPalette(tier);

    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = "#0d0a08";
    ctx.fillRect(x, y, width, height);

    var fillW = (corruption / 100) * width;
    ctx.fillStyle = palette.tear;
    ctx.fillRect(x, y, fillW, height);

    ctx.fillStyle = palette.hud;
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(Math.floor(corruption) + "%", x + width - 3, y + height - 2);
    ctx.textAlign = "left";
    ctx.lineWidth = 1;
  }

  function renderWhisperText(ctx, text, alpha, canvasW, canvasH) {
    if (!text || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = "#8a7060";
    ctx.font = "italic 14px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvasW / 2, canvasH * 0.82);
    ctx.restore();
  }

  function renderNarrativeBox(ctx, text, alpha, canvasW, canvasH) {
    if (!text || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = "rgba(4,2,6,0.85)";
    var boxH = 100;
    var boxY = canvasH / 2 - boxH / 2;
    ctx.fillRect(0, boxY, canvasW, boxH);
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, boxY + 4, canvasW - 40, boxH - 8);
    ctx.fillStyle = "#b8a890";
    ctx.font = "13px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    var words = text.split(" ");
    var lines = [];
    var line = "";
    var maxWidth = canvasW - 80;
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? " " : "") + words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    var lineH = 18;
    var startY = canvasH / 2 - ((lines.length - 1) * lineH) / 2;
    for (var j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], canvasW / 2, startY + j * lineH);
    }

    ctx.restore();
  }

  function renderEndingScreen(ctx, ending, alpha, canvasW, canvasH) {
    if (!ending || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = "rgba(2,1,4,0.95)";
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = "#c8bfaa";
    ctx.font = "bold 22px serif";
    ctx.textAlign = "center";
    ctx.fillText(ending.name, canvasW / 2, canvasH * 0.35);

    ctx.fillStyle = "#8a7a68";
    ctx.font = "14px serif";
    var descWords = ending.desc.split(" ");
    var descLines = [];
    var descLine = "";
    var mw = canvasW - 120;
    for (var d = 0; d < descWords.length; d++) {
      var dt = descLine + (descLine ? " " : "") + descWords[d];
      if (ctx.measureText(dt).width > mw && descLine) {
        descLines.push(descLine);
        descLine = descWords[d];
      } else {
        descLine = dt;
      }
    }
    if (descLine) descLines.push(descLine);
    for (var dl = 0; dl < descLines.length; dl++) {
      ctx.fillText(descLines[dl], canvasW / 2, canvasH * 0.48 + dl * 20);
    }

    ctx.restore();
  }

  function renderConfessionPrompt(ctx, alpha, canvasW, canvasH) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);

    ctx.fillStyle = "rgba(6,3,8,0.8)";
    ctx.fillRect(canvasW / 2 - 160, canvasH / 2 - 50, 320, 100);

    ctx.strokeStyle = "#3a2a1a";
    ctx.strokeRect(canvasW / 2 - 158, canvasH / 2 - 48, 316, 96);

    ctx.fillStyle = "#b8a890";
    ctx.font = "13px serif";
    ctx.textAlign = "center";
    ctx.fillText("The vessel trembles before the confessional.", canvasW / 2, canvasH / 2 - 20);

    ctx.fillStyle = "#7da07a";
    ctx.fillText("[E] RESIST - hold to what remains", canvasW / 2, canvasH / 2 + 10);

    ctx.fillStyle = "#a05050";
    ctx.fillText("[Q] YIELD - let the darkness in", canvasW / 2, canvasH / 2 + 30);

    ctx.restore();
  }

  return {
    CORRUPTION_PALETTES: CORRUPTION_PALETTES,
    getTierForLevel: getTierForLevel,
    getCorruptionPalette: getCorruptionPalette,
    renderCorruptionVignette: renderCorruptionVignette,
    renderCorruptionMeter: renderCorruptionMeter,
    renderWhisperText: renderWhisperText,
    renderNarrativeBox: renderNarrativeBox,
    renderEndingScreen: renderEndingScreen,
    renderConfessionPrompt: renderConfessionPrompt,
  };
});
