"""Youth Work in Digital Era: static site build (English + Polish).

  python build.py

Sources (English is the source language)
  src/topics.json                 lesson data; Polish fields under "pl" for every lesson and group
  src/pages/{home,about}.html     English page content     src/pl/pages/...   Polish page content
  src/topics/<slug>.html          English lesson content   src/pl/topics/...  Polish lesson content
  STRINGS (below)                 layout text (header, footer, labels) in both languages

Output
  index.html, about/index.html, topics/<slug>/index.html          (English, site root)
  pl/index.html, pl/about/index.html, pl/topics/<slug>/index.html (Polish)

Tokens in content files: {{P}} = path to the site root (assets), {{L}} = path to the root of the
current language (page links), {{V}} = cache-busting version, {{ICON:name}} = an inline icon.

The build FAILS if:
  * a Polish content file, lesson field or layout string is missing,
  * a page has an unfilled {{TOKEN}} or links to a local file that doesn't exist,
  * a Polish page still contains obvious English text (mark intentional English, e.g. video titles,
    with translate="no").
"""
import html, json, pathlib, re, sys, time
sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
V = str(int(time.time()))
DATA = json.loads((SRC / "topics.json").read_text(encoding="utf-8"))
TOPICS, GROUPS = DATA["topics"], DATA["groups"]
BY_N = {t["n"]: t for t in TOPICS}
SITE = "Youth Work in Digital Era"
LANGS = ["en", "pl"]

# ---------------------------------------------------------------- layout strings
STRINGS = {
 "en": {
  "skip": "Skip to content", "home": "Home", "lessons": "Lessons", "about": "About the project",
  "brand_aria": f"{SITE}, home", "menu": "Menu", "close": "Close", "nav_main": "Main", "nav_mobile": "Mobile",
  "nav_footer": "Footer", "lang_label": "Language", "lang_switch": "Polski",
  "eu_alt": "Co-funded by the European Union",
  "eu_disclaimer": ("Funded by the European Union. Views and opinions expressed are however those of the author(s) only "
      "and do not necessarily reflect those of the European Union or the granting authority. Neither the European Union "
      "nor the granting authority can be held responsible for them."),
  "copyright": f"© 2026 {SITE} · Erasmus+ Training Course · Poronin, Poland",
  "lesson_n": "Lesson {n}", "lesson_of": "Lesson {n} of 12", "all_lessons": "All lessons",
  "prev": "Previous lesson", "next": "Next lesson", "on_page": "On this page", "more": "More lessons",
  "all12": "All 12 lessons", "poster_hint": "Lesson poster · tap to enlarge", "pill": "Play: 2 lies, 1 fact",
  "soon": "Poster coming soon",
  "home_title": f"{SITE}: digital skills and online safety for youth work",
  "home_desc": "Twelve practical lessons on scams, passwords, privacy and online emergencies, from the Erasmus+ training course Youth Work in Digital Era (Poronin, Poland, 11–17 October 2026).",
  "about_title": f"About the project · {SITE}",
  "about_desc": "Youth Work in Digital Era is an Erasmus+ training course for youth workers and educators on digital tools, social media, cybersecurity and preventing cyberbullying.",
  "topic_desc": "{title}: {blurb} A lesson for youth workers, educators and young people.",
 },
 "pl": {
  "skip": "Przejdź do treści", "home": "Start", "lessons": "Lekcje", "about": "O projekcie",
  "brand_aria": f"{SITE}, strona główna", "menu": "Menu", "close": "Zamknij", "nav_main": "Główna nawigacja",
  "nav_mobile": "Nawigacja mobilna", "nav_footer": "Stopka", "lang_label": "Język", "lang_switch": "English",
  "eu_alt": "Współfinansowane przez Unię Europejską",
  "eu_disclaimer": ("Sfinansowane przez Unię Europejską. Wyrażone poglądy i opinie są jedynie opiniami autora lub autorów "
      "i niekoniecznie odzwierciedlają poglądy i opinie Unii Europejskiej lub organu przyznającego. Unia Europejska "
      "ani organ przyznający nie ponoszą za nie odpowiedzialności."),
  "copyright": f"© 2026 {SITE} · Szkolenie Erasmus+ · Poronin, Polska",
  "lesson_n": "Lekcja {n}", "lesson_of": "Lekcja {n} z 12", "all_lessons": "Wszystkie lekcje",
  "prev": "Poprzednia lekcja", "next": "Następna lekcja", "on_page": "Na tej stronie", "more": "Więcej lekcji",
  "all12": "Wszystkie 12 lekcji", "poster_hint": "Plakat lekcji · dotknij, aby powiększyć", "pill": "Zagraj: 2 kłamstwa, 1 fakt",
  "soon": "Plakat wkrótce",
  "home_title": f"{SITE}: kompetencje cyfrowe i bezpieczeństwo w sieci w pracy z młodzieżą",
  "home_desc": "Dwanaście praktycznych lekcji o oszustwach, hasłach, prywatności i sytuacjach awaryjnych w sieci, przygotowanych podczas szkolenia Erasmus+ Youth Work in Digital Era (Poronin, 11–17 października 2026).",
  "about_title": f"O projekcie · {SITE}",
  "about_desc": "Youth Work in Digital Era to szkolenie Erasmus+ dla osób pracujących z młodzieżą i edukatorów: narzędzia cyfrowe, media społecznościowe, cyberbezpieczeństwo i przeciwdziałanie cyberprzemocy.",
  "topic_desc": "{title}. {blurb} Lekcja dla osób pracujących z młodzieżą, edukatorów i młodych ludzi.",
 },
}

