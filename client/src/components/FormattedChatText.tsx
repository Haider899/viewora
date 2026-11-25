import React from 'react';

interface FormattedChatTextProps {
  text: string;
  isUser?: boolean;
}

/**
 * Clean, lightweight inline markdown renderer for Support Chat messages.
 * Renders **bold**, *italic*, and `code` cleanly without exposing raw asterisks,
 * and sanitizes any legacy brand names to "U-Ads".
 */
export const FormattedChatText: React.FC<FormattedChatTextProps> = ({ text, isUser = false }) => {
  const sanitized = (text || '')
    .replace(/VistaraX/gi, 'U-Ads')
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/gmu, '');

  const lines = sanitized.split('\n');

  const renderInline = (line: string, lineIdx: number) => {
    // Tokenize **bold**, `code`, and *italic*
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    const parts = line.split(regex);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={`${lineIdx}-${idx}`} className={isUser ? 'font-bold text-white' : 'font-bold text-slate-900'}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={`${lineIdx}-${idx}`}
            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
              isUser ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200'
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={`${lineIdx}-${idx}`} className="italic opacity-90">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={`${lineIdx}-${idx}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        const isBullet = trimmed.startsWith('• ') || trimmed.startsWith('- ');
        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isUser ? 'bg-emerald-200' : 'bg-emerald-600'}`} />
              <span className="flex-1">{renderInline(trimmed.slice(2), i)}</span>
            </div>
          );
        }
        return <div key={i}>{renderInline(line, i)}</div>;
      })}
    </div>
  );
};
