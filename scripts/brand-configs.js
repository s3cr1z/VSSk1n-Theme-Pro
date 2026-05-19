/**
 * Brand configurations for the Lynx Brand Themes pack.
 *
 * Each entry maps to two generated files:
 *   src/themes/brands/{slug}/{slug}-dark-theme.json
 *   src/themes/brands/{slug}/{slug}-light-theme.json
 *
 * Color guidance:
 *  - `accent`         primary brand color (replaces the green accent in the Lynx
 *                     base templates and drives the function color in syntax)
 *  - `secondary`      brand's secondary palette anchor (used for a few UI accents
 *                     such as info, peek, and chart hues; not exhaustive)
 *  - `darkBg`         tinted dark background base (workbench surfaces)
 *  - `lightBg`        light background base (workbench surfaces)
 *  - `darkEditorBg`   editor surface in the dark variant
 *  - `lightEditorBg`  editor surface in the light variant
 *
 * Values were chosen from each brand's public design system / brand guidelines.
 */
module.exports = [
  { name: 'GitHub',         slug: 'github',        accent: '#238636', secondary: '#1f6feb', darkBg: '#0d1117', lightBg: '#f6f8fa', darkEditorBg: '#0d1117', lightEditorBg: '#ffffff' },
  { name: 'GitLab',         slug: 'gitlab',        accent: '#fc6d26', secondary: '#6b4fbb', darkBg: '#1a1a2e', lightBg: '#fafafa', darkEditorBg: '#171321', lightEditorBg: '#ffffff' },
  { name: 'Vercel',         slug: 'vercel',        accent: '#0070f3', secondary: '#888888', darkBg: '#000000', lightBg: '#fafafa', darkEditorBg: '#000000', lightEditorBg: '#ffffff' },
  { name: 'Netlify',        slug: 'netlify',       accent: '#00c7b7', secondary: '#014847', darkBg: '#0e1e25', lightBg: '#f0faf9', darkEditorBg: '#0e1e25', lightEditorBg: '#ffffff' },
  { name: 'Cloudflare',     slug: 'cloudflare',    accent: '#f6821f', secondary: '#003682', darkBg: '#1a1a2e', lightBg: '#fff8f0', darkEditorBg: '#0d0d1a', lightEditorBg: '#ffffff' },
  { name: 'Docker',         slug: 'docker',        accent: '#2496ed', secondary: '#003f8c', darkBg: '#0b1929', lightBg: '#f0f7ff', darkEditorBg: '#0b1929', lightEditorBg: '#ffffff' },
  { name: 'Kubernetes',     slug: 'kubernetes',    accent: '#326ce5', secondary: '#ffffff', darkBg: '#0a1628', lightBg: '#f0f4ff', darkEditorBg: '#0a1628', lightEditorBg: '#ffffff' },
  { name: 'AWS',            slug: 'aws',           accent: '#ff9900', secondary: '#232f3e', darkBg: '#161e2d', lightBg: '#faf5eb', darkEditorBg: '#161e2d', lightEditorBg: '#ffffff' },
  { name: 'Google Cloud',   slug: 'gcloud',        accent: '#4285f4', secondary: '#ea4335', darkBg: '#0d1117', lightBg: '#f0f4ff', darkEditorBg: '#0d1117', lightEditorBg: '#ffffff' },
  { name: 'Azure',          slug: 'azure',         accent: '#0078d4', secondary: '#50e6ff', darkBg: '#0a1628', lightBg: '#f0f7ff', darkEditorBg: '#0a1628', lightEditorBg: '#ffffff' },
  { name: 'Firebase',       slug: 'firebase',      accent: '#ffca28', secondary: '#ff8f00', darkBg: '#1a1510', lightBg: '#fffbf0', darkEditorBg: '#1a1510', lightEditorBg: '#ffffff' },
  { name: 'Supabase',       slug: 'supabase',      accent: '#3ecf8e', secondary: '#1c1c1c', darkBg: '#1c1c1c', lightBg: '#f0faf5', darkEditorBg: '#1c1c1c', lightEditorBg: '#ffffff' },
  { name: 'MongoDB',        slug: 'mongodb',       accent: '#00ed64', secondary: '#001e2b', darkBg: '#001e2b', lightBg: '#f0faf5', darkEditorBg: '#001e2b', lightEditorBg: '#ffffff' },
  { name: 'PostgreSQL',     slug: 'postgresql',    accent: '#336791', secondary: '#ffffff', darkBg: '#0d1520', lightBg: '#f0f4f8', darkEditorBg: '#0d1520', lightEditorBg: '#ffffff' },
  { name: 'Redis',          slug: 'redis',         accent: '#dc382d', secondary: '#161f31', darkBg: '#161f31', lightBg: '#fff5f5', darkEditorBg: '#161f31', lightEditorBg: '#ffffff' },
  { name: 'Stripe',         slug: 'stripe',        accent: '#635bff', secondary: '#0a2540', darkBg: '#0a2540', lightBg: '#f6f9fc', darkEditorBg: '#0a2540', lightEditorBg: '#ffffff' },
  { name: 'Twilio',         slug: 'twilio',        accent: '#f22f46', secondary: '#0d122b', darkBg: '#0d122b', lightBg: '#fff5f5', darkEditorBg: '#0d122b', lightEditorBg: '#ffffff' },
  { name: 'Slack',          slug: 'slack',         accent: '#4a154b', secondary: '#36c5f0', darkBg: '#1a0a1a', lightBg: '#f9f0fa', darkEditorBg: '#1a0a1a', lightEditorBg: '#ffffff' },
  { name: 'Discord',        slug: 'discord',       accent: '#5865f2', secondary: '#2c2f33', darkBg: '#2c2f33', lightBg: '#f0f0ff', darkEditorBg: '#1e2124', lightEditorBg: '#ffffff' },
  { name: 'Figma',          slug: 'figma',         accent: '#f24e1e', secondary: '#a259ff', darkBg: '#1e1e1e', lightBg: '#fff5f0', darkEditorBg: '#1e1e1e', lightEditorBg: '#ffffff' },
  { name: 'Notion',         slug: 'notion',        accent: '#000000', secondary: '#2eaadc', darkBg: '#191919', lightBg: '#ffffff', darkEditorBg: '#191919', lightEditorBg: '#ffffff' },
  { name: 'Linear',         slug: 'linear',        accent: '#5e6ad2', secondary: '#191a23', darkBg: '#191a23', lightBg: '#f5f5ff', darkEditorBg: '#191a23', lightEditorBg: '#ffffff' },
  { name: 'Tailwind CSS',   slug: 'tailwindcss',   accent: '#06b6d4', secondary: '#0f172a', darkBg: '#0f172a', lightBg: '#f0fafe', darkEditorBg: '#0f172a', lightEditorBg: '#ffffff' },
  { name: 'Next.js',        slug: 'nextjs',        accent: '#0070f3', secondary: '#000000', darkBg: '#000000', lightBg: '#fafafa', darkEditorBg: '#000000', lightEditorBg: '#ffffff' },
  { name: 'Nuxt',           slug: 'nuxt',          accent: '#00dc82', secondary: '#020420', darkBg: '#020420', lightBg: '#f0faf5', darkEditorBg: '#020420', lightEditorBg: '#ffffff' },
  { name: 'Svelte',         slug: 'svelte',        accent: '#ff3e00', secondary: '#40b3ff', darkBg: '#1a1a1a', lightBg: '#fff5f0', darkEditorBg: '#1a1a1a', lightEditorBg: '#ffffff' },
  { name: 'Vue',            slug: 'vue',           accent: '#42b883', secondary: '#35495e', darkBg: '#1a2332', lightBg: '#f0faf5', darkEditorBg: '#1a2332', lightEditorBg: '#ffffff' },
  { name: 'React',          slug: 'react',         accent: '#61dafb', secondary: '#20232a', darkBg: '#20232a', lightBg: '#f0faff', darkEditorBg: '#20232a', lightEditorBg: '#ffffff' },
  { name: 'Angular',        slug: 'angular',       accent: '#dd0031', secondary: '#c3002f', darkBg: '#1a0a10', lightBg: '#fff0f5', darkEditorBg: '#1a0a10', lightEditorBg: '#ffffff' },
  { name: 'Rust',           slug: 'rust',          accent: '#dea584', secondary: '#000000', darkBg: '#0d0d0d', lightBg: '#faf5f0', darkEditorBg: '#0d0d0d', lightEditorBg: '#ffffff' },
  { name: 'Go',             slug: 'go',            accent: '#00add8', secondary: '#ffffff', darkBg: '#0a1820', lightBg: '#f0faff', darkEditorBg: '#0a1820', lightEditorBg: '#ffffff' },
  { name: 'Python',         slug: 'python',        accent: '#3776ab', secondary: '#ffd43b', darkBg: '#0d1520', lightBg: '#f0f5fa', darkEditorBg: '#0d1520', lightEditorBg: '#ffffff' },
  { name: 'TypeScript',     slug: 'typescript',    accent: '#3178c6', secondary: '#ffffff', darkBg: '#0d1520', lightBg: '#f0f5fa', darkEditorBg: '#0d1520', lightEditorBg: '#ffffff' },
  { name: 'Swift',          slug: 'swift',         accent: '#f05138', secondary: '#ffffff', darkBg: '#1a0d0d', lightBg: '#fff5f0', darkEditorBg: '#1a0d0d', lightEditorBg: '#ffffff' },
  { name: 'Kotlin',         slug: 'kotlin',        accent: '#7f52ff', secondary: '#e44857', darkBg: '#150d28', lightBg: '#f8f0ff', darkEditorBg: '#150d28', lightEditorBg: '#ffffff' },
  { name: 'Deno',           slug: 'deno',          accent: '#70ffaf', secondary: '#12124b', darkBg: '#12124b', lightBg: '#f0fff5', darkEditorBg: '#12124b', lightEditorBg: '#ffffff' },
  { name: 'Bun',            slug: 'bun',           accent: '#fbf0df', secondary: '#f472b6', darkBg: '#1a1510', lightBg: '#fffbf5', darkEditorBg: '#1a1510', lightEditorBg: '#ffffff' },
  { name: 'Astro',          slug: 'astro',         accent: '#bc52ee', secondary: '#17191e', darkBg: '#17191e', lightBg: '#faf0ff', darkEditorBg: '#17191e', lightEditorBg: '#ffffff' },
  { name: 'Remix',          slug: 'remix',         accent: '#e8f2ff', secondary: '#121212', darkBg: '#121212', lightBg: '#f5f8ff', darkEditorBg: '#121212', lightEditorBg: '#ffffff' },
  { name: 'Laravel',        slug: 'laravel',       accent: '#ff2d20', secondary: '#1b1b1f', darkBg: '#1b1b1f', lightBg: '#fff5f5', darkEditorBg: '#1b1b1f', lightEditorBg: '#ffffff' },
  { name: 'Django',         slug: 'django',        accent: '#44b78b', secondary: '#092e20', darkBg: '#092e20', lightBg: '#f0faf5', darkEditorBg: '#092e20', lightEditorBg: '#ffffff' },
  { name: 'Spring',         slug: 'spring',        accent: '#6db33f', secondary: '#ffffff', darkBg: '#0d1a10', lightBg: '#f5faf0', darkEditorBg: '#0d1a10', lightEditorBg: '#ffffff' },
  { name: 'DigitalOcean',   slug: 'digitalocean',  accent: '#0080ff', secondary: '#031b4e', darkBg: '#031b4e', lightBg: '#f0f8ff', darkEditorBg: '#031b4e', lightEditorBg: '#ffffff' },
  { name: 'Heroku',         slug: 'heroku',        accent: '#430098', secondary: '#79589f', darkBg: '#1a0a30', lightBg: '#f8f0ff', darkEditorBg: '#1a0a30', lightEditorBg: '#ffffff' },
  { name: 'npm',            slug: 'npm',           accent: '#cb3837', secondary: '#333333', darkBg: '#1a0d0d', lightBg: '#fff5f5', darkEditorBg: '#1a0d0d', lightEditorBg: '#ffffff' },
  { name: 'Vite',           slug: 'vite',          accent: '#646cff', secondary: '#bd34fe', darkBg: '#1a1a2e', lightBg: '#f5f0ff', darkEditorBg: '#1a1a2e', lightEditorBg: '#ffffff' },
  { name: 'Terraform',      slug: 'terraform',     accent: '#7b42bc', secondary: '#ffffff', darkBg: '#150d28', lightBg: '#f8f0ff', darkEditorBg: '#150d28', lightEditorBg: '#ffffff' },
  { name: 'Datadog',        slug: 'datadog',       accent: '#632ca6', secondary: '#00c2b2', darkBg: '#150d28', lightBg: '#f8f0ff', darkEditorBg: '#150d28', lightEditorBg: '#ffffff' },
  { name: 'Spotify',        slug: 'spotify',       accent: '#1db954', secondary: '#191414', darkBg: '#191414', lightBg: '#f0faf5', darkEditorBg: '#191414', lightEditorBg: '#ffffff' },
  { name: 'Raycast',        slug: 'raycast',       accent: '#ff6363', secondary: '#1a1a2e', darkBg: '#1a1a2e', lightBg: '#fff5f5', darkEditorBg: '#1a1a2e', lightEditorBg: '#ffffff' },
];