# ---------------------------------------------------------------- icons
ICONS = {
 "msg":   '<path d="M4 5h16v11H9l-5 4z"/><path d="M12 8v4M12 14.6v.01"/>',
 "tag":   '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
 "job":   '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
 "face":  '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 17c1-2.4 3-3.4 5-3.4s4 1 5 3.4"/>',
 "wave":  '<path d="M3 12h1M7 9v6M11 5v14M15 8v8M19 10v4M21 12h0"/>',
 "key":   '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
 "shield":'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 "lock":  '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8M12 15v2"/>',
 "search":'<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.2-4.2"/><circle cx="11" cy="9.4" r="2"/><path d="M7.6 14.4c.8-1.4 2-2 3.4-2s2.6.6 3.4 2"/>',
 "pin":   '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 "toggle":'<rect x="3" y="4.5" width="18" height="6.5" rx="3.25"/><circle cx="17" cy="7.75" r="1.7"/><rect x="3" y="13" width="18" height="6.5" rx="3.25"/><circle cx="7" cy="16.25" r="1.7"/>',
 "buoy":  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
 "grid":  '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
 "info":  '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
 "heart": '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
 "chat":  '<path d="M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-2-2z"/><path d="M17 9h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2v3l-4-3h-3a2 2 0 0 1-1.7-1"/>',
 "hand":  '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 15.4a1.5 1.5 0 0 1 2.5-1.6L8 16"/>',
 "flag":  '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 "check": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 "book":  '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
 "users": '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.7c2.5.2 4 1.9 4.5 4.8"/>',
 "mountain":'<path d="M3 20l6.5-11 4 6.5 2.5-4 5 8.5z"/><path d="M8 11.5l1.5 1.5 1.5-1.5"/>',
 "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
}
def icon(name, cls="ic"):
    return (f'<svg class="{cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[name]}</svg>')

# ---------------------------------------------------------------- helpers
ERRORS = []

def img_size(rel):
    with Image.open(ROOT / rel) as im:
        return im.size

def tx(obj, key, lang):
    """A translatable field of a lesson or group: English at the top level, Polish under obj["pl"]."""
    if lang == "en":
        return obj.get(key, "")
    val = obj.get("pl", {}).get(key)
    if val is None and obj.get(key):
        ERRORS.append(f'topics.json: missing Polish "{key}" for {obj.get("slug") or obj.get("id")}')
        return obj[key]
    return val or ""

def S(lang, key, **kw):
    return STRINGS[lang][key].format(**kw) if kw else STRINGS[lang][key]

def group_of(t): return next(g for g in GROUPS if g["id"] == t["group"])

