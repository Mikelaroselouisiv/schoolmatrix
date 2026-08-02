import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'frontend', 'src');
const pagesOut = path.join(root, 'src', 'renderer', 'pages');

function convert(content, filePath) {
  let c = content;
  c = c.replace(/^"use client";\r?\n\r?\n?/m, '');
  c = c.replace(/^"use client";\r?\n?/m, '');

  c = c.replace(/from\s+["']next\/link["']/g, 'from "react-router-dom"');
  c = c.replace(
    /import\s+\{\s*useRouter\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'import { useNavigate } from "react-router-dom";',
  );
  c = c.replace(
    /import\s+\{\s*useSearchParams\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'import { useSearchParams } from "react-router-dom";',
  );
  c = c.replace(
    /import\s+\{\s*usePathname\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'import { useLocation } from "react-router-dom";',
  );
  c = c.replace(
    /import\s+\{\s*useRouter,\s*useSearchParams\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'import { useNavigate, useSearchParams } from "react-router-dom";',
  );
  c = c.replace(
    /import\s+\{\s*usePathname,\s*useRouter\s*\}\s+from\s+["']next\/navigation["'];?/g,
    'import { useLocation, useNavigate } from "react-router-dom";',
  );

  c = c.replace(/from\s+["']@\/src\/lib\/api["']/g, 'from "@/services/api"');
  c = c.replace(/from\s+["']@\/src\/contexts\/SchoolProfileContext["']/g, 'from "@/context/SchoolProfileContext"');
  c = c.replace(/from\s+["']@\/src\/lib\//g, 'from "@/lib/');
  c = c.replace(/from\s+["']@\/src\/components\//g, 'from "@/components/');

  // Link href -> to
  c = c.replace(/<Link(\s+)href=/g, '<Link$1to=');

  // useRouter patterns
  c = c.replace(/\bconst\s+router\s*=\s*useRouter\(\);?/g, 'const navigate = useNavigate();');
  c = c.replace(/\brouter\.push\(/g, 'navigate(');
  c = c.replace(/\brouter\.replace\(([^)]+)\)/g, 'navigate($1, { replace: true })');
  c = c.replace(/\brouter\.refresh\(\);?/g, '');

  // usePathname
  c = c.replace(/\bconst\s+pathname\s*=\s*usePathname\(\);?/g, 'const { pathname } = useLocation();');

  // useSearchParams: Next returns ReadonlyURLSearchParams; RR returns [URLSearchParams, set]
  if (c.includes('useSearchParams()') && !c.includes('[searchParams')) {
    c = c.replace(
      /\bconst\s+searchParams\s*=\s*useSearchParams\(\);?/g,
      'const [searchParams] = useSearchParams();',
    );
  }

  // next/image -> img
  c = c.replace(/import\s+Image\s+from\s+["']next\/image["'];?\r?\n?/g, '');
  c = c.replace(/<Image\b([^>]*)\/>/g, (m, attrs) => {
    let a = attrs.replace(/\bfill\b/g, '').replace(/\bpriority\b/g, '');
    return `<img${a}/>`;
  });

  // Named export for pages that use default export
  if (/export\s+default\s+function\s+(\w+)/.test(c)) {
    c = c.replace(/export\s+default\s+function\s+(\w+)/, 'export function $1');
  } else if (/export\s+default\s+(\w+)\s*;?\s*$/m.test(c)) {
    // keep
  }

  return c;
}

function pageNameFromDir(rel) {
  // dashboard/students/page.tsx -> StudentsPage
  // dashboard/page.tsx -> DashboardHomePage
  // login/page.tsx -> LoginPage
  const parts = rel.split(/[/\\]/).filter(Boolean);
  if (parts[parts.length - 1] === 'page.tsx') parts.pop();
  if (parts[0] === 'app') parts.shift();
  if (parts.length === 0) return 'HomePage';
  if (parts.join('/') === 'dashboard') return 'DashboardHomePage';
  if (parts.join('/') === 'login') return 'LoginPage';
  if (parts.join('/') === 'signup') return 'SignupPage';
  const leaf = parts[parts.length - 1];
  const name = leaf
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return `${name}Page`;
}

function outFileFromRel(rel) {
  const parts = rel.split(/[/\\]/).filter(Boolean);
  if (parts[0] === 'app') parts.shift();
  if (parts[parts.length - 1] === 'page.tsx') parts.pop();
  if (parts.length === 0) return 'HomePage.tsx';
  if (parts.join('/') === 'dashboard') return 'DashboardHomePage.tsx';
  if (parts.join('/') === 'login') return 'LoginPage.tsx';
  if (parts.join('/') === 'signup') return 'SignupPage.tsx';
  // students/import -> StudentsImportPage
  const name = parts
    .map((p) =>
      p
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(''),
    )
    .join('');
  return `${name}Page.tsx`;
}

function walk(dir, base = dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, base, acc);
    else if (ent.name === 'page.tsx') acc.push(path.relative(base, full));
  }
  return acc;
}

fs.mkdirSync(pagesOut, { recursive: true });

const pages = walk(path.join(srcRoot, 'app'));
const converted = [];

for (const rel of pages) {
  // skip root landing and layout-only
  if (rel === 'page.tsx') continue;
  const abs = path.join(srcRoot, 'app', rel);
  let content = fs.readFileSync(abs, 'utf8');
  content = convert(content, abs);
  const fnName = pageNameFromDir(path.join('app', rel));
  // Ensure export function Name matches filename convention
  content = content.replace(/export function \w+/, `export function ${fnName}`);
  const outName = outFileFromRel(path.join('app', rel));
  const outPath = path.join(pagesOut, outName);
  fs.writeFileSync(outPath, content, 'utf8');
  converted.push(outName);
}

console.log('Converted pages:', converted.length);
converted.forEach((n) => console.log(' -', n));
