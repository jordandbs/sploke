/* Séance en cours : chronomètre, minuteur de repos, récapitulatif */
"use strict";
let sessEl = null,
  WL = null,
  AC = null;
const R = { dur: 90, end: null, left: null };
/* Son de fin de repos : joue sounds/rest-end.mp3 s'il existe, sinon le bip intégré. */
const REST_SOUND = "sounds/rest-end.mp3";
let restBuf = null,
  restTried = false;
async function loadRestSound() {
  if (restTried || !AC) return;
  restTried = true;
  try {
    const r = await fetch(REST_SOUND);
    if (!r.ok) return;
    restBuf = await AC.decodeAudioData(await r.arrayBuffer());
  } catch (e) {}
}
function ensureAudio() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    loadRestSound();
  } catch (e) {}
}
function beep() {
  try {
    navigator.vibrate && navigator.vibrate([200, 100, 200]);
  } catch (e) {}
  if (!AC) return;
  if (restBuf) {
    const s = AC.createBufferSource();
    s.buffer = restBuf;
    s.connect(AC.destination);
    s.start();
    s.stop(AC.currentTime + 5); /* 5 secondes maximum */
    return;
  }
  [0, 0.28, 0.56].forEach((d) => {
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.frequency.value = d > 0.5 ? 1175 : 880;
    g.gain.value = 0.18;
    o.connect(g);
    g.connect(AC.destination);
    o.start(AC.currentTime + d);
    o.stop(AC.currentTime + d + 0.18);
  });
}
async function wakeLock() {
  try {
    if ("wakeLock" in navigator && !WL) {
      WL = await navigator.wakeLock.request("screen");
      WL.addEventListener("release", () => {
        WL = null;
      });
    }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && sessEl) wakeLock();
});