class Ctx:
    """Paths for one page: p = to the site root (assets), l = to the root of this language (page links)."""
    def __init__(self, lang, rel):
        self.lang, self.rel = lang, rel
        depth = rel.count("/")
        self.out = rel if lang == "en" else f"pl/{rel}"
        self.p = "../" * (depth + (0 if lang == "en" else 1))
        self.l = "../" * depth
    def topic(self, t): return f"{self.l}topics/{t['slug']}/index.html"
    def other(self):
        """Same page in the other language, relative to this page."""
        return f"{self.p}pl/{self.rel}" if self.lang == "en" else f"{self.p}{self.rel}"

# ---------------------------------------------------------------- layout parts
# runs before paint: no-js -> js, skip preloader after first page, start incoming page transition
HEAD_JS = "<script>(function(d){d.classList.replace('no-js','js');try{if(sessionStorage.getItem('yw-seen'))d.classList.add('seen');var c=sessionStorage.getItem('yw-pt');if(c&&!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('pt-in');d.style.setProperty('--pt',c);}sessionStorage.removeItem('yw-pt');}catch(e){}})(document.documentElement)</script>"

def head(c, title, desc):
    p = c.p
    en_href = f"{p}{c.rel}"; pl_href = f"{p}pl/{c.rel}"
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#05080a">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{p}assets/brand/logo.png"><meta property="og:locale" content="{'pl_PL' if c.lang == 'pl' else 'en_GB'}">
<link rel="alternate" hreflang="en" href="{en_href}"><link rel="alternate" hreflang="pl" href="{pl_href}"><link rel="alternate" hreflang="x-default" href="{en_href}">
<link rel="icon" type="image/png" href="{p}assets/brand/favicon.png">
{HEAD_JS}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700;800&display=swap">
<link rel="stylesheet" href="{p}assets/css/site.css?v={V}">'''

def lang_switch(c):
    def item(code):
        if code == c.lang:
            return f'<span class="lang-cur" aria-current="true">{code.upper()}</span>'
        return f'<a href="{c.other()}" hreflang="{code}" lang="{code}" aria-label="{S(code, "lang_switch")}">{code.upper()}</a>'
    return (f'<div class="lang-sw" role="group" aria-label="{S(c.lang, "lang_label")}">'
            f'{icon("globe")}{item("en")}<i aria-hidden="true">|</i>{item("pl")}</div>')

def header(c, current):
    lang = c.lang
    def a(href, label, key):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    nav = (a(f"{c.l}index.html", S(lang, "home"), "home") + a(f"{c.l}index.html#topics", S(lang, "lessons"), "topics")
           + a(f"{c.l}about/index.html", S(lang, "about"), "about"))
    return f'''<a class="skip" href="#main">{S(lang, "skip")}</a>
<header class="hdr"><div class="wrap">
<a class="brand" href="{c.l}index.html" aria-label="{S(lang, "brand_aria")}"><img src="{c.p}assets/brand/emblem.webp" width="44" height="31" alt=""><b>Youth Work<small>in Digital Era</small></b></a>
<nav class="nav" aria-label="{S(lang, "nav_main")}">{nav}</nav>
{lang_switch(c)}
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="mnav" data-open="{S(lang, "menu")}" data-close="{S(lang, "close")}">{S(lang, "menu")}</button>
</div></header>
<nav class="mnav" id="mnav" aria-label="{S(lang, "nav_mobile")}">{nav}</nav>'''

def footer(c):
    lang = c.lang
    cols = ""
    for g in GROUPS:
        links = "".join(f'<li><a href="{c.topic(t)}">{tx(t, "title", lang)}</a></li>' for t in TOPICS if t["group"] == g["id"])
        cols += f'<div><h2>{tx(g, "name", lang)}</h2><ul>{links}</ul></div>'
    eu_img = "eu-cofunded-colour-on-dark-pl" if lang == "pl" and (ROOT / "assets/eu/eu-cofunded-colour-on-dark-pl.webp").exists() else "eu-cofunded-colour-on-dark"
    return f'''<footer class="ftr"><div class="wrap">
