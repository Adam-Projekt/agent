import OpenAI from "openai";
import read from "./tools/read.json";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  const response = await client.chat.completions.create({
    model: "anthropic/claude-haiku-4.5",
    messages: [{ role: "user", content: prompt }],
    tools: [read],
  });

  if (!response.choices || response.choices.length === 0) {
    throw new Error("no choices in response");
  }

  console.error("Logs from your program will appear here!");

  const message = response.choices[0].message;
  if (message.tool_calls && message.tool_calls.length > 0) {
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);
    if (functionName === "Read") {
      const content = fs.readFileSync(args.file_path, "utf-8");
      console.log(content);
    }
  } else {
    console.log(message.content);
  }
}

main();
