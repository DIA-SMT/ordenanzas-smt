import { readFileSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import pg from "pg";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of readFileSync(path.join(root,".env.local"),"utf-8").split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);if(m&&!(m[1]in process.env))process.env[m[1]]=m[2];}
const OR=process.env.OPENROUTER_API_KEY, BASE=process.env.OPENROUTER_BASE_URL;
async function embed(t){const r=await fetch(`${BASE}/embeddings`,{method:"POST",headers:{Authorization:`Bearer ${OR}`,"Content-Type":"application/json"},body:JSON.stringify({model:"openai/text-embedding-3-small",input:t})});return (await r.json()).data[0].embedding;}
const q="¿Cuánto paga un taxi o remis por su licencia y canon?";
const emb=await embed(q);
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});await c.connect();
const {rows}=await c.query("select * from match_normativa_chunks($1::vector,5,null,null,null,null)",[`[${emb.join(",")}]`]);
console.log("Q:",q,"\n--- top matches ---");
for(const r of rows){console.log(`(${(r.score*100).toFixed(1)}%) ${r.metadata.articulo} · pág ${r.metadata.pagina}: ${r.contenido.split("\n")[1].slice(0,90)}`);}
await c.end();
// test chat
const ctx=rows.map((r,i)=>`[${i+1} | ${r.metadata.articulo} pág.${r.metadata.pagina}]\n${r.contenido}`).join("\n\n");
const chat=await fetch(`${BASE}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${OR}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENROUTER_CHAT_MODEL,messages:[{role:"system",content:"Respondé en español citando artículo y página, solo con el contexto."},{role:"user",content:`CONTEXTO:\n${ctx}\n\nPREGUNTA: ${q}`}]})});
const j=await chat.json();
console.log("\n--- RESPUESTA LLM ---\n"+(j.choices?.[0]?.message?.content ?? JSON.stringify(j).slice(0,300)));
