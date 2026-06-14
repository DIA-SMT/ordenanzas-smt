export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (typeof value === "undefined" || value === "" || value === "PENDIENTE") {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() && value !== "PENDIENTE" ? value : undefined;
}

export function hasEnv(name: string): boolean {
  return Boolean(optionalEnv(name));
}
