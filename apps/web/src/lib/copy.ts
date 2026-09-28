import type { Lang } from "@sollu/shared";
export const copy = (lang: Lang, en: string, ta: string) =>
  lang === "ta" ? ta : en;
const labels: Record<string, string> = {
  "There’s no right spelling. Tamil, English, or a little of both.": "தமிழ், ஆங்கிலம் அல்லது இரண்டையும் கலந்து எழுதலாம்.",
  "A family member can record these exact phrases in Voice Studio.": "இந்த வாக்கியங்களுக்கான குரலைக் குடும்பத்தினர் பதிவு செய்யலாம்.",
  "Choose Speak, Topics, Camera or Type from Home.": "முகப்பில் பேசு, தலைப்புகள், கேமரா அல்லது எழுது என்பதைத் தேர்ந்தெடு.",
  "Choose an exact sentence first.": "முதலில் ஒரு வாக்கியத்தைத் தேர்ந்தெடுங்கள்.",
  "After you choose and speak a sentence, you can find it here.": "நீங்கள் தேர்ந்தெடுத்துப் பேசிய வாக்கியங்கள் இங்கே இருக்கும்.",
  "Getting your voice ready…": "குரல் தயாராகிறது…", "Speaking…": "பேசுகிறது…", "Said, in your words.": "நீங்கள் தேர்ந்தெடுத்தது பேசப்பட்டது.",
  "Stopped.": "நிறுத்தப்பட்டது.", "Waiting for playback": "பேசக் காத்திருக்கிறது", "Device voice": "சாதனக் குரல்", "Your recorded voice": "உங்கள் பதிவுசெய்த குரல்", "Consented family recording": "ஒப்புதலுடன் குடும்பத்தினர் பதிவுசெய்த குரல்", "Help alert tone": "உதவி எச்சரிக்கை ஒலி", "Help alert sounded.": "உதவி ஒலி எழுப்பப்பட்டது.",
  "Ready now. Tap the sentence again to speak.": "தயார். பேச வாக்கியத்தை மீண்டும் தொடுங்கள்.",
  "A voice for this language isn’t installed. Show this sentence to the person.": "இந்த மொழிக்கான குரல் இல்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
  "Couldn’t play audio. Show this sentence to the person.": "ஒலி வரவில்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
  "Could not load your voice. Show this sentence to the person.": "குரல் கிடைக்கவில்லை. வாக்கியத்தை மற்றவருக்குக் காட்டுங்கள்.",
  "என்ன சொல்லணும்? Take your time. We’re listening.":
    "நிதானமாகத் தேர்ந்தெடுங்கள்.",
  "Is this what you mean?": "இதைத்தான் சொல்ல விரும்புகிறீர்களா?",
  "Tap your sentence to say it. Listen lets you hear a preview.":
    "வாக்கியத்தைத் தொட்டால் பேசும். ‘கேள்’ மூலம் முதலில் கேட்டுப் பார்க்கலாம்.",
  "Let’s get you some help.": "உதவிக்கு அழைப்போம்.",
  "Your chosen words.": "நீங்கள் தேர்ந்தெடுத்த வார்த்தைகள்.",
  "Familiar words, ready whenever you need them.":
    "உங்களுக்குத் தேவையான வாக்கியங்கள்.",
  "Their language and the way you speak to them come along.":
    "நீங்கள் பேசும் நபரைத் தேர்ந்தெடுங்கள்.",
  "The things you chose to say, kept on this device.":
    "நீங்கள் பேசியவை இந்தச் சாதனத்தில் உள்ளன.",
  "What did they ask?": "அவர்கள் என்ன கேட்டார்கள்?",
  "I’m listening.": "கேட்டுக்கொண்டிருக்கிறேன்.",
  "Let’s hear your words.": "உங்கள் வார்த்தைகளைச் சொல்லுங்கள்.",
  "Speak their question. It stays in context for five minutes.":
    "அவர்களின் கேள்வியைச் சொல்லுங்கள். ஐந்து நிமிடங்கள் இங்கே இருக்கும்.",
  "Take your time. A word, a pause, a little of both.":
    "நிதானமாகப் பேசுங்கள். இடையில் நிறுத்தலாம்.",
  "Picture board": "சொல் பலகை",
  "Build a sentence, one word at a time. Then tap that sentence to speak.":
    "சொற்களைத் தேர்ந்தெடுங்கள். பிறகு வாக்கியத்தைத் தொட்டுப் பேசுங்கள்.",
  "Point at a familiar object. We’ll help you find the words.":
    "பழக்கமான பொருளைக் காட்டுங்கள்.",
  "Start with a word": "ஒரு வார்த்தையில் தொடங்கு",
  "Your voice is ready when you are": "முதலில் வாக்கியத்தைத் தேர்ந்தெடுங்கள்",
  "Your words will appear here": "உங்கள் வார்த்தைகள் இங்கே தோன்றும்",
  "What would you like to talk about?": "எதைப் பற்றிப் பேச விரும்புகிறீர்கள்?",
  "Where does it hurt?": "எங்கே வலிக்கிறது?",
  "Which side?": "எந்தப் பக்கம்?",
  "Choose something close to what you mean.":
    "நீங்கள் சொல்ல நினைப்பதைத் தேர்ந்தெடுங்கள்.",
  "Choose the body part.": "உடல் பகுதியைத் தேர்ந்தெடுங்கள்.",
  "Choose your own left or right.":
    "உங்கள் இடது அல்லது வலது பக்கத்தைத் தேர்ந்தெடுங்கள்.",
  "Pick a picture. We’ll help with the words.": "படத்தைத் தேர்ந்தெடுங்கள்.",
  "Start over": "மீண்டும் தொடங்கு",
  "Go back": "திரும்பிச் செல்",
  Back: "பின் செல்",
  "What would you like to say?": "என்ன சொல்ல விரும்புகிறீர்கள்?",
  "Let’s find your words.": "உங்கள் வார்த்தைகளைக் கண்டுபிடிப்போம்.",
  "Type anything that comes to mind, in either language.":
    "தமிழ் அல்லது ஆங்கிலத்தில் எழுதுங்கள்.",
  "Find my words": "வார்த்தைகளைக் காட்டு",
  Stop: "நிறுத்து",
  Listen: "கேள்",
  "Try again": "மீண்டும் முயற்சி",
  Continue: "தொடரவும்",
  Done: "முடிந்தது",
  "My phrases": "என் வாக்கியங்கள்",
  "Recent words": "சமீபத்தியவை",
  "My space": "முகப்பு",
  "My tools": "என் கருவிகள்",
  "My words": "என் சொற்கள்",
  Topics: "தலைப்புகள்",
  Speak: "பேசு",
  Type: "எழுது",
  Camera: "கேமரா",
  "They asked…": "அவர்கள் கேட்டது…",
  "A word is a good place to start": "ஒரு வார்த்தையில் தொடங்கலாம்",
  "Find what’s on your mind": "ஒரு தலைப்பைத் தேர்ந்தெடு",
  "Show us what you mean": "ஒரு பொருளைக் காட்டு",
  "A few letters are enough": "சில எழுத்துகள் போதும்",
  "Your words. At your pace.": "உங்கள் வார்த்தைகள். உங்கள் நேரத்தில்.",
  "Which one feels right?": "எதைச் சொல்ல விரும்புகிறீர்கள்?",
  "Who are you talking to?": "யாரிடம் பேசுகிறீர்கள்?",
  "What’s on your mind?": "எதைப் பற்றிப் பேச வேண்டும்?",
  "Take your time.": "நிதானமாகச் சொல்லுங்கள்.",
  "No words yet": "இன்னும் வார்த்தைகள் இல்லை",
  "Nothing here yet": "இன்னும் எதுவும் இல்லை",
  "Say it again": "மீண்டும் சொல்",
  "Say something else": "வேறு ஏதாவது சொல்",
  "Choose a topic": "தலைப்பைத் தேர்ந்தெடு",
  "Choose this": "இதைத் தேர்ந்தெடு",
  Next: "அடுத்து",
  Previous: "முந்தையது",
  Cancel: "ரத்து செய்",
  "Save phrase": "வாக்கியத்தைச் சேமி",
  "I need more time": "எனக்கு இன்னும் நேரம் வேண்டும்",
  Clear: "அழி",
  Undo: "முந்தையதை நீக்கு",
};
export function uiText(lang: Lang, value: string) {
  return lang === "ta" ? (labels[value] ?? value) : value;
}
