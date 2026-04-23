import OpenAI from "openai";
import fs from "fs";

import { tools } from "./tools/tools";
import { bash } from "./tools/bash";

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
  let message: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "user", content: prompt },
  ];

  console.error("Logs from your program will appear here!");
  let active = true;
  while (active) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: message as any,
      tools: tools as any,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const choice = response.choices[0].message;

    //append response message to messages
    message.push({
      role: "assistant",
      content: choice.content ?? null,
      ...(choice.tool_calls ? { tool_calls: choice.tool_calls } : {}),
    });

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const functionName: string = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      const result = executeToolCall(functionName, args, choice);
      if (result == undefined) {
        console.log(choice.content);
        active = false;
        break;
      }
      message.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result, //actual execution
      });
    } else {
      console.log(choice.content);
      break;
    }
    console.log(message);
    console.log("TOOLS!!!!" + tools);
  }
}
function executeToolCall(
  functionName: string,
  args,
  choice,
): string | undefined {
  switch (functionName.toLowerCase()) {
    case "read":
      return fs.readFileSync(args.file_path, "utf-8");
      break;
    case "bash":
      return bash(args.command);
    default:
      console.log(choice.content);
      return undefined;
      break;
  }
}
main();
