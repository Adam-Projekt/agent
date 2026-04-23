import OpenAI from "openai";
import fs from "fs";

import { tools } from "./tools/tools";
import { execSync } from "child_process";

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

    const choice = response.choices[0].message;

    //append response message to messages
    message.push({
      role: "assistant",
      content: choice.content ?? null,
      ...(choice.tool_calls ? { tool_calls: choice.tool_calls } : {}),
    });

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      const toolCall = choice.tool_calls[0];
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      if (functionName === "Read") {
        const content = fs.readFileSync(args.file_path, "utf-8");
        message.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: content,
        });
      } else if (functionName === "Write") {
        const path = args.file_path;
        fs.writeFileSync(path, args.content);
        message.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Successfully wrote file",
        });
      } else if (functionName === "Bash") {
        let output;
        try {
          output =
            execSync(args.command, { encoding: "utf-8" }) ||
            "(command executed successfully with no output)";
          return output;
        } catch (execError: any) {
          output = execError.stderr || execError.message;
        }
        message.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: output,
        });
      }

      // use for diffrent tool_calls
    } else {
      console.log(choice.content);
      break;
    }
  }
}

main();