function makeSx(exId, n, target) {
  const p = lastPerf(exId);
  return {
    exId,
    name: exName(exId),
    target,
    prev: p ? p.sets.map((s) => ({ kg: s.kg, reps: s.reps })) : [],
    sets: Array.from({ length: n }, (_, i) => {
      const s = p && (p.sets[i] || p.sets[p.sets.length - 1]);
      return {
        kg: s ? String(s.kg) : "",
        reps: s ? String(s.reps) : "",
        done: false,
      };
    }),
  };
}
function startWorkout(id) {
  const w = woById(id);
  if (!w) return;
  if (!w.items.length) {
    toast("Ajoute d’abord des exercices à cette séance");
    return;
  }
  const go = () => {
    S.active = {
      id: uid(),
      workoutId: w.id,
      name: w.name,
      startedAt: Date.now(),
      exs: w.items
        .filter((i) => exById(i.exId))
        .map((i) => makeSx(i.exId, i.sets, i.reps)),
    };
    R.dur = S.settings.rest;
    R.end = null;
    R.left = null;
    save();
    openSession();
  };
  if (S.active) {
    ask(
      "Une séance est déjà en cours. La remplacer par « " + w.name + " » ?",
      "Remplacer",
      true,
    ).then((ok) => {
      if (ok) {
        closeSession();
        go();
      }
    });
  } else go();
}
function openSession() {
  if (!S.active) return;
  if (sessEl && sessEl.isConnected) {
    return;
  }
  R.dur = R.dur || S.settings.rest;
  sessEl = modal("", { full: true });
  sessEl.id = "sess";
  const w = woById(S.active.workoutId);
  sessEl.style.setProperty("--wc", w ? w.color : "var(--tx)");
  sessEl.firstChild.innerHTML = `<div class="sess-head"><div class="row"><div class="sp"><div class="nm" id="sname"></div><div class="chrono" id="chrono">00:00</div></div>
    <button class="btn s" data-a="smin">Réduire</button><button class="btn primary s" data-a="sfin">Terminer</button></div><div class="prog"><i id="sprog"></i></div></div>
    <div class="sess-body" id="sbody"></div><div class="restbar" id="restbar"></div>`;
  renderSession();
  wakeLock();
}
function closeSession() {
  if (sessEl) {
    const e = sessEl;
    sessEl = null;
    closeModal(e);
  }
  try {
    WL && WL.release();
  } catch (e) {}
  WL = null;
}
function curSet() {
  const a = S.active;
  for (let i = 0; i < a.exs.length; i++)
    for (let j = 0; j < a.exs[i].sets.length; j++)
      if (!a.exs[i].sets[j].done) return [i, j];
  return null;
}
function renderSession() {
  const a = S.active;
  if (!a || !sessEl) return;
  $("#sname").textContent = a.name;
  const body = $("#sbody"),
    st = body.scrollTop,
    cur = curSet();
  body.innerHTML =
    a.exs
      .map(
        (
          x,
          i,
        ) => `<div class="sx"><div class="sx-h"><div class="sp"><div class="nm">${esc(exName(x.exId, x.name))}</div><div class="mut sm">Objectif : ${x.sets.length} × ${x.target}</div></div>
    <button class="ib" data-a="svid" data-id="${x.exId}" aria-label="Voir l’exercice">${ic("video")}</button><button class="ib dng" data-a="sdelx" data-e="${i}" aria-label="Retirer l’exercice">${ic("trash")}</button></div>
    <div class="shead"><span>Série</span><span>Précédent</span><span>kg</span><span>Reps</span><span></span></div>
    ${x.sets
      .map((s, j) => {
        const pv = x.prev[j] || x.prev[x.prev.length - 1];
        const isC = cur && cur[0] === i && cur[1] === j;
        return `<div class="srow ${s.done ? "done" : ""} ${isC ? "cur" : ""}"><span class="sn">${j + 1}</span><span class="prev">${pv ? esc(nf(pv.kg, 2) + " × " + pv.reps) : "–"}</span>
      <input data-in="sk" data-e="${i}" data-s="${j}" inputmode="decimal" placeholder="kg" value="${esc(s.kg)}" aria-label="Poids série ${j + 1}">
      <input data-in="sr" data-e="${i}" data-s="${j}" inputmode="numeric" placeholder="reps" value="${esc(s.reps)}" aria-label="Répétitions série ${j + 1}">
      <button class="chk" data-a="sdone" data-e="${i}" data-s="${j}" aria-label="Valider la série">${ic("check")}</button></div>`;
      })
      .join("")}
    <div class="sx-f"><button class="btn s sp" data-a="saddset" data-e="${i}">${ic("plus")}Série</button><button class="btn s ghost" data-a="srmset" data-e="${i}" ${x.sets.length < 2 ? "disabled" : ""}>${ic("minus")}Série</button></div></div>`,
      )
      .join("") +
    `<button class="btn block" data-a="saddex">${ic("plus")}Ajouter un exercice</button>`;
  body.scrollTop = st;
  const tot = a.exs.reduce((t, x) => t + x.sets.length, 0),
    dn = a.exs.reduce((t, x) => t + x.sets.filter((s) => s.done).length, 0);
  $("#sprog").style.width = (tot ? (dn / tot) * 100 : 0) + "%";
  paintRest();
}
function paintRest() {
  const r = $("#restbar");
  if (!r) return;
  const run = !!R.end,
    left = restLeft(),
    fin = !run && R.left === 0;
  r.className = "restbar" + (fin ? " end" : "");
  r.innerHTML = `<div class="row"><div class="rtime" id="rtime">${mmss(left / 1000)}</div>
    <button class="btn s" data-a="rminus" aria-label="Moins 15 secondes">−15</button><button class="btn s" data-a="rplus" aria-label="Plus 15 secondes">+15</button>
    <span class="sp"></span><button class="ib" data-a="rreset" aria-label="Réinitialiser">${ic("reset")}</button>
    <button class="btn primary" data-a="rtoggle" aria-label="${run ? "Pause" : "Lancer le repos"}" style="min-width:56px">${run ? ic("pause") : ic("play", "fill")}</button></div>
    <div class="rprog"><i id="rbar"></i></div>
    <div class="row"><div class="chips sp">${[45, 60, 90, 120, 180].map((s) => `<button class="chip ${R.dur === s ? "on" : ""}" data-a="rdur" data-s="${s}">${s >= 60 ? s / 60 + " min" + (s % 60 ? " " + (s % 60) : "") : s + " s"}</button>`).join("")}</div>
    <button class="btn s" data-a="rnext">${ic("skip")}Série suivante</button></div>`;
  updRestBar();
}
function updRestBar() {
  const b = $("#rbar");
  if (b)
    b.style.width =
      Math.min(
        100,
        (R.end || R.left != null ? 1 - restLeft() / (R.dur * 1000) : 0) * 100,
      ) + "%";
}
const restLeft = () =>
  R.end
    ? Math.max(0, R.end - Date.now())
    : R.left != null
      ? R.left
      : R.dur * 1000;
function restStart() {
  ensureAudio();
  R.end = Date.now() + (R.left > 0 ? R.left : R.dur * 1000);
  R.left = null;
  paintRest();
}
function restPause() {
  R.left = Math.max(0, R.end - Date.now());
  R.end = null;
  paintRest();
}
function restReset() {
  R.end = null;
  R.left = null;
  paintRest();
}
function tick() {
  const a = S.active;
  if (a) {
    const t = mmss((Date.now() - a.startedAt) / 1000);
    const c = $("#chrono");
    if (c) c.textContent = t;
    const b = $("#bchrono");
    if (b) b.textContent = t;
  }
  if (R.end) {
    if (Date.now() >= R.end) {
      R.end = null;
      R.left = 0;
      beep();
      paintRest();
    } else {
      const t = $("#rtime");
      if (t) t.textContent = mmss(Math.ceil(restLeft() / 1000));
      updRestBar();
    }
  }
}
setInterval(tick, 250);

