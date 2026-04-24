# SRM Full Stack Engineering Challenge

Full-stack Node.js application for the BFHL hierarchy analysis challenge. The backend exposes `POST /bfhl`, and the frontend provides a simple single-page interface to submit JSON and inspect the API response.

## Project Structure

```text
backend/
  package.json
  server.js

frontend/
  index.html
  script.js
  style.css

render.yaml
test.http
```

## API Endpoint

### `POST /bfhl`

Accepts a JSON payload with a `data` array of directed edges.

Example request:

```json
{
  "data": ["A->B", "A->C", "B->D", "hello", "A->B"]
}
```

Example response:

```json
{
  "user_id": "naveenp_ddmmyyyy",
  "email_id": "your_email@srmist.edu.in",
  "college_roll_number": "your_roll_number",
  "hierarchies": [
    {
      "root": "A",
      "roots": ["A"],
      "depth": 2,
      "node_count": 4,
      "edge_count": 3,
      "has_cycle": false,
      "cycle_paths": [],
      "nodes": ["A", "B", "C", "D"],
      "edges": ["A->B", "A->C", "B->D"],
      "structure": [
        {
          "name": "A",
          "children": [
            { "name": "B", "children": [{ "name": "D", "children": [] }] },
            { "name": "C", "children": [] }
          ]
        }
      ]
    }
  ],
  "invalid_entries": [
    {
      "entry": "hello",
      "reason": "Only uppercase letters are allowed in the format X->Y."
    }
  ],
  "duplicate_edges": ["A->B"],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## How To Run

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open `http://localhost:3000` in your browser.

The frontend will call `http://localhost:3000/bfhl` directly.

## Deployment

Render deployment configuration is included in [render.yaml](/c:/Naveen/Github-Projects/Bajaj-Fin/render.yaml).

Render setup:

1. Push the project to GitHub.
2. Create a new Web Service in Render.
3. Point it at the repository.
4. Render will use:
   `buildCommand: npm install`
   `startCommand: npm start`

The app listens on:

```js
const PORT = process.env.PORT || 3000;
```

## Notes

- CORS and JSON parsing are enabled in the Express app.
- The backend performs validation, duplicate detection, cycle detection, root identification, and hierarchy construction.
- Use `test.http` in VS Code REST Client extensions or copy the request into Postman to test quickly.
- Set real `EMAIL_ID` and `COLLEGE_ROLL_NUMBER` environment variables before final submission.