<div class="ftr-map">{cols}</div>
<div class="eu"><img src="{c.p}assets/eu/{eu_img}.webp" width="300" height="67" alt="{S(lang, "eu_alt")}" loading="lazy">
<p>{S(lang, "eu_disclaimer")}</p></div>
<div class="meta"><span>{S(lang, "copyright")}</span>
<nav aria-label="{S(lang, "nav_footer")}"><a href="{c.l}index.html">{S(lang, "home")}</a><a href="{c.l}index.html#topics">{S(lang, "lessons")}</a><a href="{c.l}about/index.html">{S(lang, "about")}</a></nav></div>
</div></footer>'''

def scripts(c):
    return f'''<div class="pt" aria-hidden="true"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>
<script src="https://unpkg.com/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="{c.p}assets/js/site.js?v={V}" defer></script>'''

def page(c, title, desc, current, body, body_class=""):
    return f'''<!doctype html>
<html lang="{c.lang}" class="no-js">
<head>
{head(c, title, desc)}
</head>
<body class="{body_class}">
<div class="pre" aria-hidden="true"><img src="{c.p}assets/brand/emblem.webp" alt=""><i></i></div>
{header(c, current)}
<main id="main">
{body}
</main>
{footer(c)}
{scripts(c)}
</body>
</html>
'''

# ---------------------------------------------------------------- home fragments
def home_ring(c):
    """12 lesson icons placed on a 3D ring around the hero headline."""
    return "".join(
        f'<a class="ring-ic" href="{c.topic(t)}" style="--c:{t["color"]};--i:{i}" aria-label="{html.escape(tx(t, "title", c.lang))}" tabindex="-1">'
        f'<span class="app-ic">{icon(t["icon"])}</span></a>' for i, t in enumerate(TOPICS))

def home_wall(c):
    """All 12 lesson posters for the scroll-driven poster wall (posters are supplied by the teams)."""
    out = []
    for t in TOPICS:
        title = tx(t, "title", c.lang)
        if t.get("poster"):
            base = t["poster"] + "-sm"
            w, h = img_size(base + ".jpg")
            cls = " pcard--contain" if w > h else ""   # landscape posters are shown whole
            inner = (f'<picture><source srcset="{c.p}{base}.webp" type="image/webp"><img src="{c.p}{base}.jpg" '
                     f'alt="{html.escape(tx(t, "poster_alt", c.lang))}" width="{w}" height="{h}" loading="lazy"></picture>')
        else:
            cls = " pcard--soon"
            inner = (f'<span class="psoon"><span class="psoon-ic">{icon(t["icon"])}</span>'
                     f'<b>{title}</b><span class="ph-tag">{S(c.lang, "soon")}</span></span>')
        out.append(f'<a class="pitem" href="{c.topic(t)}" style="--c:{t["color"]}">'
                   f'<span class="pcard{cls}">{inner}<span class="pcard-n">{S(c.lang, "lesson_n", n=t["n"])}</span></span>'
                   f'<span class="ptitle">{title}</span></a>')
    return "\n".join(out)

def home_topics(c):
    out = []
    for t in TOPICS:
        g = group_of(t)
        out.append(f'<a class="tcard" href="{c.topic(t)}" style="--c:{t["color"]}" data-reveal data-tilt="6">'
                   f'<span class="tcard-n">{t["n"]:02d}</span><span class="app-ic">{icon(t["icon"])}</span>'
                   f'<small>{tx(g, "name", c.lang)}</small><b>{tx(t, "title", c.lang)}</b><span class="tcard-p">{tx(t, "blurb", c.lang)}</span>'
                   f'<span class="tcard-go" aria-hidden="true">→</span></a>')
    return "\n".join(out)

# ---------------------------------------------------------------- content files
def content_file(lang, *parts):
    f = (SRC / pathlib.Path(*parts)) if lang == "en" else (SRC / "pl" / pathlib.Path(*parts))
    if not f.exists():
        ERRORS.append(f"missing {'Polish ' if lang == 'pl' else ''}content file: {f.relative_to(ROOT)}")
        return ""
    return f.read_text(encoding="utf-8")