async function finishSession() {
  const a = S.active;
  if (!a) return;
  const tot = a.exs.reduce((t, x) => t + x.sets.length, 0),
    dn = a.exs.reduce((t, x) => t + x.sets.filter((s) => s.done).length, 0);
  if (!dn) {
    if (
      await ask(
        "Aucune série n’a été validée. Abandonner cette séance ?",
        "Abandonner",
        true,
      )
    ) {
      S.active = null;
      save();
      closeSession();
      render();
    }
    return;
  }
  if (
    dn < tot &&
    !(await ask(
      `${tot - dn} série${tot - dn > 1 ? "s" : ""} non validée${tot - dn > 1 ? "s" : ""} ser${tot - dn > 1 ? "ont" : "a"} ignorée${tot - dn > 1 ? "s" : ""}. Terminer la séance ?`,
      "Terminer",
    ))
  )
    return;
  const log = {
    id: uid(),
    workoutId: a.workoutId,
    name: a.name,
    start: a.startedAt,
    duration: Math.round((Date.now() - a.startedAt) / 1000),
    ex: a.exs
      .map((x) => ({
        exId: x.exId,
        name: exName(x.exId, x.name),
        sets: x.sets
          .filter((s) => s.done)
          .map((s) => ({
            kg: num(s.kg) || 0,
            reps: Math.round(num(s.reps)) || 0,
          })),
      }))
      .filter((e) => e.sets.length),
  };
  S.logs.push(log);
  S.active = null;
  save();
  R.end = null;
  R.left = null;
  closeSession();
  render();
  logModal(log, true);
}
function logModal(log, fresh) {
  const w = woById(log.workoutId);
  const prevSame = logsDesc().find(
    (l) => l.workoutId === log.workoutId && l.start < log.start,
  );
  const vol = logVolume(log),
    pv = prevSame ? logVolume(prevSame) : null,
    dv = pv ? ((vol - pv) / pv) * 100 : null;
  const el = modal(
    head(fresh ? "Séance terminée" : esc(log.name)) +
      `
  ${fresh ? `<p class="mut" style="margin-bottom:10px">${esc(log.name)}</p>` : `<p class="mut" style="margin-bottom:10px">${esc(fmtDL(log.start))}</p>`}
  <div class="tiles" style="grid-template-columns:repeat(3,1fr)"><div class="tile"><p class="mut sm">Durée</p><div class="v" style="font-size:21px">${durLbl(log.duration)}</div></div><div class="tile"><p class="mut sm">Séries</p><div class="v" style="font-size:21px">${logSets(log)}</div></div><div class="tile"><p class="mut sm">Volume</p><div class="v" style="font-size:21px">${nf(vol, 0)}<small> kg</small></div></div></div>
  ${dv != null ? `<p class="sm ${dv > 0 ? "up" : dv < 0 ? "dn" : "mut"}" style="margin-top:8px">${dv > 0 ? "+" : ""}${nf(dv, 0)} % de volume par rapport à la séance précédente</p>` : ""}
  <div style="margin-top:14px">${log.ex
    .map((e) => {
      const b = bestSet(e.sets),
        p = lastPerf(e.exId, log.start),
        pb = p ? bestSet(p.sets) : null,
        dk = pb ? b.kg - pb.kg : null;
      const bd = !pb
        ? ""
        : dk > 0
          ? `<span class="badge up">+${nf(dk, 2)} kg</span>`
          : dk < 0
            ? `<span class="badge dn">${nf(dk, 2)} kg</span>`
            : b.reps > pb.reps
              ? `<span class="badge up">+${b.reps - pb.reps} rep${b.reps - pb.reps > 1 ? "s" : ""}</span>`
              : "";
      return `<div class="card" style="padding:12px 14px"><div class="row"><b class="sp">${esc(exName(e.exId, e.name))}</b>${bd}</div><p class="sm mut" style="margin-top:4px">${e.sets.map((s) => esc(setTxt(s))).join(" · ")}</p></div>`;
    })
    .join("")}</div>
  <div class="btns">${fresh ? "" : `<button class="btn danger" data-a="del">Supprimer</button>`}<button class="btn primary" data-a="close">${fresh ? "Terminé" : "Fermer"}</button></div>`,
    {
      h: {
        async del() {
          if (
            await ask(
              "Supprimer cette séance de l’historique ?",
              "Supprimer",
              true,
            )
          ) {
            S.logs = S.logs.filter((l) => l.id !== log.id);
            save();
            closeModal(el);
            render();
          }
        },
      },
    },
  );
}
