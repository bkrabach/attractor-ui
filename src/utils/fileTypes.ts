/**
 * File type detection utility — maps filenames to icon types and syntax
 * highlight languages for the FileTree and FileViewer components.
 */

// ---------------------------------------------------------------------------
// Icon type classification
// ---------------------------------------------------------------------------

export type FileIconType = 'markdown' | 'code' | 'config' | 'text' | 'directory'

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java',
  'c', 'cpp', 'h', 'rb', 'sh', 'bash', 'zsh', 'css', 'html', 'php',
])

const CONFIG_EXTENSIONS = new Set([
  'json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env',
])

/** Classify a filename into an icon type for rendering. */
export function getFileIconType(filename: string): FileIconType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'md' || ext === 'mdx') return 'markdown'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (CONFIG_EXTENSIONS.has(ext)) return 'config'
  return 'text'
}

// ---------------------------------------------------------------------------
// Syntax highlight language mapping
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', rb: 'ruby',
  sh: 'bash', bash: 'bash', zsh: 'bash',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
  css: 'css', html: 'html', md: 'markdown',
}

/** Return the prism-react-renderer language identifier for a filename, or undefined. */
export function getLanguage(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return LANGUAGE_MAP[ext]
}

/** Check if a filename is a markdown file. */
export function isMarkdown(filename: string): boolean {
  return /\.mdx?$/i.test(filename)
}