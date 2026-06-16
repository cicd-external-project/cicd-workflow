import { metadata } from '@/app/layout';

// RootLayout itself renders the real <html>/<body> document root, which only
// makes sense mounted by Next.js — React Testing Library mounts into a <div>
// inside an existing document, so rendering <html> through it trips React's
// DOM nesting validation. The page-level UI (src/app/page.tsx) is exercised
// with RTL instead; here we verify the one piece of real logic this file
// exports: the static metadata used for the document <head>.
describe('RootLayout metadata', () => {
  it('describes the demo app', () => {
    expect(metadata.title).toBe('FlowCI Demo App');
    expect(metadata.description).toBe(
      'A small example app demonstrating the FlowCI CI/CD pipeline end-to-end.',
    );
  });
});
