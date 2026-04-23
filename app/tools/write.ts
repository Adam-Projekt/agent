import fs from "fs";

export function write(args) {
  const path = args.file_path;
  fs.writeFileSync(path, args.content);
  return "Successfully wrote file";
}
