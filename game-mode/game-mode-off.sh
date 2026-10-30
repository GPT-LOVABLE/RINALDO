#!/system/bin/sh
# ============================================================================
#  MODO GAME — REVERTER (volta o aparelho ao normal)
#  Rode no mesmo lugar onde rodou game-mode-on.sh (Brevent / Shizuku / adb).
# ============================================================================

FF="com.dts.freefireth"
FFMAX="com.dts.freefiremax"
BS="com.netease.newspike"

TMP="${TMPDIR:-/data/local/tmp}"
BACKUP="$TMP/gamer-mode.bak"

ok()   { echo "[ OK  ] $*"; }
warn() { echo "[AVISO] $*"; }
skip() { echo "[  -- ] $*"; }

echo "=== MODO GAME — revertendo ==="

# ---- CPU / GPU / térmica (valores originais salvos pelo script) ----------
if [ -s "$BACKUP" ]; then
  while IFS='|' read -r path value; do
    [ -n "$path" ] || continue
    if [ -w "$path" ]; then
      echo "$value" > "$path" 2>/dev/null && ok "restaurado: $path"
    else
      warn "sem permissão para restaurar $path (rode com root)"
    fi
  done < "$BACKUP"
  rm -f "$BACKUP"
else
  skip "nenhum ajuste de CPU/GPU salvo para restaurar"
fi

# ---- animações ------------------------------------------------------------
settings put global window_animation_scale 1 >/dev/null 2>&1
settings put global transition_animation_scale 1 >/dev/null 2>&1
settings put global animator_duration_scale 1 >/dev/null 2>&1 && ok "animações normais" || warn "animações não restauradas"

# ---- memória / tela / energia --------------------------------------------
settings put global always_finish_activities 0 >/dev/null 2>&1 && ok "apps voltam a ficar em segundo plano"
settings delete system peak_refresh_rate >/dev/null 2>&1
settings delete system min_refresh_rate >/dev/null 2>&1
ok "taxa de atualização volta ao automático"
cmd power set-fixed-performance-mode-enabled false >/dev/null 2>&1 && ok "modo de desempenho fixo desligado"

# ---- GameManager ----------------------------------------------------------
game_reset() {
  _pkg="$1"; _name="$2"
  if cmd game set --mode standard --package "$_pkg" >/dev/null 2>&1 \
  || cmd game set --mode 1 --package "$_pkg" >/dev/null 2>&1 \
  || cmd game reset --package "$_pkg" >/dev/null 2>&1; then
    ok "$_name: modo padrão"
  else
    skip "$_name: nada a reverter"
  fi
}
game_reset "$FF"    "Free Fire"
game_reset "$FFMAX" "Free Fire MAX"
game_reset "$BS"    "Blood Strike"

echo "=== aparelho de volta ao padrão ==="
