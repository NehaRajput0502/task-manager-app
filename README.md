# coditbyneha — Task Manager

A clean, responsive task manager built with vanilla **HTML, CSS, JavaScript, and Tailwind CSS**. Light/dark themes, due dates, tags, search, drag-to-reorder, insights, import/export, and keyboard shortcuts — all with no frameworks.

## Features

- **Add, edit, complete, delete** tasks with smooth animations
- **Priorities** (Low / Medium / High) shown as colored stripes
- **Due dates** with `Today`, `Tomorrow`, and red **overdue** highlighting
- **Tags** — type `#work #urgent` in a task and they become clickable tags
- **Search** by text or tag, plus filters: All / Active / Done / Overdue
- **Drag to reorder** tasks by hand
- **Insights** panel — completion ring, totals, overdue count, priority breakdown
- **Export / import** your tasks as a JSON backup
- **Keyboard shortcuts** for power users (press `?` to see them)
- **Light & dark mode** that remembers your choice
- Everything saves to `localStorage` and persists across refreshes

## Keyboard shortcuts

| Action | Key |
| --- | --- |
| Focus new task | `/` or `n` |
| Add task | `Enter` |
| Cycle filter | `f` |
| Toggle insights | `i` |
| Export tasks | `e` |
| Show help | `?` |
| Clear / close | `Esc` |

## Tech Stack

- **HTML5** — semantic structure
- **CSS3** — custom properties (CSS variables) for reliable theming
- **JavaScript** — vanilla, no frameworks (uses the HTML5 Drag & Drop, File, and Blob APIs)
- **Tailwind CSS** — layout and utility styling

## Project Structure

```
task-manager/
├── index.html       # markup + Tailwind layout (loads style.css & app.js)
├── style.css        # theme variables, components, animations
├── app.js           # all the logic
├── standalone.html  # everything in one file — opens with zero setup
└── README.md
```

## Running It

`index.html` loads `style.css` and `app.js` as separate files, so serve it through a
local server (opening it directly can leave the page unstyled because the browser
can't find the linked files):

- **VS Code:** install the **Live Server** extension, then right-click `index.html`
  → **Open with Live Server**
- **Python:** run `python -m http.server` in this folder, then open `http://localhost:8000`

> **No setup option:** open `standalone.html` instead — it has the CSS and JS built in.

## Deploy with GitHub Pages

1. Push these files to a GitHub repository
2. Go to **Settings → Pages**
3. Under **Source**, choose the `main` branch and the `/root` folder, then **Save**
4. Your live link appears within a minute

## License

Free to use and modify.
