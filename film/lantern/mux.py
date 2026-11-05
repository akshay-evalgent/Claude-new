"""Attach the mix to the picture, normalised to -14 LUFS integrated, true peak -1 dBTP (YouTube's playback target).

  python3 mux.py master out/master_silent.mp4 out/master_mix.wav out/final/LANTERN_master_1080p.mp4
"""
import json
import os
import subprocess
import sys


def loudnorm_args(wav, I=-14.0, TP=-1.0, LRA=11.0):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af',
                        f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    txt = r.stderr
    js = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
    return (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
            f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")


def mux(video, wav, out):
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    af = loudnorm_args(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0',
                    '-c:v', 'copy', '-af', af + ',aresample=48000', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', out], check=True)
    print('->', out)


if __name__ == '__main__':
    mux(sys.argv[2], sys.argv[3], sys.argv[4])
