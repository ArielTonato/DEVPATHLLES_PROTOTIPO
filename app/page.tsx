import { getProgramOptions } from "@/lib/catalog";
import { PathBuilder } from "@/app/components/path-builder";

export default function Home() {
  return <PathBuilder programs={getProgramOptions()} />;
}
