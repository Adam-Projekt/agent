import OpenAI from "openai";
import read from "./tools/read.json";
import fs from "fs";

let tools = [read];

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
  let message = [{ role: "user", content: prompt }];

  console.error("Logs from your program will appear here!");
  while (true) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: message,
      tools: tools,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const responseMessage = response.choices[0].message;

    //append response message to messages
    messages.push({
      role: "assistant",
      content: responseMessage ?? null,
      ...(responseMessage.tool_calls
        ? { tool_calls: responseMessage.tool_calls }
        : {}),
    });

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      if (functionName === "Read") {
        const content = fs.readFileSync(args.file_path, "utf-8");
        message.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: content,
        });
      } // use for diffrent tool_calls
    } else {
      console.log(responseMessage.content);
      break;
    }
  }
}

main();
