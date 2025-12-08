import { Check, Copy } from 'lucide-react';
import { type ComponentProps, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vs,
  vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';

type SyntaxHighlighterProps = ComponentProps<typeof SyntaxHighlighter>;
type PropsWithoutKeys<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};
export type CodeBlockProps = {
  /** 表示するコード */
  code: string;
  /** シンタックスハイライト対象の言語 */
  language: string;
  /** (任意) コードブロック上部に表示するファイル名 */
  fileName?: string;
} & PropsWithoutKeys<SyntaxHighlighterProps, 'children'>;

export const CodeBlock = ({
  code,
  language,
  fileName,
  style,
  customStyle,
  codeTagProps,
  ...props
}: CodeBlockProps) => {
  const { theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  if (!mounted) {
    return null;
  }

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return (
    <div className="relative w-full text-sm border rounded-lg bg-zinc-100 dark:bg-zinc-900">
      {fileName && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <p className="text-xs text-zinc-800 dark:text-zinc-200">{fileName}</p>
        </div>
      )}
      <div className="relative group">
        <SyntaxHighlighter
          language={language}
          style={style ?? (resolvedTheme === 'dark' ? vscDarkPlus : vs)}
          customStyle={{
            padding: '16px',
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.5',
            borderRadius: 'var(--radius)',
            ...customStyle,
          }}
          codeTagProps={{
            className: 'font-mono',
            ...codeTagProps,
          }}
          {...props}
        >
          {code.trim()}
        </SyntaxHighlighter>

        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {isCopied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} className="text-zinc-400" />
          )}
        </Button>
      </div>
    </div>
  );
};
