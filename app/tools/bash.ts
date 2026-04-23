import { execSync } from "child_process";

export function bash(command: string) {
  let output;
  try {
    output =
      execSync(command, { encoding: "utf-8" }) ||
      "(command executed successfully with no output)";
  } catch (execError: any) {
    output = execError.stderr || execError.message;
  }
  return output;
}
