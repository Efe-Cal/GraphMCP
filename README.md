# graphMCP

**graphMCP** is a Model Context Protocol (MCP) server that generates graph images from mathematical expressions (in LaTeX format) or tabular data. It uses [Desmos](https://www.desmos.com/) via Puppeteer to render high-quality graph images, which can be consumed by MCP-compatible clients.

## Features

- Generate graph images from one or more LaTeX mathematical expressions.
- Generate graph images from table data (columns with LaTeX headers and values).
- Customizable graph bounds (left, right, top, bottom).
- Outputs images as base64-encoded PNGs via MCP.

## Requirements

- Node.js (v18+ recommended)
- MCP SDK (`@modelcontextprotocol/sdk`)
- [Puppeteer](https://pptr.dev/)

## Installation

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

## Usage

Run the MCP server:

```bash
node index.js
```

Or, if you want to use it with an AI Client that supports MCP servers, add the following to your client configuration:

```json
{
  "mcpServers": {
    "graphmcp": {
      "command": "npx",
      "args": [
        "graphmcp"
      ]
    }
  }
}
```

The server exposes two MCP tools:

### 1. `equationGraphImage`

Generates a graph image from mathematical expressions.

**Input:**
- `expressions`: Array of LaTeX strings (e.g., `["y=x^2", "y=sin(x)"]`)
- `leftMathBound`, `rightMathBound`, `topMathBound`, `bottomMathBound`: (optional) Graph bounds.

**Output:**
- PNG image (base64-encoded)

### 2. `tableGraphImage`

Generates a graph image from table data.

**Input:**
- `tableData`: Array of columns, each with:
  - `latex`: LaTeX string for the column header (e.g., `"x"`, `"y"`, `"x^2"`)
  - `values`: Array of values (as strings)
- `leftMathBound`, `rightMathBound`, `topMathBound`, `bottomMathBound`: (optional) Graph bounds.

**Output:**
- PNG image (base64-encoded)

## Example

See the `index.js` file for tool registration and input schema details.

## License

MIT License.
