# Scramble: a 20-second street fight at a Tokyo scramble crossing. Every shot is one painted take, no green screen.
# Evaluated inside Pipeline.
{
  # v1 sheets drew a neon street behind two views and one off-model Jin; the v1 location painted a shirtless fighter
  # into the crossing. The style bible had leaked into them. v2 prompts carry their own short style line.
  "char-akane-v1" => { steps: [Steps::RefBase] },
  "char-jin-v1" => { steps: [Steps::RefBase] },
  "loc-street-v1" => { steps: [Steps::RefBase] },
  "char-akane-v2" => { steps: [Steps::RefBase] },
  "char-jin-v2" => { steps: [Steps::RefBase] },
  "loc-street-v2" => { steps: [Steps::RefBase] },
  "scramble-s01" => {
    steps: [Steps::Dialogue, Steps::Music, Steps::Mix, Steps::Keyframes, Steps::Shots, Steps::Overlay],
    **scene(480), music_fade: 0.6, mix: { voice_lift_db: 6, music_db: -6, dialogue_db: 0, duck: true }
  }
}
