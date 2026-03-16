import { describe, expect, it } from 'vitest';

import { escapeHtml } from './escapeHtml.ts';

describe('escapeHtml', () => {
  it('escapes html-significant characters', () => {
    expect(escapeHtml(`"><script>alert('xss')</script>`)).toBe(
      '&quot;&gt;&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;',
    );
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Sunny Lager')).toBe('Sunny Lager');
  });
});