def fill(src, c, tokens=None):
    src = src.replace("{{P}}", c.p).replace("{{L}}", c.l).replace("{{V}}", V)
    for k, v in (tokens or {}).items():
        src = src.replace("{{" + k + "}}", v)
    for name in ICONS:
        src = src.replace("{{ICON:" + name + "}}", icon(name))
    return src

# ---------------------------------------------------------------- lesson pages
def topic_page(t, lang):
    c = Ctx(lang, f"topics/{t['slug']}/index.html")
    g = group_of(t)
    title, blurb = tx(t, "title", lang), tx(t, "blurb", lang)
    content = fill(content_file(lang, "topics", f"{t['slug']}.html"), c)
    prev_t, next_t = BY_N.get(t["n"] - 1) or BY_N[12], BY_N.get(t["n"] + 1) or BY_N[1]
    chips = "".join(f'<a href="#{sid}">{nav or sid}</a>'
                    for sid, nav in re.findall(r'<section class="tsec[^"]*" id="([^"]+)"(?: data-nav="([^"]+)")?', content))
    def nav_app(x, label):
        return (f'<a class="tn-app" href="{c.topic(x)}" style="--c:{x["color"]}" data-app><span class="app-ic">{icon(x["icon"])}</span>'
                f'<span><small>{label}</small><b>{tx(x, "title", lang)}</b></span></a>')
    cur = ' aria-current="page"'
    others = "".join(f'<a class="app app--sm" href="{c.topic(x)}" style="--c:{x["color"]}" aria-label="{html.escape(tx(x, "title", lang))}"{cur if x is t else ""} data-app>'
                     f'<span class="app-ic">{icon(x["icon"])}</span><span class="app-l" aria-hidden="true">{tx(x, "short", lang)}</span></a>' for x in TOPICS)
    poster_html = ""
    if t.get("poster"):
        w, h = img_size(t["poster"] + ".jpg")
        poster_html = (f'<a class="thero-poster" href="{c.p}{t["poster"]}.jpg" data-tilt="8" data-lightbox>'
                       f'<picture><source srcset="{c.p}{t["poster"]}.webp" type="image/webp">'
                       f'<img src="{c.p}{t["poster"]}.jpg" alt="{html.escape(tx(t, "poster_alt", lang))}" width="{w}" height="{h}"></picture>'
                       f'<span>{S(lang, "poster_hint")}</span></a>')
    m = re.search(r'data-pill="([^"]+)"', content)
    pill_html = (f'<a class="game-pill" href="#game">{icon("check")}<span>{m[1] if m else S(lang, "pill")}</span></a>'
                 if 'id="game"' in content else "")
    subtitle = tx(t, "subtitle", lang)
    body = f'''<section class="thero{' has-poster' if t.get('poster') else ''}" data-hero style="--c:{t['color']}">
  <div class="thero-bg" aria-hidden="true">{icon(t["icon"], "thero-glyph")}</div>
  <div class="wrap thero-in">
    <a class="back" href="{c.l}index.html#topics"><span aria-hidden="true">‹</span> {S(lang, "all_lessons")}</a>
    <span class="thero-ic" aria-hidden="true">{icon(t["icon"])}</span>
    <div class="thero-text">
      <p class="eyebrow">{tx(g, "name", lang)} · {S(lang, "lesson_of", n=t["n"])}</p>
      <h1 class="h-xl" data-split data-split-now><span class="line">{title}</span></h1>
      {f'<p class="thero-sub">{subtitle}</p>' if subtitle else ""}
      <p class="lede">{tx(t, "slogan", lang) or blurb}</p>
    </div>
    {poster_html}
  </div>
</section>
<nav class="tnav" aria-label="{S(lang, "on_page")}"><div class="wrap"><div class="tnav-in">{chips}</div></div></nav>
<div class="wrap tbody" style="--c:{t['color']}">
{content}
</div>
{pill_html}
<section class="tmore" aria-label="{S(lang, "more")}">
  <div class="wrap">
    <div class="tn">{nav_app(prev_t, S(lang, "prev"))}{nav_app(next_t, S(lang, "next"))}</div>
    <div class="dockgrid" aria-label="{S(lang, "all12")}">{others}</div>
  </div>
</section>'''
    return c, page(c, f"{title} · {SITE}", S(lang, "topic_desc", title=title, blurb=blurb), "topics", body, "is-topic")

