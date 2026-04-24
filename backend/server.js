const express = require("express");
const cors = require("cors");
const path = require("path");

const PORT = process.env.PORT || 3000;
const USER_ID = process.env.USER_ID || buildUserId();
const EMAIL_ID = process.env.EMAIL_ID || "your_email@srmist.edu.in";
const COLLEGE_ROLL_NUMBER =
  process.env.COLLEGE_ROLL_NUMBER || "your_roll_number";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/bfhl", (req, res, next) => {
  try {
    console.log("Request received");
    const payload = req.body;

    if (!payload || !Array.isArray(payload.data)) {
      return res.status(400).json({
        error: "Request body must contain a data array.",
      });
    }

    const result = analyzeEdges(payload.data);

    return res.json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL_NUMBER,
      hierarchies: result.hierarchies,
      invalid_entries: result.invalidEntries,
      duplicate_edges: result.duplicateEdges,
      summary: result.summary,
    });
  } catch (error) {
    return next(error);
  }
});

const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

function buildUserId() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  return `naveenp_${dd}${mm}${yyyy}`;
}

function analyzeEdges(rawEntries) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const validEdges = [];
  const seenEdges = new Set();

  for (const entry of rawEntries) {
    const normalized = typeof entry === "string" ? entry.trim() : "";

    if (!normalized) {
      invalidEntries.push({
        entry,
        reason: "Entry must be a non-empty string in the format X->Y.",
      });
      continue;
    }

    const match = normalized.match(/^([A-Z]+)->([A-Z]+)$/);

    if (!match) {
      invalidEntries.push({
        entry: normalized,
        reason: "Only uppercase letters are allowed in the format X->Y.",
      });
      continue;
    }

    const [, from, to] = match;

    if (from === to) {
      invalidEntries.push({
        entry: normalized,
        reason: "Self loops are not allowed.",
      });
      continue;
    }

    const edgeKey = `${from}->${to}`;

    if (seenEdges.has(edgeKey)) {
      duplicateEdges.push(edgeKey);
      continue;
    }

    seenEdges.add(edgeKey);
    validEdges.push({ from, to, key: edgeKey });
  }

  const nodes = new Set();
  const adjacency = new Map();
  const indegree = new Map();
  const undirected = new Map();

  for (const { from, to } of validEdges) {
    nodes.add(from);
    nodes.add(to);

    pushMapArray(adjacency, from, to);
    pushMapArray(undirected, from, to);
    pushMapArray(undirected, to, from);

    if (!indegree.has(from)) {
      indegree.set(from, 0);
    }

    indegree.set(to, (indegree.get(to) || 0) + 1);
  }

  for (const node of nodes) {
    if (!adjacency.has(node)) {
      adjacency.set(node, []);
    }

    if (!undirected.has(node)) {
      undirected.set(node, []);
    }

    if (!indegree.has(node)) {
      indegree.set(node, 0);
    }
  }

  const components = getComponents(nodes, undirected);
  const hierarchies = [];
  let totalCycles = 0;
  let largestTreeRoot = null;
  let largestTreeSize = 0;

  for (const componentNodes of components) {
    const componentSet = new Set(componentNodes);
    const roots = componentNodes.filter((node) => (indegree.get(node) || 0) === 0);
    const cycleInfo = detectCycles(componentNodes, adjacency, componentSet);
    const cycleCount = cycleInfo.cycles.length;
    const isAcyclic = cycleCount === 0;

    totalCycles += cycleCount;

    if (roots.length > 0) {
      const primaryRoot = roots[0];
      const hierarchy = isAcyclic
        ? {
            root: primaryRoot,
            tree: {
              [primaryRoot]: buildTreeObject(primaryRoot, adjacency, new Set()),
            },
            depth: calculateDepthFromRoot(primaryRoot, adjacency),
          }
        : {
            root: primaryRoot,
            tree: {},
            has_cycle: true,
          };

      hierarchies.push(hierarchy);

      if (isAcyclic && componentNodes.length > largestTreeSize) {
        largestTreeSize = componentNodes.length;
        largestTreeRoot = primaryRoot;
      }
    } else {
      hierarchies.push({
        root: componentNodes[0] || null,
        tree: {},
        has_cycle: true,
      });
    }
  }

  hierarchies.sort((left, right) => {
    const leftRoot = left.root || "";
    const rightRoot = right.root || "";
    return leftRoot.localeCompare(rightRoot);
  });

  return {
    hierarchies,
    invalidEntries,
    duplicateEdges,
    summary: {
      total_trees: hierarchies.filter((item) => !item.has_cycle).length,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

function pushMapArray(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }

  map.get(key).push(value);
}

function getComponents(nodes, undirected) {
  const visited = new Set();
  const components = [];

  for (const node of [...nodes].sort()) {
    if (visited.has(node)) {
      continue;
    }

    const queue = [node];
    const component = [];
    visited.add(node);

    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);

      for (const neighbor of undirected.get(current) || []) {
        if (visited.has(neighbor)) {
          continue;
        }

        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component.sort());
  }

  return components;
}

function detectCycles(componentNodes, adjacency, componentSet) {
  const state = new Map();
  const stack = [];
  const cycleKeys = new Set();
  const cycles = [];

  for (const node of componentNodes) {
    if ((state.get(node) || 0) !== 0) {
      continue;
    }

    depthFirstSearch(node);
  }

  return { cycles };

  function depthFirstSearch(node) {
    state.set(node, 1);
    stack.push(node);

    for (const neighbor of adjacency.get(node) || []) {
      if (!componentSet.has(neighbor)) {
        continue;
      }

      const neighborState = state.get(neighbor) || 0;

      if (neighborState === 0) {
        depthFirstSearch(neighbor);
        continue;
      }

      if (neighborState === 1) {
        const cycleStart = stack.lastIndexOf(neighbor);
        const cyclePath = [...stack.slice(cycleStart), neighbor];
        const cycleKey = cyclePath.join("->");

        if (!cycleKeys.has(cycleKey)) {
          cycleKeys.add(cycleKey);
          cycles.push(cyclePath);
        }
      }
    }

    stack.pop();
    state.set(node, 2);
  }
}

function calculateDepthFromRoot(node, adjacency) {
  const children = [...(adjacency.get(node) || [])].sort();

  if (children.length === 0) {
    return 1;
  }

  let maxChildDepth = 0;

  for (const child of children) {
    const childDepth = calculateDepthFromRoot(child, adjacency);
    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }
  }

  return maxChildDepth + 1;
}

function buildTreeObject(node, adjacency, branchVisited) {
  const nextVisited = new Set(branchVisited);
  nextVisited.add(node);

  const subtree = {};
  const children = [...(adjacency.get(node) || [])].sort();

  for (const child of children) {
    if (nextVisited.has(child)) {
      continue;
    }

    subtree[child] = buildTreeObject(child, adjacency, nextVisited);
  }

  return subtree;
}
