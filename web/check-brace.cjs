const fs = require('fs');
const content = fs.readFileSync('src/components/media/HeroSection.tsx', 'utf8');
const lines = content.split('\n');
const jsxStart = lines.findIndex(l => l.includes('return ('));

let depth = 0;
let inString = false;
let inTemplate = false;
let stringChar = '';
let inComment = false;

for (let lineNum = jsxStart; lineNum < lines.length; lineNum++) {
  const line = lines[lineNum];
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i-1] : '';
    const next = i < line.length - 1 ? line[i+1] : '';
    
    // Track comments
    if (!inString && !inTemplate && ch === '/' && next === '/') break;
    
    // Track strings
    if (!inTemplate && !inComment && (ch === '"' || ch === "'") && prev !== '\\') {
      if (!inString) { inString = true; stringChar = ch; }
      else if (ch === stringChar) { inString = false; }
      continue;
    }
    
    // Track template literals
    if (!inString && !inComment && ch === '`' && prev !== '\\') {
      inTemplate = !inTemplate;
      continue;
    }
    
    if (inString || inTemplate || inComment) continue;
    
    // Skip double braces {{ or }}
    if (ch === '{' && next === '{') { i++; continue; }
    if (ch === '}' && next === '}') { i++; continue; }
    
    if (ch === '{') {
      depth++;
    }
    if (ch === '}') {
      depth--;
      if (depth < 0) {
        console.log('Extra } at line', lineNum + 1, ':', line.trim().substring(0, 80));
        depth = 0;
      }
    }
  }
}

console.log('Final depth in JSX:', depth);
if (depth !== 0) {
  console.log('UNBALANCED BRACES!');
}