# ---------------------------------------------------------------- checks
# frequent English words that should never appear in Polish visible text (outside translate="no")
EN_WORDS = re.compile(r"\b(the|and|you|your|with|this|that|what|when|lesson|lessons|password|scam|scams|click|please|never|always|if|is|are|of|for)\b", re.I)

def leftover_english(s):
    """Visible text of a Polish page minus <script>, <style>, comments and elements marked translate="no"."""
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<!--.*?-->", " ", s, flags=re.S)
    # drop elements marked translate="no" (supports nesting of the same tag name)
    for _ in range(3):
        s = re.sub(r'<(\w+)\b[^>]*\btranslate="no"[^>]*>.*?</\1>', " ", s, flags=re.S)
    texts = re.findall(r">([^<>]+)<", s)
    attrs = re.findall(r'\b(?:alt|aria-label|title|content)="([^"]*)"', s)
    hits = []
    for chunk in texts + attrs:
        chunk = html.unescape(chunk).strip()
        chunk = chunk.replace(SITE, "").replace("Youth Work", "").replace("in Digital Era", "")
        if EN_WORDS.search(chunk):
            hits.append(chunk[:80])
    return hits

def check_strings():
    a, b = set(STRINGS["en"]), set(STRINGS["pl"])
    for k in a ^ b:
        ERRORS.append(f"STRINGS: key '{k}' missing in {'pl' if k in a else 'en'}")
    for t in TOPICS:
        for key in ("title", "short", "blurb", "subtitle", "slogan", "poster_alt"):
            if t.get(key) and not t.get("pl", {}).get(key):
                ERRORS.append(f'topics.json: lesson {t["n"]} is missing Polish "{key}"')
    for g in GROUPS:
        for key in ("name", "line"):
            if not g.get("pl", {}).get(key):
                ERRORS.append(f'topics.json: group {g["id"]} is missing Polish "{key}"')

# ---------------------------------------------------------------- build
def build():
    check_strings()
    out = {}
    for lang in LANGS:
        c = Ctx(lang, "index.html")
        out[c.out] = page(c, S(lang, "home_title"), S(lang, "home_desc"), "home",
            fill(content_file(lang, "pages", "home.html"), c, {"RING": home_ring(c), "WALL": home_wall(c), "TOPICS": home_topics(c)}), "is-home")
        c = Ctx(lang, "about/index.html")
        out[c.out] = page(c, S(lang, "about_title"), S(lang, "about_desc"), "about", fill(content_file(lang, "pages", "about.html"), c), "is-about")
        for t in TOPICS:
            c, s = topic_page(t, lang)
            out[c.out] = s

    built = {(ROOT / k).resolve() for k in out}
    for rel, s in out.items():
        if "{{" in s:
            i = s.index("{{"); ERRORS.append(f"{rel}: unfilled token {s[i:i+30]!r}")
        base = (ROOT / rel).parent
        for ref in re.findall(r'(?:src|href|srcset)="([^"]+)"', s):
            if "://" in ref or ref.startswith(("mailto:", "tel:", "#", "data:")):
                continue
            ref = re.split(r"[?#]", ref)[0].split(" ")[0]
            target = (base / ref).resolve()
            if ref and not target.exists() and target not in built:
                ERRORS.append(f"{rel}: broken link {ref}")
        if rel.startswith("pl/"):
            for hit in leftover_english(s):
                ERRORS.append(f"{rel}: untranslated text? {hit!r}")
    if ERRORS:
        print("BUILD FAILED")
        for e in sorted(set(ERRORS))[:200]:
            print("  " + e)
        print(f"  ({len(set(ERRORS))} problems)")
        sys.exit(1)
    for rel, s in out.items():
        f = ROOT / rel; f.parent.mkdir(parents=True, exist_ok=True); f.write_text(s, encoding="utf-8")
    print(f"built {len(out)} pages in {len(LANGS)} languages (v={V})")

if __name__ == "__main__":
    build()
