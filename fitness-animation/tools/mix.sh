#!/usr/bin/env bash
# Final mix: rendered video (with its SFX bed) + your voice-over + optional music.
# Music ducks under the voice automatically; output is loudness-normalised for YouTube (about -14 LUFS).
# The video sets the length: a VO longer than the video is cut, so re-time scenes to the VO first.
#
#   tools/mix.sh renders/grip-strength.mp4 vo.wav                 -> renders/grip-strength-final.mp4
#   tools/mix.sh renders/grip-strength.mp4 vo.wav music.mp3       (music bed, ducked under VO)
#
# Levels: SFX_GAIN (default 0.55) and MUSIC_GAIN (default 0.22) can be set in the environment.
set -euo pipefail
video="$1"; vo="$2"; music="${3:-}"
out="${OUT:-${video%.mp4}-final.mp4}"
sfx="${SFX_GAIN:-0.55}"; mus="${MUSIC_GAIN:-0.22}"
if [[ -n "$music" ]]; then
  ffmpeg -y -loglevel error -i "$video" -i "$vo" -stream_loop -1 -i "$music" -filter_complex "
    [1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asplit=2[vo][key];
    [2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${mus}[m];
    [m][key]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=350[duck];
    [0:a]volume=${sfx}[fx];
    [fx][vo][duck]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest "$out"
else
  ffmpeg -y -loglevel error -i "$video" -i "$vo" -filter_complex "
    [1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[vo];
    [0:a]volume=${sfx}[fx];
    [fx][vo]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest "$out"
fi
echo "$out"
