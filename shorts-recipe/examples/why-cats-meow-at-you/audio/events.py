# Sound events shared by the animation (mouths) and the mixer. Times are video seconds.
# (name, bsb id, src_start, src_end, t, gain_db, mouth)  mouth = which character's jaw follows it
EVENTS = [
    ('meow_hook',   '1898', 0.62, 1.45, 0.30, -6, 'hero'),
    ('mew_k1',      '0390', 0.03, 0.58, 3.70, -9, 'kit'),
    ('mew_k2',      '0390', 1.47, 1.93, 4.52, -9, 'kit'),
    ('mew_k3',      '0390', 2.42, 3.21, 5.22, -8, 'kit'),
    ('chirp_mom',   '1899', 0.00, 0.45, 7.40, -10, 'mom'),
    ('meow_us',     '1902', 2.85, 4.24, 12.45, -5, 'hero'),
    ('meow_shadow', '1896', 0.58, 1.80, 15.20, -6, 'hero'),
    ('cry_hidden',  '0098', 1.05, 1.74, 20.80, -20, None),
    ('chirp_door',  '1899', 0.00, 0.45, 26.47, -8, 'hero'),
    ('meow_sofa',   '1891', 0.02, 1.52, 27.72, -7, 'hero'),
]
