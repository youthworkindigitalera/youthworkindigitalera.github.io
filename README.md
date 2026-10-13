# Youth Work in Digital Era: website

A static site with no framework, in English (site root) and Polish (`/pl/`). Ready for GitHub Pages: publish from the `main` branch, root folder. All paths are relative, so it also works under `username.github.io/repo-name/`.

## Structure
| What | Where |
|---|---|
| Home page | `index.html` · `pl/index.html` (from `src/pages/home.html` · `src/pl/pages/home.html`) |
| About the project | `about/index.html` · `pl/about/index.html` (from `src/pages/about.html` · `src/pl/pages/about.html`) |
| 12 lessons | `topics/<slug>/index.html` · `pl/topics/<slug>/index.html` (from `src/topics/<slug>.html` · `src/pl/topics/<slug>.html`) |
| Lesson names, colours, groups (EN + `pl`) | `src/topics.json` |
| Header, footer, language switch, EU logo + disclaimer, UI strings | `build.py` |
| Styles / scripts | `assets/css/site.css`, `assets/js/*.js` |

## Editing content
1. Edit the English file **and** its Polish twin (for example `src/topics/passwords.html` and `src/pl/topics/passwords.html`).
2. Run the build:

```
python build.py
```

3. Commit the generated `index.html`, `about/`, `topics/` and `pl/` together with the sources.

The build adds `?v=timestamp` cache-busting to the CSS and JS. It **fails** if a page links to a missing file, if a Polish page or field is missing, or if English text is left on a Polish page (mark intentional English with `translate="no"`).

## Preview locally
```
python -m http.server 8765
```
Then open http://localhost:8765
