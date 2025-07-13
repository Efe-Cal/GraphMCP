import puppeteer from 'puppeteer';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

async function getGraphImage(expressions, leftMathBound = -10, rightMathBound = 10, topMathBound = 10, bottomMathBound = -10) {
	
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

	const base64png = await page.evaluate(
		async (expressions, leftMathBound, rightMathBound, topMathBound, bottomMathBound) => {
			const elt = document.getElementById('calculator');
			const calculator = Desmos.GraphingCalculator(elt);
			var image;
			function setImage(img) {
				image = img;
			}
			var opts = {
				mode: "preserveX",
				mathBounds: {
					left: leftMathBound,
					right: rightMathBound,
					top: topMathBound,
					bottom: bottomMathBound,
				},
			};
			expressions.forEach((expr) => {
				calculator.setExpression(expr);
			});
			await calculator.asyncScreenshot(opts, setImage);
			while (!image) {
				await new Promise(resolve => setTimeout(resolve, 100));
			}
			// Remove the data URL prefix before returning
			return image ? image.replace(/^data:image\/png;base64,/, '') : null;
		},
		expressions, leftMathBound, rightMathBound, topMathBound, bottomMathBound
	);


	await browser.close();
	return base64png;
}

const server = new McpServer({
  name: "graphMCP-server",
  version: "1.0.0"
});

const mathExpressionInput = {
  	expressions: z.array(z.string().describe("A mathematical expressions in LaTeX format to be graphed. For example: y=x^2 + x")).describe("An array of mathematical expressions in LaTeX format to be graphed."),
	leftMathBound: z.number().optional().describe("The left boundary of the graph. Defaults to -10."),
	rightMathBound: z.number().optional().describe("The right boundary of the graph. Defaults to 10."),
	topMathBound: z.number().optional().describe("The top boundary of the graph. Defaults to 10."),
	bottomMathBound: z.number().optional().describe("The bottom boundary of the graph. Defaults to -10."),
};

server.registerTool("equationGraphImage",{
	title: "Generate Equation Graph Image",
  	description: "Generates a graph image from mathematical expressions in LaTeX format.",
  	inputSchema: mathExpressionInput,
}, async ({expressions, leftMathBound,rightMathBound,topMathBound,bottomMathBound}) => {
	var new_expressions = expressions.map((expression, index) => {
		return { id: `graph${index + 1}`, latex: expression };
	});
	const base64png = await getGraphImage(new_expressions, leftMathBound, rightMathBound, topMathBound, bottomMathBound);

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

const tableInput = {
	tableData: z.array(z.object({
		latex: z.string().describe("A mathematical expression in LaTeX format for the column. For example: x, y, x^2"),
		values:z.array(z.string().describe("A numerical value")).optional().describe("The values of the column. If the value of the column will be computed from another column, this can be left empty. For example the values of the x column are provided and this column has the latex expression x^2, then the values of this column will be computed from the x column values.")})
		.describe("An object representing a column of table data, contains a LaTeX expression and an array of values for that expression."),
	).describe("An array of objects representing columns of table data, each containing a LaTeX expression and an array of values. For example: [{ latex_expression: 'x', values: ['1', '2', '3'] }, { latex_expression: 'y', values: ['4', '5', '6'] }]"),
	
	leftMathBound: z.number().optional().describe("The left boundary of the graph. Defaults to -10."),
	rightMathBound: z.number().optional().describe("The right boundary of the graph. Defaults to 10."),
	topMathBound: z.number().optional().describe("The top boundary of the graph. Defaults to 10."),
	bottomMathBound: z.number().optional().describe("The bottom boundary of the graph. Defaults to -10."),
};

server.registerTool("tableGraphImage", {
	title: "Generate Table Graph Image",
  	description: "Generates a graph image from a table of data.",
  	inputSchema: tableInput,
}, async ({tableData, leftMathBound, rightMathBound, topMathBound, bottomMathBound}) => {
	const expression = {
		type: "table",
		columns:tableData.map((col, index) => {
			return {
				latex: col.latex,
				values: col.values ? col.values.map(value => parseFloat(value)) : [],
				lines:true
			};
		})
	}
	const base64png = await getGraphImage([expression], leftMathBound, rightMathBound, topMathBound, bottomMathBound);
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