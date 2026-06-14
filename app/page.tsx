import Shell from "@/components/Shell";
import data from "@/data/base_madre.json";
import type { Concepto } from "@/lib/blocks";

export default function Home() {
  return <Shell conceptos={data as Concepto[]} />;
}
