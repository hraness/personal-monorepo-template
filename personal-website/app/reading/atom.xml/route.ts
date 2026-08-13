import { readingAtomResponse } from "../feed";

export const dynamic = "force-static";

export function GET() {
  return readingAtomResponse();
}
