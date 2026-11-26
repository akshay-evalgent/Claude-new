/* generated from 03-script/script.json: the film clock, counters and lines */
window.SCRIPT = {
 "clock": {
  "film_ends_s": 59.9,
  "your_clock": "film time minus 3.0 s, in tenths ('25.0 s'); it starts at 0.0 when the field first appears at 3.0 s, never resets and reads 56.9 s on the last frame. In the cold open (film 0.0-3.0 s) both counters show what they show at film 28.0-31.0 s.",
  "temperature_keys_film_s_to_celsius": [
   [
    3.0,
    37.0
   ],
   [
    6.5,
    37.3
   ],
   [
    9.5,
    39.0
   ],
   [
    10.2,
    41.0
   ],
   [
    13.0,
    42.5
   ],
   [
    13.5,
    100
   ],
   [
    16.6,
    112
   ],
   [
    17.3,
    525
   ],
   [
    17.8,
    540
   ],
   [
    20.3,
    650
   ],
   [
    20.9,
    690
   ],
   [
    23.8,
    800
   ],
   [
    24.8,
    1000
   ],
   [
    25.4,
    1210
   ],
   [
    26.2,
    1538
   ],
   [
    27.2,
    1900
   ],
   [
    28.0,
    5510
   ],
   [
    31.0,
    5660
   ],
   [
    31.6,
    5720
   ],
   [
    34.4,
    9500
   ],
   [
    35.0,
    28500
   ],
   [
    38.3,
    1000000.0
   ],
   [
    38.8,
    16000000.0
   ],
   [
    40.6,
    250000000.0
   ],
   [
    41.6,
    100000000000.0
   ],
   [
    42.3,
    4000000000000.0
   ],
   [
    45.1,
    4400000000000.0
   ],
   [
    47.8,
    1.4e+32
   ],
   [
    51.0,
    1.4e+32
   ],
   [
    51.6,
    37.0
   ],
   [
    59.9,
    37.0
   ]
  ],
  "temperature_between_keys": "straight line in the logarithm of the temperature. The figure is nearly flat while a stage's line is up and steep between stages, so no line names a number the counter has left behind. 51.0-51.6 s is the spin back down.",
  "figure_forms": [
   "one decimal, °C: 37.0 °C (to 13.5 s)",
   "whole degrees: 112 °C (from 100 °C, 13.5 s)",
   "thousands with a comma: 1,538 °C, 28,500 °C (from 1,000 °C, 24.8 s)",
   "words: 16 million °C, 100 billion °C, 4.0 trillion °C (from a million, 38.3 s)",
   "powers of ten, unit changes to kelvin: 10^13 K to 10^32 K (from 45.1 s)",
   "1.4 x 10^32 K with a question mark (47.8-51.0 s)",
   "back to 37.0 °C (51.6 s to the end)"
  ]
 },
 "counters": {
  "temperature_block": {
   "label": "YOUR TEMPERATURE",
   "figure": "see clock.figure_forms; changes every frame except on the plateaus at 37.0 and at the end",
   "comparison_row": [
    {
     "from_s": 3.0,
     "to_s": 13.6,
     "text": "HOTTER THAN THE SNOW"
    },
    {
     "from_s": 13.6,
     "to_s": 25.4,
     "text": "HOTTER THAN BOILING WATER"
    },
    {
     "from_s": 25.4,
     "to_s": 28.0,
     "text": "HOTTER THAN LAVA"
    },
    {
     "from_s": 28.0,
     "to_s": 35.0,
     "text": "HOTTER THAN THE SUN'S SURFACE"
    },
    {
     "from_s": 35.0,
     "to_s": 38.8,
     "text": "HOTTER THAN LIGHTNING"
    },
    {
     "from_s": 38.8,
     "to_s": 45.3,
     "text": "HOTTER THAN THE SUN'S CORE"
    },
    {
     "from_s": 45.3,
     "to_s": 47.8,
     "text": "HOTTER THAN ANY LAB HAS MEASURED"
    },
    {
     "from_s": 47.8,
     "to_s": 51.6,
     "text": "AS HOT AS PHYSICS CAN DESCRIBE"
    },
    {
     "from_s": 51.6,
     "to_s": 59.9,
     "text": "AS WARM AS EVERYONE YOU KNOW"
    }
   ],
   "next_row": [
    {
     "from_s": 3.0,
     "to_s": 10.2,
     "event": "HEAT STROKE",
     "at": "41 °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 10.2,
     "to_s": 13.5,
     "event": "WATER BOILS",
     "at": "100 °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 13.5,
     "to_s": 17.3,
     "event": "YOU START TO GLOW",
     "at": "about 525 °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 17.3,
     "to_s": 28.0,
     "event": "THE SUN'S SURFACE",
     "at": "about 5,500 °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 28.0,
     "to_s": 38.8,
     "event": "THE SUN'S CORE",
     "at": "about 15 million °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 38.8,
     "to_s": 42.3,
     "event": "MADE IN A LAB",
     "at": "about 4 trillion °C",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 42.3,
     "to_s": 47.8,
     "event": "THE EDGE OF PHYSICS",
     "at": "1.4 x 10^32 K",
     "countdown": "degrees still to go, falling to zero as the stage arrives"
    },
    {
     "from_s": 47.8,
     "to_s": 51.6,
     "event": "NOBODY KNOWS",
     "at": "?",
     "countdown": "none"
    },
    {
     "from_s": 51.6,
     "to_s": 59.9,
     "event": "STAY HERE",
     "at": "",
     "countdown": "none"
    }
   ]
  },
  "clock_block": {
   "label": "YOU HAVE BEEN HEATING UP FOR",
   "figure": "seconds and tenths, running at real time on every frame",
   "row": [
    {
     "from_s": 3.0,
     "to_s": 10.2,
     "text": "REAL NUMBERS. REAL BODY."
    },
    {
     "from_s": 10.2,
     "to_s": 51.6,
     "text": "REAL NUMBERS. PRETEND BODY."
    },
    {
     "from_s": 51.6,
     "to_s": 59.9,
     "text": "REAL NUMBERS. REAL BODY."
    }
   ]
  },
  "left_out": "The reference's rate row ('one second for you = ...') has no counterpart: the speed of the NEXT countdown shows the rate, and a vertical frame has room for fewer rows. Layout is the mood board's decision.",
  "on_every_frame": true
 },
 "beats": [
  {
   "id": "coldopen",
   "start_s": 0.0,
   "dur_s": 3.0,
   "lines": [
    {
     "at_s": 0.0,
     "for_s": 2.9,
     "text": "Twenty-five seconds ago, you stood in snow.",
     "rows": [
      "Twenty-five seconds ago,",
      "you stood in snow."
     ],
     "kind": "statement"
    }
   ]
  },
  {
   "id": "snow",
   "start_s": 3.0,
   "dur_s": 6.2,
   "lines": [
    {
     "at_s": 3.1,
     "for_s": 2.6,
     "text": "What If You Got Hotter and Couldn't Stop?",
     "rows": [
      "What If You Got Hotter",
      "and Couldn't Stop?"
     ],
     "kind": "title"
    },
    {
     "at_s": 5.9,
     "for_s": 2.6,
     "text": "A snowflake melts on your palm.",
     "rows": [
      "A snowflake melts",
      "on your palm."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "boil",
   "start_s": 9.2,
   "dur_s": 8.0,
   "lines": [
    {
     "at_s": 10.2,
     "for_s": 2.4,
     "text": "Forty-one. Heat stroke. It can kill.",
     "rows": [
      "Forty-one. Heat stroke.",
      "It can kill."
     ],
     "kind": "story"
    },
    {
     "at_s": 13.5,
     "for_s": 2.7,
     "text": "One hundred. The water in you boils.",
     "rows": [
      "One hundred.",
      "The water in you boils."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "glow",
   "start_s": 17.2,
   "dur_s": 10.4,
   "lines": [
    {
     "at_s": 17.8,
     "for_s": 2.0,
     "text": "That red light is you.",
     "rows": [
      "That red light is you."
     ],
     "kind": "story"
    },
    {
     "at_s": 20.9,
     "for_s": 2.7,
     "text": "Red is the coolest glow there is.",
     "rows": [
      "Red is the coolest",
      "glow there is."
     ],
     "kind": "story"
    },
    {
     "at_s": 24.2,
     "for_s": 2.4,
     "text": "Orange. Yellow. Iron melts.",
     "rows": [
      "Orange. Yellow. Iron melts."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "sun",
   "start_s": 27.6,
   "dur_s": 7.2,
   "lines": [
    {
     "at_s": 28.0,
     "for_s": 2.7,
     "text": "Twenty-five seconds. The surface of the Sun.",
     "rows": [
      "Twenty-five seconds.",
      "The surface of the Sun."
     ],
     "kind": "story"
    },
    {
     "at_s": 31.6,
     "for_s": 3.1,
     "text": "The metal tungsten boils here. Pretend you don't.",
     "rows": [
      "The metal tungsten boils here.",
      "Pretend you don't."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "invisible",
   "start_s": 34.8,
   "dur_s": 7.0,
   "lines": [
    {
     "at_s": 35.2,
     "for_s": 2.7,
     "text": "Blue-white. Most of your light is invisible.",
     "rows": [
      "Blue-white.",
      "Most of your light is invisible."
     ],
     "kind": "story"
    },
    {
     "at_s": 38.8,
     "for_s": 2.7,
     "text": "The Sun's core. Humans have gone hotter.",
     "rows": [
      "The Sun's core.",
      "Humans have gone hotter."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "soup",
   "start_s": 41.8,
   "dur_s": 6.0,
   "lines": [
    {
     "at_s": 42.3,
     "for_s": 2.8,
     "text": "Humans have made this. Protons melt.",
     "rows": [
      "Humans have made this.",
      "Protons melt."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "edge",
   "start_s": 47.8,
   "dur_s": 3.2,
   "lines": [
    {
     "at_s": 48.2,
     "for_s": 2.8,
     "text": "Here, physics runs out of answers.",
     "rows": [
      "Here, physics runs",
      "out of answers."
     ],
     "kind": "story"
    }
   ]
  },
  {
   "id": "flake",
   "start_s": 51.0,
   "dur_s": 8.9,
   "lines": [
    {
     "at_s": 52.2,
     "for_s": 2.2,
     "text": "Right now, you glow too.",
     "rows": [
      "Right now, you glow too."
     ],
     "kind": "story"
    },
    {
     "at_s": 54.7,
     "for_s": 2.7,
     "text": "In infrared. Your eyes cannot see it.",
     "rows": [
      "In infrared.",
      "Your eyes cannot see it."
     ],
     "kind": "story"
    },
    {
     "at_s": 58.0,
     "for_s": 1.9,
     "text": "Ask the snowflake.",
     "rows": [
      "Ask the snowflake."
     ],
     "kind": "story"
    }
   ]
  }
 ]
};
