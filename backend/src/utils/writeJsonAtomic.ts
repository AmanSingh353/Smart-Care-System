/** Windows-safe replace: rename often fails with EPERM when dest exists. */
import fs from "fs/promises";

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, payload, "utf8");
  try {
    await fs.rename(tmp, filePath);
  } catch {
    await fs.writeFile(filePath, payload, "utf8");
    await fs.unlink(tmp).catch(() => undefined);
  }
}
