#!/system/bin/sh
# ============================================================================
#  MODO GAME — Free Fire / Free Fire MAX / Blood Strike
#
#  ONDE RODAR (escolha um):
#   • Brevent  -> Exec Command (roda como shell, uid 2000)
#   • Shizuku  -> aShell / rish
#   • PC       -> adb shell sh /sdcard/game-mode-on.sh
#
#  O QUE FAZ: libera RAM, desliga animações, fixa a taxa de atualização,
#  aplica o GameManager do Android (modo performance por jogo) e, COM ROOT,
#  fixa CPU e GPU no máximo. Não mexe no jogo: é ajuste de sistema, não hack.
#
#  REVERTER: game-mode-off.sh
# ============================================================================

# ---- jogos (edite se usar outra versão/região) -----------------------------
FF="com.dts.freefireth"        # Free Fire (global)
FFMAX="com.dts.freefiremax"    # Free Fire MAX
BS="com.netease.newspike"      # Blood Strike

RATE=120        # Hz desejado (use 90 se a tela for de 90 Hz)
DISABLE_THERMAL=0   # 1 = desliga proteção térmica (SÓ com root, por sua conta e risco)

TMP="${TMPDIR:-/data/local/tmp}"
BACKUP="$TMP/gamer-mode.bak"

ok()   { echo "[ OK  ] $*"; }
warn() { echo "[AVISO] $*"; }
skip() { echo "[  -- ] $*"; }

if [ "$(id -u)" = "0" ]; then IS_ROOT=1; else IS_ROOT=0; fi

echo "=== MODO GAME — iniciando (uid=$(id -u)) ==="

# ---- 1. RAM livre ----------------------------------------------------------
echo "--- 1/6 RAM ---"
if am kill-all >/dev/null 2>&1; then ok "apps em segundo plano encerrados"; else skip "am kill-all indisponível"; fi
if pm trim-caches 50G >/dev/null 2>&1; then ok "cache dos apps limpo"; else skip "pm trim-caches indisponível"; fi
if settings put global always_finish_activities 1 >/dev/null 2>&1; then
  ok "atividades em segundo plano não ficam na memória"
else
  skip "always_finish_activities bloqueado"
fi

# ---- 2. animações do sistema ----------------------------------------------
echo "--- 2/6 animações ---"
if settings put global window_animation_scale 0 >/dev/null 2>&1 \
&& settings put global transition_animation_scale 0 >/dev/null 2>&1 \
&& settings put global animator_duration_scale 0 >/dev/null 2>&1; then
  ok "animações desligadas"
else
  warn "não foi possível desligar as animações"
fi

# ---- 3. energia / taxa de atualização -------------------------------------
echo "--- 3/6 energia e tela ---"
settings put global low_power 0 >/dev/null 2>&1 && ok "economia de bateria desligada" || skip "low_power bloqueado"
if cmd power set-fixed-performance-mode-enabled true >/dev/null 2>&1; then
  ok "modo de desempenho fixo do sistema ligado"
else
  skip "modo de desempenho fixo não suportado neste aparelho"
fi
settings put system peak_refresh_rate "$RATE" >/dev/null 2>&1 \
  && settings put system min_refresh_rate "$RATE" >/dev/null 2>&1 \
  && ok "taxa de atualização fixada em ${RATE}Hz" || skip "taxa de atualização não alterada"

# ---- 4. GameManager (modo performance por jogo) ---------------------------
echo "--- 4/6 modo performance dos jogos ---"
game_mode() {
  _pkg="$1"; _name="$2"
  if cmd game set --mode performance --package "$_pkg" >/dev/null 2>&1; then
    ok "$_name: modo performance"
  elif cmd game set --mode 3 --package "$_pkg" >/dev/null 2>&1; then
    ok "$_name: modo performance"
  else
    skip "$_name: GameManager não aceitou (precisa Android 12+)"
  fi
}
game_mode "$FF"    "Free Fire"
game_mode "$FFMAX" "Free Fire MAX"
game_mode "$BS"    "Blood Strike"

# ---- 5. CPU / GPU / memória do kernel (SÓ ROOT) ---------------------------
echo "--- 5/6 CPU e GPU ---"
set_sysfs() {
  [ -e "$1" ] || return 1
  [ -w "$1" ] || return 1
  grep -q "^$1|" "$BACKUP" 2>/dev/null || printf '%s|%s\n' "$1" "$(cat "$1" 2>/dev/null)" >> "$BACKUP"
  echo "$2" > "$1" 2>/dev/null
}

if [ "$IS_ROOT" = "1" ]; then
  touch "$BACKUP" 2>/dev/null || BACKUP="$TMP/gamer-mode.bak"

  for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    set_sysfs "$g" performance && ok "governor $(basename "$(dirname "$g")"): performance"
  done
  for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_min_freq; do
    _max="${f%scaling_min_freq}cpuinfo_max_freq"
    [ -r "$_max" ] || continue
    set_sysfs "$f" "$(cat "$_max" 2>/dev/null)"
  done
  ok "frequência mínima da CPU = máxima"

  set_sysfs /sys/class/kgsl/kgsl-3d0/devfreq/governor performance && ok "GPU: performance"
  set_sysfs /sys/class/kgsl/kgsl-3d0/min_pwrlevel 0
  set_sysfs /sys/class/kgsl/kgsl-3d0/max_pwrlevel 0
  for g in /sys/class/devfreq/*/governor; do
    case "$g" in *gpu*|*mali*|*kgsl*) set_sysfs "$g" performance ;; esac
  done

  sync
  echo 3 > /proc/sys/vm/drop_caches 2>/dev/null && ok "cache do kernel liberado"
else
  warn "sem root: governador de CPU/GPU e limpeza profunda de RAM foram ignorados."
  warn "para CPU/GPU no máximo rode este script com root (terminal com su)."
fi

# ---- 6. térmica (opcional, SÓ ROOT) --------------------------------------
echo "--- 6/6 térmica ---"
if [ "$IS_ROOT" = "1" ] && [ "$DISABLE_THERMAL" = "1" ]; then
  for z in /sys/class/thermal/thermal_zone*/mode; do set_sysfs "$z" disabled; done
  warn "proteção térmica desligada: risco real de superaquecimento"
else
  skip "proteção térmica mantida (DISABLE_THERMAL=0)"
fi

echo "=== MODO GAME aplicado. Reverter com game-mode-off.sh ==="
