import puppeteer from 'puppeteer';
import fs from 'fs';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function getGraphImage(expressions){
	
	expressions = expressions.map((expression, index) => {
		return { id: `graph${index + 1}`, latex: expression };
	});
	
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	await page.setContent(`
    <html>
      <body style="margin: 0; padding: 0; overflow: hidden;">
        <div id="calculator"></div>
        <script>
          window.calculatorReady = false;
        </script>
      </body>
    </html>
  `);

	await page.addScriptTag({ url: 'https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6' });

	const base64png = await page.evaluate(async () => {
		const elt = document.getElementById('calculator');
		const calculator = Desmos.GraphingCalculator(elt);
		var image;
		function setImage(img) {
			image = img;
		}
		var opts = {
			mode: "preserveX",
			mathBounds: { left: -10, right: 10 },
		};
		for(const expression of expressions) {
			calculator.setExpression(expression);
		}
		await calculator.asyncScreenshot(opts,setImage);
		while (!image) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		// Remove the data URL prefix before returning
		return image ? image.replace(/^data:image\/png;base64,/, '') : null;
	});

	if (base64png) {
		let r = (Math.random() + 1).toString(36).substring(7);
		let filename = `graph${r}.png`
		fs.writeFileSync( filename, base64png, 'base64');
	} else {
	}

	await browser.close();
	return filename;
}

const server = new McpServer({
  name: "graphMCP-server",
  version: "1.0.0"
});

const inputSchema = z.object({
  expressions: z.array(z.string().describe("A mathematical expressions in LaTeX format to be graphed. For example: y=x^2 + x"))
});

server.registerTool("getGraphImage",{
	title: "Generate Graph Image",
  	description: "Generates a graph image from mathematical expressions in LaTeX format.",
  	inputSchema: inputSchema,
}, async (input) => {
	const expressions = input.expressions;
	if (!expressions || !Array.isArray(expressions) || expressions.length === 0) {
		throw new Error("Invalid input: 'expressions' must be a non-empty array of strings.");
	}

	const filename = await getGraphImage(expressions);
	base64png = fs.readFileSync(filename, 'base64');
	if (!base64png) {
		throw new Error("Failed to read the generated image file.");
	}
	return {
		content:[
			{
				type:"image",
				data: base64png,
				mimeType: "image/png",
			}
		]
	}
});

const transport = new StdioServerTransport();
await server.connect(transport);