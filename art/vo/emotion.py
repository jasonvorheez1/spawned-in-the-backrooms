# Shelly Nov 14: "laughs, sighs, crying, expression changing screaming etc if applicable to that line or context" +
# "angry, frustration, happiness, joy, and then their personalities". One short audio tag per line, picked from
# its situation (the dialogue key) and its words; the cast tag (personality) rides beside it. Keep tags short:
# a long direction in the brackets made the voice maker laugh and repeat lines.
import re
KEY = {'hurt': 'pained', 'hit': 'pained grunt', 'death': 'weak, dying', 'spot': 'alarmed shout', 'flee': 'screaming, panicked',
       'hostile': 'angry', 'kill': 'cold', 'drawn': 'scared, trembling', 'clear': 'relieved sigh', 'calm': 'relieved sigh',
       'insult': 'offended', 'gift': 'touched, happy', 'dance': 'laughing, joyful', 'sneak': 'whispers', 'warm': 'warm', 'cold': 'cool'}
W = lambda *ws: re.compile(r'\b(' + '|'.join(ws) + r')\b', re.I)
RULES = [  # first match wins, strongest feelings first
  (W('ha ?ha\w*', 'hah', 'heh', 'lol', 'kidding', 'joking', 'just a joke', 'funny'), 'laughs'),
  (W('cry\w*', 'tears', 'sob\w*', 'my (son|daughter|wife|husband|baby|mother|father|mom|dad)', 'never came back', 'buried', 'funeral'), 'crying'),
  (W('help me', 'run', 'they.re coming', 'it.s here', 'behind you', 'get away', 'oh god', 'no no'), 'screaming, terrified'),
  (W('get out', 'back off', 'shut up', 'idiot', 'move it', 'how dare', 'you.ll pay', 'last warning', 'touch me'), 'angry shout'),
  (W('ugh', 'again', 'seriously', 'every time', 'for the last time', 'can.t believe', 'damn', 'hell', 'useless', 'typical'), 'frustrated'),
  (W('dead', 'died', 'gone', 'lost', 'miss (him|her|them)', 'alone', 'sorry'), 'sad, voice breaking'),
  (W('scared', 'afraid', 'please', 'don.t hurt', 'what was that', 'did you hear'), 'nervous, stuttering'),
  (W('thank you', 'thanks', 'bless you', 'you saved', 'grateful'), 'warm, grateful'),
  (W('wonderful', 'amazing', 'fantastic', 'finally', 'yes', 'hooray', 'woo\w*', 'love it', 'great news', 'we did it', 'party'), 'joyful, excited'),
  (W('tired', 'long day', 'shift', 'years', 'whatever', 'sigh', 'well', 'figures'), 'sighs'),
]
def emotion(key, line):
    s = str(line)
    for rx, tag in RULES:
        if rx.search(s):
            if tag == 'joyful, excited' and '!' not in s and not re.search(r'woo|hooray|we did it', s, re.I): tag = 'happy'
            return tag
    if key in KEY: return KEY[key]
    if s.count('!') >= 2 or (s.isupper() and len(s) > 4): return 'shouting'
    if s.startswith('...') or s.count('...') >= 2: return 'hesitant'
    return ''
